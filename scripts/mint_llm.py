#!/usr/bin/env python3
"""
mint_llm.py — write one talk-radio hour with a local LLM and queue it.

The station on excavationpro.ca plays whatever is in live/queue.json (served by
jsDelivr from this repo and, once deployed, from the site itself). The template
synth in the browser is the fallback when the queue runs dry; this script is the
good writer.

    python scripts/mint_llm.py                 # mint one hour, append to the queue
    python scripts/mint_llm.py --count 2       # mint two
    python scripts/mint_llm.py --dry           # write nothing, print the script

Engine: any OpenAI-compatible chat endpoint. Default is a local llama-server
holding the studio model:

    llama-server.exe -m MiMo-V2.6-Distill-Qwen-9B-Q4_K_M.gguf \
        --port 8089 -c 8192 -ngl 99 --no-webui --jinja

Nothing here invents facts: every "receipt" is a sentence lifted from the story
page, and the writer is told to use only those.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LIVE = ROOT / "live"
QUEUE = LIVE / "queue.json"
HEARD = LIVE / "heard.json"

LLM_URL = "http://127.0.0.1:8089/v1/chat/completions"
WITNESS = "https://chatagent.ca/witness/news-monitor.json"
HN = "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=16"
WPM = 150
GAP_MS = 650

UA = {"user-agent": "Mozilla/5.0 (compatible; LYGO-Talk-Radio/2.0)"}

# ---------------------------------------------------------------- speakers
SPEAKERS = {
    "devon": dict(id="devon", name="Devon Cross", role="host-1", title="Lead Anchor", avatar="DC",
                  voicePitch=1.0, voiceRate=1.02, voiceGender="male",
                  personality="Dry humour, twenty years in production infrastructure, hates hype, loves raw sockets."),
    "maya": dict(id="maya", name="Dr. Maya Lin", role="host-2", title="Co-Host", avatar="ML",
                 voicePitch=1.15, voiceRate=1.0, voiceGender="female",
                 personality="Precise, quick-witted, asks for the evidence and calls Devon on his nostalgia."),
    "zack": dict(id="zack", name='"ZeroDay" Zack', role="host-1", title="Lead Anchor", avatar="ZZ",
                 voicePitch=0.97, voiceRate=1.04, voiceGender="male",
                 personality="Underground cybervet, terminal metaphors, allergic to vendor slides."),
    "aris": dict(id="aris", name="Dr. Aris Thorne", role="host-2", title="Co-Host", avatar="AT",
                 voicePitch=1.05, voiceRate=0.95, voiceGender="female",
                 personality="Mathematical, methodical, questions every benchmark."),
    "casey": dict(id="casey", name="Casey Rivera", role="host-1", title="Lead Anchor", avatar="CR",
                  voicePitch=1.02, voiceRate=1.03, voiceGender="male",
                  personality="Fast-talking morning host, tracks developer chatter like a ticker."),
    "victoria": dict(id="victoria", name="Victoria Sterling", role="host-1", title="Lead Anchor", avatar="VS",
                     voicePitch=1.1, voiceRate=1.0, voiceGender="female",
                     personality="Sharp, dissects capital and compute economics without flattering anyone."),
}

STATIONS = [
    dict(id="station-algorithmic-wire", name="The Algorithmic Wire", hosts=("devon", "maya"),
         kinds=("world", "policy", "health", "climate", "science", "humanitarian")),
    dict(id="station-kernel-panic", name="Kernel Panic Radio", hosts=("zack", "aris"),
         kinds=("security", "infrastructure", "outage", "energy")),
    dict(id="station-hn-live", name="Hacker News Live", hosts=("casey", "devon"),
         kinds=("tech", "software", "ai", "research")),
    dict(id="station-sv-confidential", name="Silicon Valley Confidential", hosts=("victoria", "devon"),
         kinds=("money", "business", "markets", "compute")),
]

BEATS_A = [
    ("cold_open", "host1", "Open the hour: station, both hosts, the subject in plain words, and the one question this desk will argue. Do not mention the caller yet and never say the phrase a story titled."),
    ("first_take", "host2", "The strongest honest reading of the story. What is actually being claimed, said plainly."),
    ("the_push", "host1", "Push back on that reading. Ask for the mechanism: how would this work, for whom, on what evidence."),
    ("scene", "host2", "The concrete scene: one place, one person, one ordinary moment from the receipts. No generalities."),
    ("page_one", "host1", "Read receipt 1 nearly verbatim, then say exactly what it proves and what it does not."),
    ("what_it_means", "host2", "What changes for the people inside the story if this is true. Consequences, not vibes."),
    ("what_it_does_not_prove", "host1", "The limit: what a careful listener must not conclude. Be specific to this story."),
    ("who_stays", "host2", "Name the person who has to live with the outcome after the cameras leave."),
    ("what_i_would_ship", "host1", "One narrow, practical thing that would help, small enough to start tomorrow."),
]

BEATS_B = [
    ("the_hole", "host2", "The flaw in that practical thing. Where it breaks, or who it leaves out."),
    ("caller_intro", "host1", "Open the phone line to the caller by name and place, and ask what they can personally confirm."),
    ("caller", "caller", "The caller speaks: one lived detail, one thing they could verify, in plain speech. No slogans."),
    ("caller_hold", "host2", "Take the caller's detail seriously and say what it changes about the hour so far."),
    ("the_unasked", "host1", "The question nobody has asked yet. Ask it in one sentence, then explain why it matters."),
    ("the_test", "host2", "A test the listener can run themselves to check whether the story is being handled honestly."),
    ("ruling", "host1", "The desk's narrow ruling: what to keep, what not to promote. One sentence a person could repeat."),
    ("handoff", "host2", "What the listener should do next, in one concrete action. No homework, no lecture."),
    ("signoff", "host1", "Close the hour: hosts, station, the subject, and that the next hour starts when the clock turns. Invent no times or schedules."),
]

FORBIDDEN = [
    r"as an ai", r"that is the live line", r"bring it back to the bill",
    r"https?://", r"\bRESOURCE\b", r"\bCANON\b", r"Δ9", 
    r"in today'?s (world|fast-paced)", r"it'?s important to note",
]
# Upper-case-only markers (protocol notes that must never reach the air).
FORBIDDEN_UPPER = [r"\bRESOURCE\b", r"\bCANON\b"]


# ---------------------------------------------------------------- helpers
def get_json(url: str, timeout: int = 25):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def get_text(url: str, timeout: int = 25) -> str:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        ctype = r.headers.get("content-type", "")
        if ctype and not re.search(r"html|xml|text/plain", ctype, re.I):
            return ""
        return r.read().decode("utf-8", "replace")


def strip_html(html: str) -> str:
    html = re.sub(r"(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>", " ", html)
    html = re.sub(r"(?is)<br\s*/?>", ". ", html)
    html = re.sub(r"(?is)</p>", ". ", html)
    text = re.sub(r"(?s)<[^>]+>", " ", html)
    text = (text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&#39;", "'")
                .replace("&quot;", '"').replace("&mdash;", "—").replace("&ndash;", "–"))
    return re.sub(r"\s+", " ", text).strip()


def sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [p.strip() for p in parts if 40 <= len(p.strip()) <= 420]


def classify(title: str, source: str) -> str:
    t = f"{title} {source}".lower()
    rules = [
        ("money", r"\b(stock|market|fund|venture|invest|billion|million|revenue|ipo|earnings|price|tariff|trade)\b"),
        ("security", r"\b(hack|breach|ransom|malware|vulnerab|exploit|cve|phish|botnet|cyber|security|incident|password|leak)\b"),
        ("infrastructure", r"\b(outage|grid|power|network|datacent|server|cloud|shutdown|strike|blackout)\b"),
        ("tech", r"\b(ai|model|chip|gpu|software|open source|startup|robot|algorithm|app)\b"),
        ("health", r"\b(health|ebola|virus|disease|who|hospital|vaccine|malaria|cholera)\b"),
        ("climate", r"\b(climate|flood|drought|heat|storm|sea level|wildfire|emissions)\b"),
        ("humanitarian", r"\b(aid|refugee|famine|hunger|displaced|unrwa|relief|shelter)\b"),
        ("policy", r"\b(court|law|ban|ruling|government|minister|sanction|treaty|parliament)\b"),
        ("science", r"\b(study|research|scientists|discovery|physics|space|nasa)\b"),
    ]
    for kind, pattern in rules:
        if re.search(pattern, t):
            return kind
    return "world"


def station_for(kind: str, last_station: str | None) -> dict:
    """Right desk for the story. Rotate only between desks that fit the story."""
    fits = [s for s in STATIONS if kind in s["kinds"]]
    if not fits:
        fits = [s for s in STATIONS if "world" in s["kinds"]] or STATIONS
    if last_station and len(fits) > 1 and fits[0]["id"] == last_station:
        return fits[1]
    return fits[0]


def receipts_from(title: str, url: str) -> list[dict]:
    out: list[dict] = []
    if url.startswith("https://"):
        try:
            html = get_text(url)
            text = strip_html(html)
            keys = [w for w in re.findall(r"[A-Za-z']{5,}", title.lower()) if w not in
                    {"about", "after", "their", "there", "which", "could", "would", "still", "these"}]
            scored = []
            for s in sentences(text):
                low = s.lower()
                score = sum(2 for k in keys if k in low)
                score += 2 if re.search(r"\d", s) else 0
                score += 1 if re.search(r"\b(said|says|according|reported|percent|million|billion)\b", low) else 0
                if score:
                    scored.append((score, s))
            scored.sort(key=lambda x: -x[0])
            seen = set()
            for _, s in scored:
                key = s[:60].lower()
                if key in seen:
                    continue
                seen.add(key)
                out.append({"text": s[:340], "url": url})
                if len(out) >= 4:
                    break
        except Exception:  # noqa: BLE001
            pass
    if not out:
        out.append({"text": title, "url": url})
    return out


def call_llm(system: str, user: str, max_tokens: int = 2200, temperature: float = 0.85) -> str:
    body = json.dumps({
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        "temperature": 0.75,
        "top_p": 0.95,
        "max_tokens": max_tokens,
        "stop": ["\n\n---", "</function_call>"],
        "stream": False,
    }).encode()
    req = urllib.request.Request(LLM_URL, data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=600) as r:
        data = json.loads(r.read().decode("utf-8", "replace"))
    return data["choices"][0]["message"]["content"]


def parse_blocks(raw: str) -> list[dict]:
    """Read the ### BEAT | who / text format. Far more robust than JSON for a 9B."""
    out: list[dict] = []
    for chunk in re.split(r"(?m)^\s*#{2,4}\s*", raw):
        chunk = chunk.strip()
        if not chunk:
            continue
        head, _, body = chunk.partition("\n")
        bits = [b.strip() for b in head.split("|")]
        beat = bits[0].strip().lower().replace(" ", "_").replace("-", "_")
        who = bits[1].strip().lower() if len(bits) > 1 else "host1"
        text = re.sub(r"\s+", " ", body).strip().strip('"').strip()
        if beat and text and not beat.startswith("```"):
            out.append({"beat": beat, "who": who, "text": text})
    return out


