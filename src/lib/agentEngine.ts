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
  /** How long this feed stays eligible. News uses the caller's lookback. Front pages live longer. */
  max_age_ms?: number;
};

const USGS_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson";
const EONET_URL = "https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=12";
const HN_FRONT = "https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=16";
const HN_MAX_AGE_MS = 48 * 60 * 60 * 1000;
const USGS_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const STOP = new Set([
  "about", "after", "before", "been", "could", "does", "every", "from", "have", "here",
  "into", "just", "more", "only", "over", "said", "should", "still", "than", "that",
  "them", "then", "there", "they", "this", "were", "what", "when", "where", "which",
  "with", "would", "your",
]);

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

function dateFromUrl(url: string): string {
  const match = url.match(/(20\d{2})[/-](\d{2})(?:[/-](\d{2}))?/);
  if (!match) return "";
  const iso = `${match[1]}-${match[2]}-${match[3] || "01"}T00:00:00Z`;
  return Number.isNaN(Date.parse(iso)) ? "" : iso;
}

function researchQuery(topic: string): string {
  const quake = topic.match(/^M\s*[\d.]+\b.*\bof\s+(.+)$/i);
  if (quake) return `${quake[1]} earthquake`.replace(/\s+/g, " ").trim().slice(0, 140);
  return topic.replace(/https?:\/\/\S+/g, " ").replace(/\s+/g, " ").trim().slice(0, 140);
}

function sharesTopic(query: string, text: string): boolean {
  const useful = [...tokens(query)].filter((word) => !STOP.has(word));
  if (!useful.length) return true;
  const body = tokens(text);
  const matched = useful.filter((word) => body.has(word)).length;
  if (useful.length >= 4) return matched >= 2;
  return matched >= 1;
}

function citesQuery(query: string, title: string, quote: string): boolean {
  const page = `${title} ${quote}`;
  if (!sharesTopic(query, page)) return false;
  if (/\bearthquake\b/i.test(query) && !/earthquake|magnitude|seismic/i.test(page)) return false;
  const years = page.match(/\b20\d{2}\b/g) || [];
  const asked = query.match(/\b20\d{2}\b/g) || [];
  const thisYear = String(new Date().getFullYear());
  if (years.length && !asked.length && years.every((year) => year !== thisYear)) return false;
  return true;
}

/** A discovered row may replace the station deck only when it belongs on that station. */
export function adoptDiscoveredTopic(row: TopicCandidate, preferBand: string): boolean {
  if (row.listener_relevance >= 0.34) return true;
  const url = (row.source_urls[0] || "").toLowerCase();
  const dated = row.why_now.startsWith("Fresh");
  if (!dated) return false;
  const label = `${row.why_now} ${url}`;
  if (preferBand === "hn" && /hacker news|\bhn\b|ycombinator/i.test(label)) return true;
  if (preferBand === "world" && /public witness|google news|news\.un\.org|gdacs\.org|witness/i.test(label)) return true;
  if (preferBand === "earth" && /usgs|earthquake|eonet|nasa|gdacs/i.test(label)) return true;
  return false;
}

