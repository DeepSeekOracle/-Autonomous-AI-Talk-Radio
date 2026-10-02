/**
 * Pull one spoken sentence out of a public page.
 * The headline is not part of the sentence, and a clip ends on a word.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

export function decodePageText(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, " and ")
    .replace(/&quot;|&#0*34;/gi, " ")
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&rsquo;|&#0*8217;|&#x2019;/gi, "'")
    .replace(/&lsquo;|&#0*8216;|&#x2018;/gi, "'")
    .replace(/&rdquo;|&#0*8221;|&#x201d;/gi, " ")
    .replace(/&ldquo;|&#0*8220;|&#x201c;/gi, " ")
    .replace(/&mdash;|&#0*8212;|&#x2014;|&ndash;|&#0*8211;|&#x2013;/gi, " ")
    .replace(/&hellip;|&#0*8230;|&#x2026;/gi, " ")
    .replace(/&#(\d{2,5});/g, (_, n: string) => {
      const code = Number(n);
      return code >= 32 && code < 65536 ? String.fromCharCode(code) : " ";
    })
    .replace(/\s+/g, " ")
    .replace(/Facebook Twitter Print Email/gi, " ")
    .trim();
}

function fold(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const CHROME = /cookie|subscribe|javascript|all rights reserved|facebook twitter|print email|skip to main content|about contact press|newsletter|deeplinks blog/i;
const DATE_RE = /\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) 20\d{2}\b/g;
const SECTION_RE = /\b(Climate and Environment|Humanitarian Aid|Peace and Security|Law and Crime Prevention)\b/g;

/** Drop a headline glued to the lede, even when a label sits in front of it. */
export function stripLeadingTitle(sentence: string, title: string): string {
  const want = fold(title);
  const folded = fold(sentence);
  const at = want.length >= 12 ? folded.indexOf(want) : -1;
  if (at < 0) return sentence.trim();
  const target = at + want.length;
  let seen = 0;
  let i = 0;
  for (; i < sentence.length && seen < target; i++) {
    if (/[a-z0-9]/i.test(sentence[i])) seen += 1;
  }
  return sentence.slice(i).replace(/^[\s:;,|—-]+/, "").trim();
}

function polish(sentence: string, title: string): string {
  const cleaned = stripLeadingTitle(sentence, title)
    .replace(/\(file\)/gi, " ")
    .replace(/\bBy [A-Z][a-z]+ [A-Z][a-z]+\b/g, " ")
    .replace(DATE_RE, " ")
    .replace(SECTION_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
  const good = cleaned.split(/(?<=[.!?])\s+/).find((part) => {
    const line = part.trim();
    return line.length >= 60 && !CHROME.test(line);
  });
  if (!good) return "";
  const quote = clipQuote(good.trim(), 320);
  const want = fold(title);
  if (want.length >= 12 && fold(quote).includes(want)) return "";
  return CHROME.test(quote) ? "" : quote;
}

/** Keep a full sentence. If it must be shorter, stop on a word, never mid-word. */
export function clipQuote(sentence: string, max = 320): string {
  const clean = sentence.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return /[.!?]$/.test(clean) ? clean : `${clean}.`;
  const slice = clean.slice(0, max);
  const end = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
  if (end >= 80) return slice.slice(0, end + 1).trim();
  const word = slice.replace(/\s+\S*$/, "").trim();
  return word.length >= 80 ? `${word}.` : "";
}

export function quoteFromArticle(title: string, text: string): string {
  const useful = title.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 4);
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const sentence of sentences) {
    if (sentence.length < 80 || sentence.length > 1200) continue;
    const low = sentence.toLowerCase();
    const matched = useful.filter((word) => low.includes(word)).length;
    if (useful.length && matched < Math.min(2, useful.length)) continue;
    const quote = polish(sentence, title);
    if (quote.length < 60 || CHROME.test(quote)) continue;
    const kept = useful.filter((word) => quote.toLowerCase().includes(word)).length;
    if (kept >= 1) return quote;
  }
  return "";
}