def parse_json_block(text: str) -> dict:
    text = re.sub(r"</?function_call>", "", text).strip()
    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        raise ValueError("no JSON object in the reply")
    return json.loads(text[start:end + 1])


def words(s: str) -> int:
    return len(re.findall(r"\b[\w'-]+\b", s))


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9 ]+", " ", s.lower()).strip()


def validate(script: dict, receipts: list[dict]) -> list[str]:
    problems: list[str] = []
    lines = script.get("lines") or []
    if len(lines) < 16:
        problems.append(f"only {len(lines)} lines")
    seen = set()
    for i, ln in enumerate(lines):
        text = (ln.get("text") or "").strip()
        w = words(text)
        if w < 14:
            problems.append(f"line {i} too short ({w} words)")
        if w > 90:
            problems.append(f"line {i} too long ({w} words)")
        key = norm(text)
        if key in seen:
            problems.append(f"line {i} repeats an earlier line")
        seen.add(key)
        for pat in FORBIDDEN:
            if pat in ("\\bRESOURCE\\b", "\\bCANON\\b"):
                if re.search(pat, text):          # upper case only: protocol markers
                    problems.append(f"line {i} contains a protocol marker")
                continue
            if re.search(pat, text, re.I):
                problems.append(f"line {i} contains forbidden {pat!r}")
    joined = " ".join((ln.get("text") or "") for ln in lines)
    if receipts and not quote_survives(receipts[0]["text"], joined):
        problems.append("receipt 1 is never quoted on air")
    title = (script.get("title") or "").strip()
    if not (3 <= words(title) <= 11) or len(title) > 70:
        problems.append(f"title is weak: {title!r}")
    return problems


