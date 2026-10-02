/**
 * Phase 1 of the agent engine: find a topic, then open pages before anyone speaks.
 *
 * There is no Google News tool in this studio, and Twitter trends are not fetched.
 * google_news tries the public Google News RSS and returns nothing if the browser
 * cannot read it. rss_feeds uses Public Witness, USGS, NASA EONET, and Hacker News.
 * listener_submissions reads only notes this page has been handed.
 * Later phases (ledger, listener routing, schedule, streaming mix, health) are not built.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { looksLikeInstruction, speakable } from "./speakable";
import { WITNESS_HOME, WITNESS_MONITOR_URL } from "./topicMill";

export type TopicSourceName = "google_news" | "rss_feeds" | "twitter_trends" | "listener_submissions";
export type ResearchDepth = "quick" | "standard" | "deep";
export type Sentiment = "positive" | "negative" | "mixed" | "neutral";

export type DiscoverConfig = {
  network_theme: string;
  lookback_minutes?: number;
  sources?: TopicSourceName[];
  max_candidates?: number;
  now?: number;
};

export type TopicCandidate = {
  topic: string;
  why_now: string;
  source_urls: string[];
  sentiment: Sentiment;
  controversy_score: number;
  listener_relevance: number;
};

export type ResearchSource = {
  title: string;
  url: string;
  published_at: string;
  key_quote: string;
};

export type ResearchPacket = {
  sources: ResearchSource[];
  framings: { pro: string; con: string };
  concrete_example: string;
  open_question: string;
  confidence: number;
  soften: boolean;
};

type RawHit = {
  topic: string;
  url: string;
  source: string;
  published_at: string;
  blurb?: string;
};

const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson";
const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=12";
const HN_FRONT = "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=16";

const listenerInbox: RawHit[] = [];

/** A listener line the discovery pass may rank. Not an on-air queue. */
export function noteListenerSubmission(message: string, at = new Date().toISOString()): void {
  const topic = speakable(message).slice(0, 180);
  if (topic.length < 12) return;
  listenerInbox.unshift({ topic, url: "", source: "listener", published_at: at });
  if (listenerInbox.length > 30) listenerInbox.pop();
}

const CONTROVERSY = /\b(ban|lawsuit|crash|fail|failure|outage|collapse|war|quake|killed|record|versus|vs\.?|controversy|leak)\b/i;
const POSITIVE = /\b(breakthrough|recover|approve|opened|release|gain|peace)\b/i;
const NEGATIVE = /\b(ban|lawsuit|crash|fail|failure|outage|collapse|war|quake|killed|leak)\b/i;

const domainOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

const tokens = (s: string): Set<string> =>
  new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3),
  );

const overlap = (a: string, b: string): number => {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let n = 0;
  for (const w of left) if (right.has(w)) n += 1;
  return n / Math.min(left.size, 6);
};

function sentimentOf(text: string): Sentiment {
  const pos = POSITIVE.test(text);
  const neg = NEGATIVE.test(text);
  if (pos && neg) return "mixed";
  if (pos) return "positive";
  if (neg) return "negative";
  return "neutral";
}

function controversyOf(text: string): number {
  const hits = text.match(new RegExp(CONTROVERSY.source, "gi"))?.length || 0;
  return Math.min(1, hits / 3);
}

export function rankTopicCandidates(hits: RawHit[], config: DiscoverConfig): TopicCandidate[] {
  const now = config.now ?? Date.now();
  const lookback = Math.max(15, config.lookback_minutes ?? 120) * 60 * 1000;
  const max = Math.min(5, Math.max(1, config.max_candidates ?? 5));
  const ranked = hits
    .filter((h) => h.topic.trim().length > 8)
    .map((h) => {
      const published = Date.parse(h.published_at);
      const age = Number.isFinite(published) ? now - published : Number.POSITIVE_INFINITY;
      if (Number.isFinite(published) && age > lookback) return null;
      const recency = Number.isFinite(published) ? Math.max(0, 1 - age / lookback) : 0.35;
      const listener_relevance = Math.min(1, overlap(config.network_theme, `${h.topic} ${h.blurb || ""}`));
      const controversy_score = controversyOf(`${h.topic} ${h.blurb || ""}`);
      const score = recency * 0.45 + listener_relevance * 0.4 + controversy_score * 0.15;
      const why_now = Number.isFinite(published)
        ? `Fresh on ${h.source} inside the lookback. Ranked for ${config.network_theme}.`
        : `Undated item from ${h.source}, kept because a clock was not on the feed.`;
      const candidate: TopicCandidate & { score: number } = {
        topic: h.topic.trim(),
        why_now,
        source_urls: h.url ? [h.url] : [],
        sentiment: sentimentOf(`${h.topic} ${h.blurb || ""}`),
        controversy_score,
        listener_relevance,
        score,
      };
      return candidate;
    })
    .filter((row): row is TopicCandidate & { score: number } => !!row)
    .sort((a, b) => b.score - a.score || b.listener_relevance - a.listener_relevance);

  const seen = new Set<string>();
  const out: TopicCandidate[] = [];
  for (const row of ranked) {
    const key = row.topic.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const { score: _score, ...candidate } = row;
    void _score;
    out.push(candidate);
    if (out.length >= max) break;
  }
  return out;
}

