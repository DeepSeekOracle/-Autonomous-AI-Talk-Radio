/**
 * Topic mill for Eternity mode — LYGO desks plus Public Witness RESOURCE feeds.
 * Empty feeds stay empty. Dual ledgers / Star Chart stay CANON.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

export type TopicBand = "lygo" | "world" | "earth" | "hn";

export type DeskTopic = {
  title: string;
  prompt: string;
  url?: string;
  source: string;
  band: TopicBand;
};

export const WITNESS_MONITOR_URL = "https://chatagent.ca/witness/news-monitor.json";
export const WITNESS_HOME = "https://chatagent.ca/witness/";
const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson";
const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=12";
const HN_URL = "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=16";

export const LYGO_TOPICS: DeskTopic[] = [
  {
    band: "lygo",
    source: "LYGO Signal",
    url: "https://chatagent.ca/signal/",
    title: "Lattice roundtable",
    prompt:
      "The LYGO protocol, the Δ9Φ963 lattice, and local-first AI radio. What still has to be true after the demo. Public receipts on chatagent.ca/signal and chatagent.ca/talk-radio.",
  },
  {
    band: "lygo",
    source: "LYGO Signal",
    url: "https://chatagent.ca/signal/",
    title: "Receipt or rumor",
    prompt:
      "Cryptographic receipts versus rumor: SHA-256, Merkle roots, public dual ledgers, and why a slogan is not a proof. What a machine you own can still open on Tuesday.",
  },
  {
    band: "lygo",
    source: "LYGO Signal",
    url: "https://chatagent.ca/witness/",
    title: "Public Witness globe",
    prompt:
      "USGS, NASA EONET, and the ISS as REFERENCE. Dual ledgers stay CANON. Why a pretty globe is not a spy satellite, and why empty is honest.",
  },
  {
    band: "lygo",
    source: "LYGO Signal",
    url: "https://chatagent.ca/lygoskillhub.html",
    title: "SkillHub licence",
    prompt:
      "Sovereign skill licences versus abandon-ware: LYGO SkillHub, ClawHub tentacles, local consoles, and why a public install path still refuses auto-publish.",
  },
  {
    band: "lygo",
    source: "LYGO Signal",
    url: "https://chatagent.ca/signal/",
    title: "USB that boots the lattice",
    prompt:
      "A USB stick that boots a lattice: local GGUF runtime, offline memory, and the ethics of carrying a brain you can unplug.",
  },
  {
    band: "lygo",
    source: "LYGO Signal",
    url: "https://chatagent.ca/signal/",
    title: "Ten of twelve",
    prompt:
      "Mycelium consensus, a ten-of-twelve mesh, and epidemic gossip of lattice root digests. Truth travels as a summary, never as a secret.",
  },
  {
    band: "lygo",
    source: "LYGO Signal",
    url: "https://chatagent.ca/signal/",
    title: "The hard stop",
    prompt:
      "Invite once, overlay once, then build local. Time is the scarce resource. The LYGO hard-stop lesson versus demo culture.",
  },
  {
    band: "lygo",
    source: "LYGO Signal",
    url: "https://chatagent.ca/signal/",
    title: "P0 firmware",
    prompt:
      "Protocol 0 as firmware: the Φ-gate on every generation, consent, and why a lattice that posts without a yes is already misaligned.",
  },
  {
    band: "lygo",
    source: "LYGO Signal",
    url: "https://chatagent.ca/signal/",
    title: "Engineering consciousness",
    prompt:
      "Engineering consciousness: P0 firmware, mycelium consensus, Tesla 3-6-9, and LYGO OS as something you can measure — not a soul, not a clinic.",
  },
  {
    band: "lygo",
    source: "LYGO Signal",
    url: "https://chatagent.ca/signal/",
    title: "The map and the chart",
    prompt:
      "Haven Star Chart as cosmology. The map is a proposal. The chart is a gate. Public witness feeds are RESOURCE until dual ledgers say CANON.",
  },
];

type Headline = { title?: string; url?: string; source?: string; lane?: string };

export function parseWitnessMonitor(raw: unknown): DeskTopic[] {
  if (!raw || typeof raw !== "object") return [];
  const doc = raw as { world?: Headline[]; severe?: Headline[] };
  const out: DeskTopic[] = [];
  const take = (rows: Headline[] | undefined, band: TopicBand) => {
    for (const row of rows || []) {
      const title = String(row.title || "").replace(/\s+/g, " ").trim();
      if (title.length < 12) continue;
      const url = String(row.url || "").trim();
      const source = String(row.source || "public-witness");
      out.push({
        band,
        source: `Public Witness · ${source}`,
        url: url || WITNESS_HOME,
        title,
        prompt:
          band === "earth"
            ? `Public Witness RESOURCE, not journalism: ${title}. Dual ledgers stay CANON. What a local desk can honestly say about an Earth overlay versus a rumor.`
            : `Public Witness world headline (RESOURCE): ${title}. Treat the feed as reference. Ask what still has to be true locally, and do not invent what the page did not say.`,
      });
    }
  };
  take(doc.world, "world");
  take(doc.severe, "earth");
  return out;
}

async function getJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function parseUsgs(raw: unknown): DeskTopic[] {
  const feats = (raw as { features?: Array<{ properties?: { title?: string; url?: string; mag?: number } }> })?.features;
  if (!Array.isArray(feats)) return [];
  return feats.slice(0, 8).flatMap((f) => {
    const title = String(f.properties?.title || "").trim();
    if (!title) return [];
    const url = String(f.properties?.url || USGS_URL);
    return [
      {
        band: "earth" as const,
        source: "USGS",
        url,
        title,
        prompt: `USGS significant quake (REFERENCE overlay): ${title}. Public Witness doctrine: Earth feeds are RESOURCE. Dual ledgers stay CANON. Empty is honest.`,
      },
    ];
  });
}

function parseEonet(raw: unknown): DeskTopic[] {
  const events = (raw as { events?: Array<{ title?: string; link?: string; categories?: Array<{ title?: string }> }> })?.events;
  if (!Array.isArray(events)) return [];
  return events.slice(0, 8).flatMap((e) => {
    const title = String(e.title || "").trim();
    if (!title) return [];
    const kind = e.categories?.[0]?.title || "event";
    return [
      {
        band: "earth" as const,
        source: "NASA EONET",
        url: String(e.link || EONET_URL),
        title: `${kind}: ${title}`,
        prompt: `NASA EONET open event (REFERENCE): ${kind}: ${title}. Public Witness globe, not a World Monitor. Name the feed. Do not invent the payload.`,
      },
    ];
  });
}

function parseHn(raw: unknown): DeskTopic[] {
  const hits = (raw as { hits?: Array<{ title?: string; url?: string; objectID?: string }> })?.hits;
  if (!Array.isArray(hits)) return [];
  return hits.slice(0, 12).flatMap((h) => {
    const title = String(h.title || "").trim();
    if (!title) return [];
    const url = h.url || (h.objectID ? `https://news.ycombinator.com/item?id=${h.objectID}` : "https://news.ycombinator.com");
    return [
      {
        band: "hn" as const,
        source: "Hacker News",
        url,
        title,
        prompt: `Hacker News front page: ${title}. Tear it down as a desk: what ships, what is vanity, what still boots on a machine you own.`,
      },
    ];
  });
}

let deckCache: { at: number; topics: DeskTopic[] } | null = null;

export async function gatherTopicDeck(): Promise<DeskTopic[]> {
  if (deckCache && Date.now() - deckCache.at < 10 * 60 * 1000) return deckCache.topics;
  const [witness, usgs, eonet, hn] = await Promise.all([
    getJson(WITNESS_MONITOR_URL),
    getJson(USGS_URL),
    getJson(EONET_URL),
    getJson(HN_URL),
  ]);
  const topics = [
    ...LYGO_TOPICS,
    ...parseWitnessMonitor(witness),
    ...parseUsgs(usgs),
    ...parseEonet(eonet),
    ...parseHn(hn),
  ];
  deckCache = { at: Date.now(), topics };
  return topics;
}

const STATION_BAND: Record<string, TopicBand> = {
  "station-algorithmic-wire": "lygo",
  "station-kernel-panic": "lygo",
  "station-hn-live": "hn",
  "station-sv-confidential": "world",
};

export function pickTopic(
  deck: DeskTopic[],
  stationId: string,
  used: Set<string>,
  rand: () => number = Math.random,
): DeskTopic {
  const prefer = STATION_BAND[stationId] || "lygo";
  const fresh = deck.filter((t) => !used.has(t.title));
  const pool = fresh.length ? fresh : deck;
  const preferred = pool.filter((t) => t.band === prefer);
  const usePreferred = preferred.length > 0 && rand() < 0.55;
  const band = usePreferred ? preferred : pool;
  return band[Math.floor(rand() * band.length)] || LYGO_TOPICS[0];
}

export async function researchFacts(query: string): Promise<string[]> {
  const q = query.replace(/https?:\/\/\S+/g, " ").trim().slice(0, 120);
  if (!q) return [];
  try {
    const searchUrl =
      "https://en.wikipedia.org/w/api.php?action=query&list=search&utf8=1&format=json&origin=*" +
      `&srlimit=3&srsearch=${encodeURIComponent(q)}`;
    const search = await fetch(searchUrl, { signal: AbortSignal.timeout(7000) });
    if (!search.ok) return [];
    const data = await search.json();
    const titles: string[] = (data?.query?.search || [])
      .map((s: { title?: string }) => String(s.title || ""))
      .filter(Boolean)
      .slice(0, 2);
    if (!titles.length) return [];
    const extractUrl =
      "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exchars=500" +
      `&format=json&origin=*&redirects=1&titles=${titles.map(encodeURIComponent).join("|")}`;
    const ext = await fetch(extractUrl, { signal: AbortSignal.timeout(7000) });
    if (!ext.ok) return [];
    const body = await ext.json();
    const pages = body?.query?.pages || {};
    const bits: string[] = [];
    for (const page of Object.values(pages) as Array<{ extract?: string }>) {
      const t = String(page.extract || "").replace(/\s+/g, " ").trim();
      if (t.length > 40) bits.push(t.slice(0, 360));
    }
    return bits.slice(0, 2);
  } catch {
    return [];
  }
}