def quote_survives(receipt: str, script_text: str) -> bool:
    """True when a recognisable run of the receipt's words is spoken on air."""
    a, b = norm(receipt), norm(script_text)
    if not a or not b:
        return False
    for n in range(72, 23, -6):
        for i in range(0, max(1, len(a) - n), 4):
            if a[i:i + n] in b:
                return True
    # a short receipt: check its distinctive words
    rare = [w for w in a.split() if len(w) > 5]
    if not rare:
        return False
    hits = sum(1 for w in rare if w in b)
    return hits / len(rare) >= 0.6


SYSTEM = (
    "You write spoken dialogue for a two-host public radio desk. You are the writer, not a chatbot.\n"
    "Rules that are never broken:\n"
    "- Use only the facts and receipts given. Never invent a number, a name, a date, a quote or an event.\n"
    "- If a fact is missing, the host says so plainly. That is allowed and it is good radio.\n"
    "- Plain spoken English a person can follow once, at 150 words a minute. No lists, no headings, no stage directions.\n"
    "- Each line is 35 to 55 words, two or three sentences. Vary sentence length. Never exceed 70 words.\n"
    "- No two lines start the same way. No repeated sentence. No slogan, no catchphrase, no sign-off formula reused.\n"
    "- Hosts keep their characters and genuinely disagree sometimes. No flattery, no filler, no 'as an AI'.\n"
    "- This is live radio. There is no comments section, no upvotes, no links, and you never invent a time, a schedule, a product name or an office that is not in the receipts.\n"
    "- The headline is a label, not a sentence to read out loud. Refer to the subject in ordinary words.\n"
    "- Output format: a block per beat, starting with ### BEAT_NAME | host1 or host2 or caller, then the spoken line on the next line. No commentary, no summary, no markdown other than those ### labels."
)