async function getText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
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

function parseGoogleNewsRss(xml: string): RawHit[] {
  return xml.split(/<item\b/i).slice(1, 9).flatMap((item) => {
    const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1] || "")
      .replace(/&amp;/g, "&")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
    const url = (item.match(/<link>([^<]+)<\/link>/i)?.[1] || "").trim();
    const pub = item.match(/<pubDate>([^<]+)<\/pubDate>/i)?.[1] || "";
    const published_at = pub && !Number.isNaN(Date.parse(pub)) ? new Date(pub).toISOString() : "";
    if (title.length < 12) return [];
    return [{ topic: title, url, source: "Google News", published_at }];
  });
}

async function googleNewsHits(theme: string): Promise<RawHit[]> {
  const q = theme.replace(/\s+/g, " ").trim().slice(0, 120);
  if (!q) return [];
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;
  const xml = await getText(url);
  if (!xml || !xml.includes("<item")) return [];
  return parseGoogleNewsRss(xml);
}

async function rssFeedHits(): Promise<RawHit[]> {
  const [witness, usgs, eonet, hn] = await Promise.all([
    getJson(WITNESS_MONITOR_URL),
    getJson(USGS_URL),
    getJson(EONET_URL),
    getJson(HN_FRONT),
  ]);
  const hits: RawHit[] = [];
  const doc = witness as { world?: Array<{ title?: string; url?: string }>; severe?: Array<{ title?: string; url?: string }> } | null;
  for (const row of [...(doc?.world || []), ...(doc?.severe || [])]) {
    const topic = String(row?.title || "").trim();
    if (topic.length < 12) continue;
    hits.push({ topic, url: String(row.url || WITNESS_HOME), source: "Public Witness", published_at: "" });
  }
  const quakes = (usgs as { features?: Array<{ properties?: { title?: string; url?: string; time?: number } }> } | null)?.features || [];
  for (const q of quakes.slice(0, 8)) {
    const topic = String(q.properties?.title || "").trim();
    if (!topic) continue;
    const t = q.properties?.time;
    hits.push({
      topic,
      url: String(q.properties?.url || USGS_URL),
      source: "USGS",
      published_at: typeof t === "number" ? new Date(t).toISOString() : "",
    });
  }
  const events = (eonet as { events?: Array<{ title?: string; link?: string; categories?: Array<{ title?: string }> }> } | null)?.events || [];
  for (const e of events.slice(0, 8)) {
    const topic = String(e.title || "").trim();
    if (!topic) continue;
    const kind = e.categories?.[0]?.title;
    hits.push({
      topic: kind ? `${kind}: ${topic}` : topic,
      url: String(e.link || EONET_URL),
      source: "NASA EONET",
      published_at: "",
    });
  }
  const stories = (hn as { hits?: Array<{ title?: string; url?: string; objectID?: string; created_at?: string }> } | null)?.hits || [];
  for (const h of stories.slice(0, 12)) {
    const topic = String(h.title || "").trim();
    if (!topic) continue;
    hits.push({
      topic,
      url: h.url || (h.objectID ? `https://news.ycombinator.com/item?id=${h.objectID}` : "https://news.ycombinator.com"),
      source: "Hacker News",
      published_at: h.created_at || "",
    });
  }
  return hits;
}

export async function discover_topics(config: DiscoverConfig): Promise<TopicCandidate[]> {
  const theme = config.network_theme?.trim();
  if (!theme) return [];
  const sources = config.sources?.length ? config.sources : (["rss_feeds"] as TopicSourceName[]);
  const jobs: Promise<RawHit[]>[] = [];
  if (sources.includes("google_news")) jobs.push(googleNewsHits(theme));
  if (sources.includes("rss_feeds")) jobs.push(rssFeedHits());
  if (sources.includes("listener_submissions")) jobs.push(Promise.resolve(listenerInbox.slice()));
  const groups = await Promise.all(jobs);
  return rankTopicCandidates(groups.flat(), { ...config, network_theme: theme });
}

const quoteFrom = (raw: string): string => {
  const clean = speakable(raw).replace(/\s+/g, " ").trim();
  if (clean.length < 40 || looksLikeInstruction(clean) || /may refer to|disambiguation/i.test(clean)) return "";
  const cut = clean.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  return cut.length > 280 ? `${cut.slice(0, 277).replace(/\s+\S*$/, "")}.` : cut;
};