export function rankTopicCandidates(hits: RawHit[], config: DiscoverConfig): TopicCandidate[] {
  const now = config.now ?? Date.now();
  const lookback = Math.max(15, config.lookback_minutes ?? 120) * 60 * 1000;
  const max = Math.min(5, Math.max(1, config.max_candidates ?? 5));
  const ranked = hits
    .filter((h) => h.topic.trim().length > 8)
    .map((h) => {
      const published = Date.parse(h.published_at);
      const windowMs = h.max_age_ms && h.max_age_ms > 0 ? h.max_age_ms : lookback;
      const age = Number.isFinite(published) ? now - published : Number.POSITIVE_INFINITY;
      if (Number.isFinite(published) && age > windowMs) return null;
      const recency = Number.isFinite(published) ? Math.max(0, 1 - age / windowMs) : 0.08;
      const listener_relevance = Math.min(1, overlap(config.network_theme, `${h.topic} ${h.blurb || ""}`));
      const controversy_score = controversyOf(`${h.topic} ${h.blurb || ""}`);
      const score = recency * 0.45 + listener_relevance * 0.4 + controversy_score * 0.15;
      const why_now = Number.isFinite(published)
        ? `Fresh on ${h.source} inside the lookback. Ranked for ${config.network_theme}.`
        : `Undated item from ${h.source}. No clock was on the feed, so it cannot outrank a fresh page.`;
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
    const url = String(row.url || WITNESS_HOME);
    hits.push({ topic, url, source: "Public Witness", published_at: dateFromUrl(url) });
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
      max_age_ms: USGS_MAX_AGE_MS,
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
      max_age_ms: HN_MAX_AGE_MS,
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

function plainText(raw: string): string {
  return String(raw || "")
    .replace(/<pre[\s\S]*?<\/pre>/gi, " ")
    .replace(/<code[\s\S]*?<\/code>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x2F;/gi, "/")
    .replace(/&amp;/gi, " and ")
    .replace(/&(?:lt|gt|quot|#39|#x27);/gi, " ");
}

const quoteFrom = (raw: string): string => {
  const clean = speakable(plainText(raw)).replace(/\s+/g, " ").trim();
  const letters = (clean.match(/[a-z]/gi) || []).length;
  if (clean.length < 40 || letters / clean.length < 0.65) return "";
  if (looksLikeInstruction(clean) || /may refer to|disambiguation/i.test(clean)) return "";
  if (/[{}<>]|<\/|\b(endpoint|exporters|function|const|import)\b/i.test(clean)) return "";
  const cut = clean.split(/(?<=[.!?])\s+/).slice(0, 2).join(" ");
  return cut.length > 280 ? `${cut.slice(0, 277).replace(/\s+\S*$/, "")}.` : cut;
};

async function wikiSources(query: string, pages: number): Promise<ResearchSource[]> {
  const q = researchQuery(query);
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
    if (!key_quote || !title || !citesQuery(q, title, key_quote)) continue;
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
  const q = researchQuery(query);
  if (!q) return [];
  const [stories, comments] = await Promise.all([
    getJson(`https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=${limit}&query=${encodeURIComponent(q)}`),
    getJson(`https://hn.algolia.com/api/v1/search?tags=comment&hitsPerPage=${limit}&query=${encodeURIComponent(q)}`),
  ]);
  const storyHits = (stories as { hits?: Array<{ title?: string; url?: string; objectID?: string; created_at?: string; story_text?: string }> })?.hits || [];
  const commentHits = (comments as { hits?: Array<{ comment_text?: string; story_title?: string; objectID?: string; created_at?: string }> })?.hits || [];
  const fromStories = storyHits.flatMap((h) => {
    const title = String(h.title || "").trim();
    const key_quote = quoteFrom(String(h.story_text || ""));
    if (!title || !key_quote || !citesQuery(q, title, key_quote)) return [];
    return [{
      title,
      url: h.objectID ? `https://news.ycombinator.com/item?id=${h.objectID}` : (h.url || "https://news.ycombinator.com"),
      published_at: h.created_at || "",
      key_quote,
    }];
  });
  const fromComments = commentHits.flatMap((h) => {
    const story = String(h.story_title || "").trim();
    const key_quote = quoteFrom(String(h.comment_text || ""));
    if (!key_quote || !citesQuery(q, story, key_quote)) return [];
    return [{
      title: story ? `Comment on ${story}` : "Hacker News comment",
      url: h.objectID ? `https://news.ycombinator.com/item?id=${h.objectID}` : "https://news.ycombinator.com",
      published_at: h.created_at || "",
      key_quote,
    }];
  });
  return [...fromStories, ...fromComments];
}

export function assembleResearch(topic: string, depth: ResearchDepth, found: ResearchSource[]): ResearchPacket {
  const cleaned = found.flatMap((src) => {
    const key_quote = quoteFrom(src.key_quote);
    const domain = domainOf(src.url);
    if (!key_quote || !domain) return [];
    return [{ ...src, key_quote }];
  });
  const cap = depth === "quick" ? 1 : depth === "deep" ? 4 : 3;
  const sources: ResearchSource[] = [];
  const domains = new Set<string>();
  for (const src of cleaned) {
    const domain = domainOf(src.url);
    if (domains.has(domain)) continue;
    domains.add(domain);
    sources.push(src);
    if (sources.length >= cap) break;
  }
  if (sources.length < 2) {
    for (const src of cleaned) {
      if (sources.some((kept) => kept.url === src.url)) continue;
      sources.push(src);
      if (sources.length >= 2) break;
    }
  }
  let confidence = 0.22;
  if (sources.length >= 1) confidence = 0.45;
  if (domains.size >= 2) confidence = 0.74;
  if (domains.size >= 3 && depth === "deep") confidence = 0.86;
  if (depth === "quick") confidence = Math.min(confidence, 0.66);
  if (depth === "deep" && domains.size < 2) confidence = Math.min(confidence, 0.5);
  const soften = confidence < 0.6;
  const first = sources[0];
  const second = domains.size >= 2 ? sources[1] : undefined;
  const pro = first
    ? `The favorable reading stops at the page titled ${first.title}. I will read that page, and I will not add a sentence it did not give us.`
    : `No page came back that I would quote on ${topic}. The favorable reading is only the claim itself, and a claim is not evidence.`;
  const con = second
    ? `A second page, from another site, is titled ${second.title}. It does not have to agree, and where the two pages leave a gap I will not fill it.`
    : `There is no second site on the table. I will not invent the opposing citation. The limit of this hour is that ${topic} still has only one kind of page, or none.`;
  const concrete_example = first
    ? `The concrete piece is the page titled ${first.title}. Whatever we cannot point to on that page, we do not say.`
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
