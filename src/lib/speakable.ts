/**
 * Spoken-English sanitizer for the autonomous desk.
 * Operator notes, URLs, and protocol tags stay off the air.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */

const INSTRUCTION_RE =
  /you are the executive showrunner|return (a |strict )?json|system instruction|system prompt|never echo|segments must have|responseMimeType|empty is honest|atmosphere is not proof|quote a receipt you can open|this is public witness resource|not star chart canon|operator notes|do not read the|these instructions|writer notes \(not spoken\)|we do not read|we name it once|named the hour once|next hour will mint|mint itself|as an ai language model|your task is|follow these rules|paste these rules|rules for spoken|do not paste/i;

/** A sentence that is a direction to the writer or the voice, not a line for the listener. */
const INSTRUCTION_SENTENCE =
  /\b(operator notes?|do not read|don't read|these instructions|this instruction|system prompt|system instruction|return (a |strict )?json|response ?mime ?type|executive showrunner|never echo|never say resource|segments must|writer notes|stage direction|read the following|as an ai language model|your task is|follow these rules|paste these rules|rules for spoken|we do not read|will mint itself|we name it once|named the hour once|empty is honest|atmosphere is not proof|quote a receipt you can open|public witness resource|not star chart canon)\b/i;

export function looksLikeInstruction(text: string): boolean {
  return INSTRUCTION_RE.test(text);
}

function dropDirectionSentences(text: string): string {
  const parts = text.split(/(?<=[.!?])\s+/);
  const kept = parts.filter((part) => part.trim() && !INSTRUCTION_SENTENCE.test(part));
  return kept.join(" ");
}

/** Turn writer/protocol copy into something a voice can read without stumbling. */
export function speakable(raw: string): string {
  let s = String(raw || "");
  s = s.replace(/<pre[\s\S]*?<\/pre>/gi, " ").replace(/<code[\s\S]*?<\/code>/gi, " ").replace(/<[^>]+>/g, " ");
  s = s.replace(/&#x2F;/gi, "/").replace(/&amp;/gi, " and ").replace(/&(?:lt|gt|quot|#39|#x27);/gi, " ");
  s = s.replace(/https?:\/\/\S+/gi, " ");
  s = s.replace(/\bwww\.\S+/gi, " ");
  s = s.replace(/\b[\w.-]+\.(ca|com|org|net|io|gov|edu)(\/\S*)?/gi, " ");
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/\[[^\]]+\]\([^)]+\)/g, " ");
  s = s.replace(/\[(?:pause|beat|laughs?|music|sfx|intro|outro|cold open|whisper|aside|direction)[^\]]*\]/gi, " ");
  s = s.replace(/\((?:pause|beat|laughs?|chuckles?|music|sfx|intro|outro|whisper|aside|stage|direction)[^)]*\)/gi, " ");
  s = dropDirectionSentences(s);
  if (looksLikeInstruction(s)) {
    s = dropDirectionSentences(s);
    s = s
      .replace(/You are the executive showrunner[\s\S]*$/i, " ")
      .replace(/Return a JSON[\s\S]*$/i, " ")
      .replace(/Return strict JSON[\s\S]*$/i, " ");
  }
  s = s.replace(/Δ9Φ963/g, "the LYGO mark");
  s = s.replace(/Δ9/g, "delta nine");
  s = s.replace(/\bRESOURCE\b/g, "public feed");
  s = s.replace(/\bCANON\b/g, "sealed record");
  s = s.replace(/Star Chart/gi, "Haven chart");
  s = s.replace(/Public Witness/gi, "public witness");
  s = s.replace(/SHA-256/gi, "sha two fifty six");
  s = s.replace(/\bGGUF\b/g, "local model file");
  s = s.replace(/\bP0\b/g, "protocol zero");
  s = s.replace(/\bUSGS\b/g, "the earthquake survey");
  s = s.replace(/\bEONET\b/g, "NASA earth events");
  s = s.replace(/\bISS\b/g, "the space station");
  s = s.replace(/Empty is honest\.?/gi, "");
  s = s.replace(/Quote a receipt you can open\.?\s*Atmosphere is not proof\.?/gi, "");
  s = s.replace(/This is Public Witness[^.]{0,80}\./gi, "");
  s = s.replace(/["“”]+/g, "");
  s = s.replace(/[_*`#]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function normalizeSpoken(text: string): string {
  return speakable(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Chrome Web Speech cuts utterances around 15 seconds. Keep chunks under that. */
export function chunkSpeech(text: string, maxWords = 22): string[] {
  const clean = speakable(text);
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let buf = "";
  const wordsOf = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
  const flush = () => {
    if (buf.trim()) chunks.push(buf.trim());
    buf = "";
  };
  const pushWords = (sentence: string) => {
    const words = sentence.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i += maxWords) {
      chunks.push(words.slice(i, i + maxWords).join(" "));
    }
  };
  for (const sentence of sentences) {
    if (wordsOf(sentence) > maxWords) {
      flush();
      pushWords(sentence);
      continue;
    }
    if (buf && wordsOf(buf) + wordsOf(sentence) > maxWords) flush();
    buf = buf ? `${buf} ${sentence}` : sentence;
  }
  flush();
  return chunks.filter((c) => c.length > 0);
}
