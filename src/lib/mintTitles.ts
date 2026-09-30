/**
 * Episode titles for the always-on autonomous studio.
 *
 * Station identity stays the four desks (how each one reads a prompt).
 * The episode name is minted from the user's topic — never a leftover
 * Wikipedia / Hacker News headline, never "The Firestorm Over {full prompt}".
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

const STOP = new Set(
  "a an and are as at be by for from how if in into is it its just now of on or the this to was were what when where which who why with about generate radio show called based top hacker news stories please make me talk segment discussion podcast episode write a full minutes minute".split(
    " ",
  ),
);

function cleanQuery(topic: string): string {
  return topic
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/generate a radio show[^.]*?(?:about|called|on|:)?/gi, " ")
    .replace(/based on top hacker news stories/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function titleCase(s: string): string {
  return s
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => (w === w.toUpperCase() && w.length > 1 ? w : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
}

/** Short noun phrase from the user's prompt. */
export function topicCore(topic: string): string {
  const q = cleanQuery(topic);
  const words = q
    .replace(/['’]/g, "")
    .split(/[^A-Za-z0-9ΔΦ0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w.toLowerCase()));
  const keep = words.slice(0, 6);
  return titleCase(keep.join(" ")) || "Open Hour";
}

/** How each station reads a prompt. */
export const STATION_LENS: Record<string, { name: string; lens: string; frames: (core: string) => string[] }> = {
  "station-algorithmic-wire": {
    name: "The Algorithmic Wire",
    lens: "Reads a prompt as architecture versus production fire.",
    frames: (c) => [
      `Wire Desk: ${c}`,
      `The Algorithmic Wire — ${c}`,
      `Architecture Hour: ${c}`,
      `On the Wire: ${c}`,
      `${c} on the Wire`,
    ],
  },
  "station-kernel-panic": {
    name: "Kernel Panic Radio",
    lens: "Reads a prompt ungated: late desk, no sponsor filter.",
    frames: (c) => [
      `Kernel Panic: ${c}`,
      `Ungated Hour — ${c}`,
      `Late Desk: ${c}`,
      `${c} Ungated`,
      `Panic Desk: ${c}`,
    ],
  },
  "station-hn-live": {
    name: "Hacker News Live",
    lens: "Reads a prompt as a front-page teardown.",
    frames: (c) => [
      `Front Page: ${c}`,
      `Hacker News Live — ${c}`,
      `Show HN: ${c}`,
      `${c} on the Board`,
      `Teardown: ${c}`,
    ],
  },
  "station-sv-confidential": {
    name: "Silicon Valley Confidential",
    lens: "Reads a prompt as capital, silicon, and who pays.",
    frames: (c) => [
      `Confidential: ${c}`,
      `Term Sheet: ${c}`,
      `93.5 Confidential — ${c}`,
      `${c} on the Money`,
      `Compute Hour: ${c}`,
    ],
  },
};

export function stationLens(stationId: string) {
  return STATION_LENS[stationId] || STATION_LENS["station-algorithmic-wire"];
}

export function mintEpisodeTitle(
  topic: string,
  stationId: string,
  rand: () => number = Math.random,
): string {
  const core = topicCore(topic);
  const lens = stationLens(stationId);
  const frames = lens.frames(core);
  let title = frames[Math.floor(rand() * frames.length)] || `${lens.name} — ${core}`;
  if (title.length > 64) title = core.length > 64 ? `${core.slice(0, 61)}…` : core;
  return title;
}

export function mintEpisodeSummary(
  title: string,
  stationId: string,
  host1: string,
  host2: string,
): string {
  const lens = stationLens(stationId);
  return `${lens.name} is on air. ${lens.lens} ${host1} and ${host2} take ${title} as a live autonomous roundtable until the clock is honest.`;
}