def write_hour(topic: str, station: dict, receipts: list[dict], caller: dict,
               title_hint: str, repair: str = "") -> dict:
    h1 = SPEAKERS[station["hosts"][0]]
    h2 = SPEAKERS[station["hosts"][1]]
    receipt_block = "\n".join(f"R{i+1}. \"{r['text']}\"" for i, r in enumerate(receipts))

    cast = (
        f"Station: {station['name']}.\n"
        f"Host 1 (host1) = {h1['name']}: {h1['personality']}\n"
        f"Host 2 (host2) = {h2['name']}: {h2['personality']}\n"
        f"Caller = {caller['name']}, calling from {caller['location']}. They live with this story, they are not an expert.\n"
    )

    all_beats = BEATS_A + BEATS_B
    beat_block = "\n".join(f"- {tag.upper()} ({who}): {brief}" for tag, who, brief in all_beats)
    user = (
        f"{cast}\nStory headline: {topic}\nSource headline for the title: {title_hint}\n\n"
        f"Receipts from the story page (the only facts you may use):\n{receipt_block}\n\n"
        f"Write all {len(all_beats)} beats below, in this order:\n{beat_block}\n"
        + (f"\nA previous attempt failed these checks — fix them: {repair}\n" if repair else "")
        + "\nThen two more blocks:\n- TITLE (no speaker): 4 to 9 words, an angle on the story, not a copy of the headline\n"
          "- DESCRIPTION (no speaker): one sentence, 20 to 35 words, what a listener will learn\n\n"
        + "Format: each block starts with ### , then the beat name, then | , then the speaker "
          "(host1, host2 or caller; the TITLE and DESCRIPTION blocks have no speaker). The next line is the spoken text.\n"
          "Example:\n### COLD_OPEN | host1\nThis is the first spoken line, in plain English.\n\n"
          "### TITLE\nThe Lake Is Their Life\n\n### DESCRIPTION\nA community on Lake Nkondo explains what the water is for.\n"
    )
    raw = call_llm(SYSTEM, user, max_tokens=3000)
    blocks = parse_blocks(raw)
    title = next((b["text"] for b in blocks if b["beat"] == "title"), "")
    desc = next((b["text"] for b in blocks if b["beat"] == "description"), "")
    lines = [b for b in blocks if b["beat"] not in ("title", "description")]
    return {"title": title, "description": desc, "lines": lines}