async function wikiSources(query: string, pages: number): Promise<ResearchSource[]> {
  const q = query.replace(/https?:\/\/\S+/g, " ").trim().slice(0, 140);
  if (!q) return [];
  const search = await getJson(
    "https://en.wikipedia.org/w/api.php?action=query&list=search&utf8=1&format=json&origin=*" +
      `&srlimit=${pages}&srsearch=${encodeURIComponent(q)}`,
  );
  const titles: string[] = ((search as { query?: { search?: Array<{ title?: string }> } })?.query?.search || [])
    .map((s) => String(s.title || ""))
    .filter(Boolean)
    .slice(0, pages);
  if (!titles.length) return [];
  const body = await getJson(
    "https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&exchars=600" +
      `&format=json&origin=*&redirects=1&titles=${titles.map(encodeURIComponent).join("|")}`,
  );
  const pageMap = (body as { query?: { pages?: Record<string, { title?: string; extract?: string }> } })?.query?.pages || {};
  const out: ResearchSource[] = [];
  for (const page of Object.values(pageMap)) {
    const key_quote = quoteFrom(String(page.extract || ""));
    const title = String(page.title || "").trim();
    if (!key_quote || !title) continue;
    out.push({
      title,
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
      published_at: "",
      key_quote,
    });
  }
  return out;
}

async function hnSources(query: string, limit: number): Promise<ResearchSource[]> {
  const q = query.replace(/https?:\/\/\S+/g, " ").trim().slice(0, 140);
  if (!q) return [];
  const data = await getJson(
    `https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=${limit}&query=${encodeURIComponent(q)}`,
  );
  const hits = (data as { hits?: Array<{ title?: string; url?: string; objectID?: string; created_at?: string; story_text?: string }> })?.hits || [];
  return hits.flatMap((h) => {
    const title = String(h.title || "").trim();
    const key_quote = quoteFrom(String(h.story_text || "")) || quoteFrom(`The public headline is: ${title}. That is the claim a stranger can still open, and it is not yet a measurement.`);
    if (!title || !key_quote) return [];
    return [{
      title,
      url: h.url || (h.objectID ? `https://news.ycombinator.com/item?id=${h.objectID}` : "https://news.ycombinator.com"),
      published_at: h.created_at || "",
      key_quote,
    }];
  });
}

export function assembleResearch(topic: string, depth: ResearchDepth, found: ResearchSource[]): ResearchPacket {
  const sources: ResearchSource[] = [];
  const domains = new Set<string>();
  for (const src of found) {
    const domain = domainOf(src.url);
    if (!src.key_quote || !domain || domains.has(domain)) continue;
    domains.add(domain);
    sources.push(src);
    if (sources.length >= (depth === "quick" ? 1 : depth === "deep" ? 4 : 3)) break;
  }
  let confidence = 0.22;
  if (sources.length >= 1) confidence = 0.45;
  if (domains.size >= 2) confidence = 0.74;
  if (domains.size >= 3 && depth === "deep") confidence = 0.86;
  if (depth === "quick") confidence = Math.min(confidence, 0.66);
  if (depth === "deep" && domains.size < 2) confidence = Math.min(confidence, 0.5);
  const soften = confidence < 0.6;
  const first = sources[0];
  const second = sources[1];
  const pro = first
    ? `One page, ${first.title}, says this and nothing more. ${first.key_quote}`
    : `No page came back that I would quote on ${topic}. The favorable reading is only the claim itself, and a claim is not evidence.`;
  const con = second
    ? `A second page from another domain, ${second.title}, does not have to agree. It says this. ${second.key_quote} Where the two pages do not match, we do not pick a winner to fill the gap.`
    : `There is no second domain on the table. I will not invent the opposing citation. The limit of this hour is that ${topic} still has only one kind of page, or none.`;
  const concrete_example = first
    ? `The concrete piece is the page titled ${first.title}. ${first.key_quote}`
    : `There is no concrete example yet, because no page cleared the bar for ${topic}.`;
  const open_question = soften
    ? `What would a second, independent page have to say before ${topic} is a thesis instead of a question?`
    : `Where do these pages refuse to say the same thing about ${topic}, and which sentence is a listener allowed to repeat?`;
  return {
    sources,
    framings: { pro, con },
    concrete_example,
    open_question,
    confidence: Math.round(confidence * 100) / 100,
    soften,
  };
}

export async function research_topic(topic: string, depth: ResearchDepth = "standard"): Promise<ResearchPacket> {
  const level = depth === "quick" || depth === "deep" ? depth : "standard";
  try {
    const wikiCount = level === "deep" ? 3 : level === "quick" ? 1 : 2;
    const hnCount = level === "quick" ? 0 : level === "deep" ? 3 : 2;
    const [wiki, hn] = await Promise.all([
      wikiSources(topic, wikiCount),
      hnCount ? hnSources(topic, hnCount) : Promise.resolve([]),
    ]);
    return assembleResearch(topic, level, [...wiki, ...hn]);
  } catch {
    return assembleResearch(topic, level, []);
  }
}
