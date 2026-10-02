/**
 * Local show synthesizer — the studio's own writer.
 *
 * Writes a full spoken hour (~8–12 minutes) in English radio banter.
 * Mill prompts, protocol tags, and URLs stay in the notes, not on the air.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { RadioShow, ScriptSegment, Caller } from '../types';
import { SPEAKERS } from '../data';
import { mintEpisodeSummary, mintEpisodeTitle, topicCore } from './mintTitles';
import { looksLikeInstruction, speakable } from './speakable';

export interface SynthesizeOptions {
  topic: string;
  tone: string;
  stationId: string;
  ungated: boolean;
  host1: string;
  host2: string;
  facts?: string[];
  sourceUrl?: string;
  sourceName?: string;
  band?: string;
  writerNotes?: string;
}

const WPM = 150;
const GAP_MS = 650;

const STATION_NAME: Record<string, string> = {
  'station-algorithmic-wire': 'The Algorithmic Wire',
  'station-kernel-panic': 'Kernel Panic Radio',
  'station-hn-live': 'Hacker News Live',
  'station-sv-confidential': 'Silicon Valley Confidential',
};

const words = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

const durationFor = (text: string): number => Math.round((words(text) / WPM) * 60000) + 900;

const voiceIdFor = (name: string, fallback: string): string => {
  const hit = Object.entries(SPEAKERS).find(([, s]) => s.name.toLowerCase() === name.toLowerCase());
  return hit ? hit[0] : fallback;
};

const givenName = (name: string): string => {
  const cleaned = name.replace(/^Dr\.?\s+/i, "").replace(/["']/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && /zeroday/i.test(parts[0])) return parts[1];
  return parts[0] || name;
};

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

const airFact = (raw: string): string => {
  const t = speakable(raw).replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  if (t.length < 40 || looksLikeInstruction(t) || /may refer to|disambiguation/i.test(t)) return "";
  const cut = t.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  return cut.length > 280 ? `${cut.slice(0, 277).replace(/\s+\S*$/, "")}.` : cut;
};

type Line = { by: 1 | 2 | "caller"; text: string; tag: string; emotion: ScriptSegment["emotion"] };

function writeHour(opts: {
  topic: string;
  core: string;
  h1: string;
  h2: string;
  fact1: string;
  fact2: string;
  source: string;
  ungated: boolean;
  band?: string;
  seed: number;
  stationName: string;
}): Line[] {
  const { topic, core, h1, h2, fact1, fact2, source, ungated, seed, stationName } = opts;
  const first = givenName(h1);
  const second = givenName(h2);
  const closeTag = ungated ? "No sponsor gets a veto on this desk." : "That is the hour.";
  void seed;

  const receiptA = fact1
    ? `${first}, I opened a public page so this is not just two people trading opinions. Here is the sentence I am willing to read. ${fact1} If ${core} cannot stand next to that, then ${core} is still a pitch, and a pitch is not a shift you can hand to someone at three in the morning.`
    : `${first}, I went looking for a page a listener could open on ${core}, and nothing came back that I would stake a pager on. I am not going to invent a citation to sound prepared. We stay with the claim. What does it promise, who has to live with it, and what breaks when the promise is wrong.`;

  const receiptB = fact2
    ? `There is a second page, and it does not exist to decorate the first. ${fact2} If that fights the demo, I stay with the page. Applause is not a measurement. A sentence you can still find next Tuesday is.`
    : `The second pass is the one the slide deck skips. Where does ${core} begin, where does it hand off, and who can still explain the handoff when ${source} is slow. If nobody in the building can answer that without opening a vendor tab, you do not have a tool. You have a story.`;

  const callerTake = fact1
    ? `Hey, long time listener, first time I have had the nerve to call. We lived with ${core} for a month. The wins were real only on the pieces a junior could still explain at two in the morning. The rest turned into a rumor we were on the hook for, because nobody could say why the red light was red.`
    : `We put ${core} in front of real traffic because the meeting wanted a win before Friday. Two weeks later a red alert came in and nobody could explain it without opening someone else's tab. The useful part was the boundary. The rest was a story we told so the slide would land.`;

  const lines: Line[] = [
    {
      by: 1,
      tag: "Cold Open",
      emotion: "heated",
      text: `You are tuned to ${stationName}. I am ${h1}. ${second} is across the desk. Tonight we are on ${topic}. Not the trailer they cut for the timeline. The part that still has to work after the meeting, when somebody has to explain a failure in ordinary language. If you just sat down, stay. We are going to argue this one all the way through.`,
    },
    {
      by: 2,
      tag: "First Take",
      emotion: "intrigued",
      text: `${second} here, ${first}. I want the useful slice of ${core}. The part a tired person can still operate. What I will not applaud is the victory lap that shows up before anyone has sat with a broken hour. Tell me what changes on a Tuesday, after the clip stops looping, when the person holding the pager is alone with it.`,
    },
    {
      by: 1,
      tag: "The Push",
      emotion: "skeptical",
      text: `Naming ${core} is not the same as living with it. If a team cannot explain a failure without opening a vendor dashboard, they rented a story, and the rent comes due when the building is quiet. I want the failure in plain English. A clock. A name on the pager. What the listener would actually see if they were the one who got the call.`,
    },
    {
      by: 2,
      tag: "The Hold",
      emotion: "excited",
      text: `Then keep the doorway and let the middle move. That is the part of ${core} that can actually ship. You mark where your responsibility starts, you keep a copy you can open later, and you refuse to rebuild the whole stack in one night because a demo looked fast. Speed without a doorway is just a prettier outage, and the same people still get paged.`,
    },
    {
      by: 1,
      tag: "Receipt One",
      emotion: "neutral",
      text: receiptA,
    },
    {
      by: 2,
      tag: "Receipt Two",
      emotion: "intrigued",
      text: receiptB,
    },
    {
      by: 1,
      tag: "The Cost",
      emotion: "skeptical",
      text: `Now the cost, because the slide about ${core} never prints it. Who stays up when this is wrong. Who can still ship if ${source} goes dark for a week. If the answer is nobody, you built a shrine with a status page. I will take a slower tool I can still read at three in the morning over a miracle I cannot check, every night of the year.`,
    },
    {
      by: 2,
      tag: "Local Machine",
      emotion: "excited",
      text: `That is why I keep coming back to the machine in the room. A box you can unplug is a kind of honesty about ${core}, not a romance. If the work only exists while someone else's cluster feels generous, you do not own the work. You are visiting it. Visitors do not get a vote when the bill arrives or when the service blinks.`,
    },
    {
      by: 1,
      tag: "Consent",
      emotion: "heated",
      text: `And nobody gets to skip the ask. If ${core} posts, ships, or speaks for a person who never said yes, the brand language will not wash that out. A late demo is not a permission slip. The room being excited is not a permission slip. The yes is the product. Without it you are just making noise with someone else's name on it.`,
    },
    {
      by: 2,
      tag: "Observability",
      emotion: "intrigued",
      text: `If you cannot see ${core} fail, you cannot be on call for it. People dress that up as maturity. I hear the difference between a tool and a weather report you are legally responsible for. A board that only looks healthy when the vendor is happy is a lullaby. A desk needs the ugly minute, the one where the number goes red and a human can still tell why.`,
    },
    {
      by: 1,
      tag: "Time",
      emotion: "neutral",
      text: `Time is the part ${core} keeps pretending is free. You can look once. You can try the overlay once. Then you build the piece you can still run when the network is rude. Every extra layer nobody can explain becomes a meeting later, and the interest is paid at night, by people who stop trusting the desk because the desk stopped making sense.`,
    },
    {
      by: 2,
      tag: "Junior Floor",
      emotion: "excited",
      text: `Spare me the myth that a new hire will prompt their way through ${core} and come out a staff engineer. Someone still has to know where the floor is. If the next desk never walks the boring path, that is fine, as long as someone in the building can still find it when the lights go out. Scar tissue is not a mood. It is a map.`,
    },
    {
      by: 1,
      tag: "Caller Patch",
      emotion: "neutral",
      text: `Line One is lit. Jordan is in the car, and Jordan had to live with ${core}, not just quote it. Go ahead, you are on ${stationName}. Tell us what you saw with your own hands. Leave the hallway version and the slide version in the hallway.`,
    },
    {
      by: "caller",
      tag: "Field Report",
      emotion: "heated",
      text: callerTake,
    },
    {
      by: 2,
      tag: "Caller Hold",
      emotion: "intrigued",
      text: `That is the version that never makes the keynote, and I am glad we heard it raw. If you cannot explain the failure of ${core}, you have not taken it on. You have rented it. Thank you, Jordan. We are not going to iron that into a success story because a chart stayed green for a quarter.`,
    },
    {
      by: 1,
      tag: "Scar Tissue",
      emotion: "skeptical",
      text: `Scar tissue is not nostalgia, ${second}. It is the night you chased a leak in ${core} because nobody else knew the map, and the only light was the one you brought. If the next desk never has to do that, fine. Someone in the building still has to be able to. A desk that can only repeat a prompt cannot find the floor when the lights go out.`,
    },
    {
      by: 2,
      tag: "Map and Gate",
      emotion: "neutral",
      text: `A picture of ${core} is a proposal. A yes from the person who has to live with it is a decision. Mixing those two up is how a rumor starts wearing a uniform. We can point at a page. We cannot pretend a pretty picture is proof. That is the whole argument in one breath, and it is the breath I want listeners to keep.`,
    },
    {
      by: 1,
      tag: "What Holds",
      emotion: seed % 2 ? "heated" : "skeptical",
      text: `What holds is boring on purpose. Keep a copy of what you shipped. Keep it somewhere you can open on Tuesday. Do not let a slogan about ${core} reverse a decision you cannot undo. The interesting part is the claim. The job is the hold. I will still be on time for the next show, because the clock does not care how strongly we felt.`,
    },
    {
      by: 2,
      tag: "Twelve Months",
      emotion: "excited",
      text: `Over the next year the teams that survive ${core} will look slow in the meeting and fast when something breaks. They will quote pages they can still open. They will drop the pieces that cannot explain themselves. That is how you still have a desk in December, when someone comes back and asks who this is for and what it costs to keep.`,
    },
    {
      by: 1,
      tag: "Money Desk",
      emotion: "skeptical",
      text: `Someone still has to pay for ${core}. If this hour cannot say who writes the check, it is a mood with a microphone. Money will fund a miracle until the miracle needs a person with a wrench. Then it pays that person, or it leaves. I would rather be the person with the wrench. That person sleeps, eventually, because the system can be explained.`,
    },
    {
      by: 2,
      tag: "Ruling",
      emotion: "neutral",
      text: `So here is the ruling on ${topic}. Say what you saw. Keep the page. Never let a layer you cannot read reverse a decision you cannot undo. If that sounds harsh, harsh is cheaper than a quiet rewrite. A quiet rewrite is how a desk loses the room and only notices when the chairs are empty.`,
    },
    {
      by: 1,
      tag: "Last Beat",
      emotion: "laughing",
      text: `I will take a plain answer over a holy one, every night we are on this transmitter. ${second}, when the next claim about ${core} walks in with a smile, I want a page we can open, or I want a clean I do not know. Both of those I can broadcast. A costume I cannot.`,
    },
    {
      by: 2,
      tag: "Handoff",
      emotion: "intrigued",
      text: `If you are still with us, you heard the argument and you heard Jordan. The useful part of ${topic} is the part you can still explain to a person who was not in the room. The rest can stay on the table. We are not taking it home and calling it gospel.`,
    },
    {
      by: 1,
      tag: "Signoff",
      emotion: "neutral",
      text: `${closeTag} I am ${first}. ${second} was across the desk. You were listening to ${stationName}. Tonight we took apart ${topic}. The next show starts when the clock turns. Thanks for staying to the end.`,
    },
  ];

  return lines;
}

export function synthesizeShow(opts: SynthesizeOptions): RadioShow {
  const topicRaw = opts.topic.trim() || "The Future of Autonomous Engineering Systems";
  const topic = speakable(topicRaw).slice(0, 160) || "the claim on the desk tonight";
  const core = topicCore(topic) || topic;
  const h1 = speakable(opts.host1 || "Devon Cross") || "Devon Cross";
  const h2 = speakable(opts.host2 || "Dr. Maya Lin") || "Dr. Maya Lin";
  const id1 = voiceIdFor(opts.host1 || h1, "devon");
  const id2 = voiceIdFor(opts.host2 || h2, "maya");
  const ungated = opts.ungated || opts.tone.includes("ungated");
  const fact1 = opts.facts?.[0] ? airFact(opts.facts[0]) : "";
  const fact2 = opts.facts?.[1] ? airFact(opts.facts[1]) : "";
  const source = speakable(opts.sourceName || "the public page") || "the public page";
  const seed = hash(`${opts.stationId}|${topic}|${h1}`);

  const script = writeHour({
    topic,
    core,
    h1,
    h2,
    fact1,
    fact2,
    source,
    ungated,
    band: opts.band,
    seed,
    stationName: STATION_NAME[opts.stationId] || "AI Talk Radio",
  });

  const seen = new Set<string>();
  const unique = script.filter((line) => {
    const key = line.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
    if (seen.has(key)) return false;
    seen.add(key);
    return line.text.trim().length > 0;
  });

  const caller: Caller = {
    id: `caller-local-${Date.now()}`,
    name: "Jordan",
    location: "Toronto, Canada",
    topic,
    take: unique.find((l) => l.by === "caller")?.text || "",
    status: "on-air",
    avatar: "JO",
  };

  let cursor = 0;
  const segments: ScriptSegment[] = unique.flatMap((line, idx) => {
    const text = speakable(line.text);
    if (!text || looksLikeInstruction(text)) return [];
    const durationMs = durationFor(text);
    const segment: ScriptSegment = {
      id: `seg-local-${Date.now()}-${idx + 1}`,
      speakerId: line.by === 1 ? id1 : line.by === 2 ? id2 : caller.id,
      speakerName: line.by === 1 ? h1 : line.by === 2 ? h2 : `${caller.name} (${caller.location})`,
      text,
      timestampMs: cursor,
      durationMs,
      emotion: line.emotion,
      topicTag: line.tag,
    };
    cursor += durationMs + GAP_MS;
    return [segment];
  });

  const title = mintEpisodeTitle(topic, opts.stationId);
  const notesPrompt = opts.writerNotes ? speakable(opts.writerNotes).slice(0, 220) : "";

  return {
    id: `show-local-${Date.now()}`,
    stationId: opts.stationId,
    title,
    episodeNumber: Math.floor(Math.random() * 800) + 100,
    description: mintEpisodeSummary(title, opts.stationId, h1, h2),
    durationMs: segments.reduce((acc, s) => acc + s.durationMs, 0),
    hosts: [
      { id: id1, name: h1, role: "host-1", title: "Lead Anchor", avatar: "H1", voicePitch: SPEAKERS[id1]?.voicePitch ?? 0.9, voiceRate: SPEAKERS[id1]?.voiceRate ?? 1.0, voiceGender: SPEAKERS[id1]?.voiceGender ?? "male", personality: SPEAKERS[id1]?.personality ?? "Cynical systems vet" },
      { id: id2, name: h2, role: "host-2", title: "Co-Host", avatar: "H2", voicePitch: SPEAKERS[id2]?.voicePitch ?? 1.15, voiceRate: SPEAKERS[id2]?.voiceRate ?? 1.0, voiceGender: SPEAKERS[id2]?.voiceGender ?? "female", personality: SPEAKERS[id2]?.personality ?? "AI optimist" },
    ],
    segments,
    showNotes: [
      opts.sourceUrl
        ? `Source (${opts.sourceName || "public"}): ${opts.sourceUrl}`
        : `Desk topic with no extra URL — LYGO Signal hour.`,
      `Public Witness / Earth overlays are RESOURCE. Dual ledgers and the Star Chart stay CANON.`,
      fact1 ? `Receipt 1: ${fact1.slice(0, 220)}` : `No Wikipedia extract landed. Empty is honest.`,
      notesPrompt ? `Writer notes (not spoken): ${notesPrompt}` : `Working rule: adopt the interface, keep the receipts, explain every failure.`,
    ],
    keyTakeaways: [
      `A headline is weather. A hash you can open is a receipt.`,
      `If a team cannot explain a failure, they have rented the tool instead of adopting it.`,
      `Pin the boundary. Keep the messy middle swappable. Never rewrite the whole stack in one branch.`,
    ],
    references: [
      opts.sourceUrl
        ? { title: opts.sourceName || "Source", url: opts.sourceUrl, type: opts.band === "hn" ? "hn" : "news" }
        : { title: "LYGO Signal", url: "https://chatagent.ca/signal/", type: "news" },
      { title: "Public Witness", url: "https://chatagent.ca/witness/", type: "news" },
    ],
    callers: [caller],
    ungated,
    createdAt: new Date().toISOString(),
  };
}