def assemble(topic: str, station: dict, receipts: list[dict], caller: dict, script: dict,
             source_name: str, source_url: str) -> dict:
    h1 = SPEAKERS[station["hosts"][0]]
    h2 = SPEAKERS[station["hosts"][1]]
    caller_id = f"caller-{int(time.time())}"
    cursor = 0
    segments = []
    for i, ln in enumerate(script["lines"]):
        who = (ln.get("who") or "host1").lower()
        text = re.sub(r"\s+", " ", (ln.get("text") or "")).strip()
        if not text:
            continue
        if who == "caller":
            speaker_id, speaker_name = caller_id, f"{caller['name']} ({caller['location']})"
        elif who == "host2":
            speaker_id, speaker_name = h2["id"], h2["name"]
        else:
            speaker_id, speaker_name = h1["id"], h1["name"]
        dur = round(words(text) / WPM * 60000) + 900
        segments.append({
            "id": f"seg-llm-{int(time.time())}-{i+1}",
            "speakerId": speaker_id,
            "speakerName": speaker_name,
            "text": text,
            "timestampMs": cursor,
            "durationMs": dur,
            "emotion": "neutral",
            "topicTag": ln.get("beat") or "",
        })
        cursor += dur + GAP_MS

    total = segments[-1]["timestampMs"] + segments[-1]["durationMs"] if segments else 0
    caller_line = next((s["text"] for s in segments if s["speakerId"] == caller_id), "")
    return {
        "id": f"show-live-llm-{int(time.time())}",
        "stationId": station["id"],
        "topic": topic,
        "title": script["title"].strip(),
        "episodeNumber": 1000 + int(time.time()) % 900,
        "description": re.sub(r"\s+", " ", script.get("description") or "").strip()[:400],
        "durationMs": total,
        "hosts": [
            {**h1, "role": "host-1", "title": "Lead Anchor", "avatar": "H1"},
            {**h2, "role": "host-2", "title": "Co-Host", "avatar": "H2"},
        ],
        "segments": segments,
        "showNotes": [
            f"Source ({source_name}): {source_url}",
            *[f"Receipt {i+1}: {r['text'][:220]}" for i, r in enumerate(receipts[:4])],
            "Written on the desk with the studio model. Only the receipts above were treated as fact.",
        ],
        "keyTakeaways": [
            f"The story: {topic}",
            f"Desk: {station['name']} — {h1['name']} and {h2['name']}.",
            "What the page proved, and what it did not.",
        ],
        "references": [{"title": source_name, "url": source_url, "type": "news"}],
        "callers": [{
            "id": caller_id,
            "name": caller["name"],
            "location": caller["location"],
            "topic": topic,
            "take": caller_line[:400],
            "status": "on-air",
            "avatar": "C1",
        }],
        "ungated": station["id"] == "station-kernel-panic",
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }


CALLERS = [
    ("Jordan", "Toronto, Canada"), ("Priya", "Leeds, England"), ("Mateo", "Valencia, Spain"),
    ("Nadia", "Cairo, Egypt"), ("Sam", "Winnipeg, Canada"), ("Ruth", "Nairobi, Kenya"),
    ("Ellis", "Glasgow, Scotland"), ("Wen", "Vancouver, Canada"),
]


