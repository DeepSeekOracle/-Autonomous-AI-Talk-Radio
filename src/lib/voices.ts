/**
 * Rank browser speech voices. Microsoft David / Mark / Desktop are the
 * robotic SAPI pack; Natural / Neural / Online (Andrew, Guy, Christopher)
 * are the human-sounding males. Female already lands well (Zira / Aria / Samantha).
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

export function scoreEnglishVoice(
  name: string,
  lang: string,
  gender: "male" | "female",
  localService = true,
): number {
  const n = name.toLowerCase();
  const l = lang.toLowerCase().replace("_", "-");
  let s = 0;
  if (l.startsWith("en")) s += 6;
  if (l.startsWith("en-us")) s += 2;
  if (/natural|neural|online/.test(n)) s += 45;
  if (!localService) s += 12;
  if (/espeak|compact|ravi|hazel desktop/.test(n)) s -= 35;
  if (/desktop/.test(n)) s -= 20;

  if (gender === "male") {
    if (/female|zira|jenny|aria|samantha|serena|susan|hazel|sonia|catherine/.test(n)) s -= 90;
    if (/\bdavid\b/.test(n)) s -= 55;
    if (/microsoft/i.test(n) && /\bmark\b/.test(n)) s -= 45;
    if (/\bandrew\b|\bchristopher\b|\bguy\b|\bryan\b|\bsteffan\b|\beric\b|\btony\b/.test(n)) s += 35;
    if (/\bdaniel\b|\balex\b|\bjames\b|\bthomas\b|\bbrian\b|\barthur\b/.test(n)) s += 28;
    if (/\bmale\b/.test(n) && /natural|neural|google/.test(n)) s += 22;
    if (/google/.test(n) && !/female/.test(n)) s += 10;
  } else {
    if (/\bdavid\b|\bmark\b|\bguy\b|\bandrew\b/.test(n) && !/female/.test(n)) s -= 90;
    if (/\bmale\b/.test(n) && !/female/.test(n)) s -= 70;
    if (/samantha|aria|jenny|zira|serena|karen|victoria|sonia|susan|michelle|ana\b/.test(n)) s += 32;
    if (/\bfemale\b/.test(n)) s += 18;
    if (/google/.test(n) && /female/.test(n)) s += 10;
  }
  return s;
}

export function pickEnglishVoice<T extends { name: string; lang: string; localService?: boolean }>(
  voices: T[],
  gender: "male" | "female",
): T | null {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length ? english : voices;
  if (!pool.length) return null;
  let best = pool[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const v of pool) {
    const sc = scoreEnglishVoice(v.name, v.lang, gender, v.localService !== false);
    if (sc > bestScore) {
      bestScore = sc;
      best = v;
    }
  }
  return best;
}