def gather_topics() -> list[dict]:
    """World feed first, then the strongest tech items. No meta posts, no formula noise."""
    world: list[dict] = []
    try:
        data = get_json(WITNESS)
        for lane in ("world", "severe"):
            for row in data.get(lane) or []:
                title = (row.get("title") or "").strip()
                url = (row.get("url") or "").strip()
                src = row.get("source") or lane
                if not title or not url.startswith("https://"):
                    continue
                if len(title) < 30 or title.lower().startswith(("green earthquake", "green forest fire",
                                                               "green cyclone", "orange earthquake")):
                    continue
                world.append({"title": title, "url": url, "source": src, "lane": lane})
    except Exception as e:  # noqa: BLE001
        print("witness feed failed:", e)

    tech: list[dict] = []
    try:
        data = get_json(HN)
        for hit in data.get("hits", []):
            title = (hit.get("title") or "").strip()
            points = hit.get("points") or 0
            url = hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID')}"
            if not title or points < 120:
                continue
            if re.match(r"^(tell|show|ask|launch)\s+hn\b", title, re.I):
                continue
            if len(title.split()) < 5:
                continue
            tech.append({"title": title, "url": url, "source": "Hacker News", "lane": "tech"})
    except Exception as e:  # noqa: BLE001
        print("hn feed failed:", e)

    merged = world[:24] + tech[:10]
    seen, deck = set(), []
    for row in merged:
        if row["title"] in seen:
            continue
        seen.add(row["title"])
        deck.append(row)
    return deck


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=1)
    ap.add_argument("--dry", action="store_true")
    args = ap.parse_args()

    queue = json.loads(QUEUE.read_text(encoding="utf-8")) if QUEUE.exists() else {"mintedAt": "", "shows": []}
    heard = json.loads(HEARD.read_text(encoding="utf-8")) if HEARD.exists() else []
    used = {s.get("topic") or s.get("title") for s in queue.get("shows", [])} | set(heard)

    deck = gather_topics()
    print(f"topic deck: {len(deck)}")

    made = 0
    last_station = (queue.get("shows") or [{}])[-1].get("stationId")
    for story in deck:
        if made >= args.count:
            break
        topic = story["title"]
        if not topic or topic in used:
            continue
        kind = classify(topic, story.get("source", ""))
        if story.get("lane") == "tech":
            kind = "tech"
        elif story.get("lane") in ("severe", "world"):
            kind = story.get("lane") if story.get("lane") == "world" else "world"
        station = station_for(kind, last_station)
        receipts = receipts_from(topic, story["url"])
        if not receipts:
            continue
        caller = CALLERS[(abs(hash(topic)) % len(CALLERS))]
        caller = {"name": caller[0], "location": caller[1]}
        print(f"\n[{kind}] {station['name']} · {topic[:90]}")
        print(f"  receipts: {len(receipts)}")
        t0 = time.time()
        script, problems = None, []
        for attempt in (1, 2):
            try:
                script = write_hour(topic, station, receipts, caller, topic,
                                    repair="; ".join(problems) if attempt == 2 else "")
            except Exception as e:  # noqa: BLE001
                print(f"  attempt {attempt}: writer failed:", str(e)[:160])
                script = None
                problems = ["the previous reply was cut off or was not valid JSON — keep every line "
                            "under 55 words and return only the JSON object"]
                continue
            problems = validate(script, receipts)
            if not problems:
                break
            print(f"  attempt {attempt} validation:", "; ".join(problems[:5]))
        if not script or problems:
            print("  skipped this story")
            continue
        show = assemble(topic, station, receipts, caller, script,
                        story.get("source") or "public feed", story["url"])
        mins = show["durationMs"] / 60000
        print(f"  OK {len(show['segments'])} lines · {mins:.1f} min · {time.time()-t0:.0f}s · \"{show['title']}\"")
        if args.dry:
            print(f"\n--- {show['title']} ---")
            for seg in show["segments"]:
                print(f"  [{seg['speakerName']}] {seg['text']}")
        if not args.dry:
            queue.setdefault("shows", []).append(show)
            queue["shows"] = queue["shows"][-8:]
            queue["mintedAt"] = datetime.now(timezone.utc).isoformat()
            heard.append(topic)
            LIVE.mkdir(exist_ok=True)
            QUEUE.write_text(json.dumps(queue, indent=2, ensure_ascii=False), encoding="utf-8")
            HEARD.write_text(json.dumps(heard[-80:], indent=2, ensure_ascii=False), encoding="utf-8")
        used.add(topic)
        last_station = station["id"]
        made += 1

    print(f"\nminted {made} hour(s); queue now {len(queue.get('shows', []))}")
    return 0 if made else 1


if __name__ == "__main__":
    sys.exit(main())
