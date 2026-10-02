/**
 * Desk writer — one act, four stations.
 *
 * Cold open, two positions, a scene, evidence, a caller, a test, a ruling, sign-off.
 * The station chooses the question. The topic and any public page choose the subject.
 * A world or earth headline is not forced through a software scene.
 *
 * @license SPDX-License-Identifier: Apache-2.0
 */
import type { ScriptSegment } from '../types';
import type { ResearchPacket } from './agentEngine';

export type AirCaller = { name: string; location: string; avatar: string };

export type DeskBrief = {
  topic: string;
  core: string;
  h1: string;
  h2: string;
  fact1: string;
  fact2: string;
  source: string;
  ungated: boolean;
  band?: string;
  tone: string;
  seed: number;
  stationId: string;
  stationName: string;
  packet?: ResearchPacket;
  /** Play Forever: this hour is one public item, not the saved desk essay. */
  live?: boolean;
};

export type DeskLine = {
  by: 1 | 2 | "caller";
  tag: string;
  emotion: NonNullable<ScriptSegment["emotion"]>;
  text: string;
};

const ROSTER: AirCaller[] = [
  { name: "Jordan", location: "Toronto, Canada", avatar: "JO" },
  { name: "Priya", location: "Bangalore, India", avatar: "PR" },
  { name: "Elena", location: "Munich, Germany", avatar: "EL" },
  { name: "Hiro", location: "Tokyo, Japan", avatar: "HI" },
];

export function callerFor(seed: number): AirCaller {
  return ROSTER[Math.abs(seed) % ROSTER.length];
}

const givenName = (name: string): string => {
  const cleaned = name.replace(/^Dr\.?\s+/i, "").replace(/["']/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2 && /zeroday/i.test(parts[0])) return parts[1];
  return parts[0] || name;
};

const worldBand = (band?: string): boolean => band === "world" || band === "earth";

const toneLead = (tone: string): string => {
  const t = tone.toLowerCase();
  if (t.includes("late")) return "The building is down to the night shift.";
  if (t.includes("morning")) return "Top of the hour.";
  if (t.includes("deep")) return "We are staying on the mechanism, not the trailer.";
  return "";
};

const words = (text: string): number => text.trim().split(/\s+/).filter(Boolean).length;

/** Keep a turn long enough to be a spoken paragraph, without adding a second essay. */
function spoken(text: string, spare: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (words(clean) >= 62) return clean;
  return `${clean} ${spare}`.replace(/\s+/g, " ").trim();
}

type Cast = {
  b: DeskBrief;
  first: string;
  second: string;
  caller: AirCaller;
  world: boolean;
  spare: string;
};

function line(by: DeskLine["by"], tag: string, emotion: DeskLine["emotion"], text: string, spare: string): DeskLine {
  return { by, tag, emotion, text: spoken(text, spare) };
}

function evidence(c: Cast, hold: string, gap: string): string {
  if (c.b.fact1) {
    return `${c.first}, I am going to read what the page actually says, and then I am going to stop. ${c.b.fact1} That is the sentence I have in front of me. ${hold}`;
  }
  return gap;
}

function secondPass(c: Cast, hold: string, gap: string): string {
  if (c.b.fact2) {
    return `There is a second page, and it does not exist to decorate the first. ${c.b.fact2} ${hold}`;
  }
  return gap;
}

function open(c: Cast, question: string): string {
  const lead = toneLead(c.b.tone);
  return `${lead} You are tuned to ${c.b.stationName}. I am ${c.b.h1}. ${c.second} is across the desk. Tonight we are on ${c.b.topic}. The question on this desk is ${question}. We will argue that all the way through, including the part that does not flatter the idea. If you just sat down, stay.`.trim();
}

function signoff(c: Cast): string {
  const close = c.b.ungated ? "No sponsor gets a veto on this desk." : "That is the hour.";
  return `${close} I am ${c.first}. ${c.second} was across the desk. You were listening to ${c.b.stationName}. Tonight we took apart ${c.b.topic}. The next show starts when the clock turns. Thanks for staying to the end.`;
}

function wire(c: Cast): DeskLine[] {
  const q = c.world
    ? "what this headline does to systems people actually depend on"
    : "what is still true when the system is on fire, not when the diagram is on a slide";
  const spare = `That is the argument around ${c.b.core}, and we are not leaving it as a slogan.`;
  return [
    line(1, "Cold Open", "heated", open(c, q), spare),
    line(2, "First Take", "intrigued", `${c.second} here. I want the piece of ${c.b.core} a tired person can still operate after the review is over. Not the promise in the room. The handoff. If ${c.b.topic} only works while everyone is watching, then it does not work, and I would rather say that now than admire it for an hour.`, spare),
    line(1, "The Push", "skeptical", c.world
      ? `A headline is not a system, ${c.second}. ${c.b.core} arrives as words. People still have water, routes, radios, and a night shift. I will not invent a casualty figure to sound informed. I want to know which ordinary service bends if this is as large as the sentence sounds, and which one does not.`
      : `The diagram of ${c.b.core} is not the outage. I have watched a design pass every review and still fail in the one place nobody drew. If the people on duty cannot explain ${c.b.topic} without opening someone else's dashboard, they do not have the system. They have a tour of it.`, spare),
    line(2, "Scene", "excited", c.world
      ? `Picture the night desk, not the map. A coordinator has the headline about ${c.b.core} and a phone that keeps ringing. The useful question is small. What can they confirm. What must they refuse to confirm. What keeps moving while they wait for a better page. That is the whole craft, and it is slower than the post.`
      : `Picture a Tuesday, not a keynote. Someone merges the change that was supposed to carry ${c.b.core}, the checks are green, and an hour later a real user is stuck. The interesting part is not the blame. It is which line they can still read, and which line has already left the building for a service they do not operate.`, spare),
    line(1, "Page One", "neutral", evidence(
      c,
      `It answers one question about ${c.b.core}, and only that question. It does not tell me the outage, and I will not pretend a paragraph is a log.`,
      `${c.first}, I do not have a page I trust on ${c.b.core}. So the diagram does not get to pretend it is a log. We stay with the claim itself. What does ${c.b.topic} promise, who operates it, and what they can still see when it is wrong.`,
    ), spare),
    line(2, "What It Means", "intrigued", `If I take that seriously, ${c.b.core} has to survive contact with a person who was not in the original room. The meaning is the handoff. Can they tell a true failure from a noisy one. Can they undo one step without undoing the month. If the answer is no, the idea is still a presentation.`, spare),
    line(1, "What It Does Not Prove", "skeptical", `And it does not prove the flattering version. A clean paragraph about ${c.b.topic} is not a quiet night. I have seen healthy charts on top of a broken path because the chart was measuring the happy door. We owe the listener the limit of what we know, said in the same tone as the claim.`, spare),
    line(2, "Second Pass", "neutral", secondPass(
      c,
      `If that second sentence fights the first story about ${c.b.core}, I stay with the page I can still find, not with the version that sounded better in the room.`,
      `The measurement ${c.b.core} still owes us is simple. What does a person on duty see in the first minute, and what can they change in the second. If ${c.b.source} cannot help them answer that, it is a brochure.`,
    ), spare),
    line(1, "Who Stays", "heated", c.world
      ? `Who stays is not the account that posted first. It is the person who has to keep a service up while the facts are still thin. ${c.b.core} does not become more true because a feed is loud. Name that person before you name the lesson.`
      : `Who stays is the person who can still ship if ${c.b.source} goes quiet for a week. If the answer is nobody, ${c.b.core} is a shrine with a status page. I will take a slower path I can read over a miracle I cannot check.`, spare),
    line(2, "What I Would Ship", "excited", `What I would actually ship is the narrow door. ${c.b.core} gets one boundary a new person can learn, a way to tell that it failed, and a way back. The rest can wait. Ambition is allowed. An ambition that cannot be operated on a Tuesday is a hobby with a budget.`, spare),
    line(1, "The Hole", "skeptical", `The hole in that, ${c.second}, is the boundary that looks narrow in the meeting and wide at night. If the door to ${c.b.core} still depends on a person who left, you did not ship a door. You shipped a favor. Favors expire. Systems that depend on them page the wrong people.`, spare),
    line(2, "Caller Intro", "neutral", `Line One is lit. ${c.caller.name} is calling from ${c.caller.location}, and they had to live with this, not just repeat it. Go ahead, you are on ${c.b.stationName}. Tell us what you saw. Leave the slide in the hallway.`, spare),
    line("caller", "Field Report", "heated", c.world
      ? `I am ${c.caller.name}, in ${c.caller.location}. We had the headline about ${c.b.core} before we had anything we could check. The useful work was marking what we knew, what we did not, and which service had to keep running anyway. The loud version traveled faster than the careful one. The careful one is what the night shift used.`
      : `I am ${c.caller.name}, in ${c.caller.location}. We lived with ${c.b.core} past the demo. The part we could explain kept working. The part we could only describe started failing in ways the original room did not recognize. We did not need a bigger promise. We needed one path a person on duty could still narrate.`, spare),
    line(2, "Caller Hold", "intrigued", `${c.caller.name}, that is the version the announcement skips, and I am glad it got air. The detail that matters is the path someone could still narrate. If ${c.b.core} loses that path, it is no longer a tool the building holds. It is a story the building hopes is true.`, spare),
    line(1, "The Unasked", "skeptical", `The question ${c.caller.name} left us is the one I care about. When ${c.b.topic} fails halfway, what is the first true sentence the operator can say. Not the lesson. The sentence. If we cannot write that sentence on this desk, we are not ready to recommend the thing.`, spare),
    line(2, "The Test", "excited", `Then here is the test, and it is fairer than a mood. Take ${c.b.core} away from its authors for one ordinary day. If a different person can tell whether it is working, and can stop it without a ceremony, it earned the next conversation. If they cannot, it goes back to the bench. No hard feelings. A bench is a respectable place.`, spare),
    line(1, "Ruling", "neutral", `So the ruling on ${c.b.topic} is plain. Keep the part a person can operate and explain. Do not promote the part that only survives inside the original meeting. ${c.b.core} can be ambitious and still be honest. Honesty is the piece the listener can reuse tomorrow morning, without us in the room.`, spare),
    line(2, "Handoff", "laughing", `If you are still here, you do not need our permission. Write down the failure sentence for ${c.b.core} before you write the announcement. ${c.first} and I will still disagree on the pace. We do not disagree on that order. The listener who keeps it will have a quieter Tuesday than the listener who skips it.`, spare),
    line(1, "Signoff", "neutral", signoff(c), spare),
  ];
}

function panic(c: Cast): DeskLine[] {
  const q = c.world
    ? "what still works when the network is the thing that failed"
    : "what is left of this when the vendor cord is pulled";
  const spare = `Say it again in plain speech: ${c.b.core} has to survive without its sales pitch.`;
  return [
    line(1, "Cold Open", "heated", open(c, q), spare),
    line(2, "First Take", "intrigued", `${c.second} here, and I am in a less romantic mood than the poster. ${c.b.core} is interesting if it still behaves when the rented part goes away. Show me the piece that boots on a machine the buyer holds. If ${c.b.topic} cannot stand that test, it is a lease, and leases have a landlord.`, spare),
    line(1, "The Push", "skeptical", c.world
      ? `When the wires are the failure, ${c.second}, cleverness is a poor blanket. ${c.b.core} is a headline until a person can say which local thing still runs. I will not decorate a thin report with certainty. Radios, paper, and a neighbor beat a dashboard you cannot reach.`
      : `Pull the cord and watch who panics. That is my whole review of ${c.b.core}. If the work vanishes when ${c.b.source} frowns, you were visiting. Visitors do not get to call it infrastructure. I want the piece that is still there after the login page is gone.`, spare),
    line(2, "Scene", "excited", c.world
      ? `The scene is a room with a weak signal and a strong need. Someone has heard ${c.b.core} and cannot refresh the page. What they still have is whoever is physically there, a notebook, and the last true thing they confirmed. That is not nostalgia. That is the system you own when the other system is down.`
      : `The scene I trust is a bench, not a launch. A person copies ${c.b.core} onto a machine they can unplug, runs the boring path, and writes down the result in their own words. If that afternoon is impossible, the product is a window onto someone else's computer. Windows close.`, spare),
    line(1, "Page One", "neutral", evidence(
      c,
      `It is allowed to inform ${c.b.core}. It is not allowed to become a benchmark I did not run.`,
      `I am not borrowing a benchmark for ${c.b.core}. Nothing I would sign my name to came back from a page I can reopen. So we judge the claim by what remains when the service is rude, not by a number I would have to invent.`,
    ), spare),
    line(2, "What It Means", "intrigued", `The meaning, if we are adults, is ownership. ${c.b.topic} either leaves a residue on a machine the operator controls, or it does not. Residue is a log, a file, a result you can show a colleague without asking a vendor for permission to look. That is a modest definition and it is the correct one.`, spare),
    line(1, "What It Does Not Prove", "skeptical", `A fast demo of ${c.b.core} proves the room was impressed. It does not prove the cord is optional. I have applauded things I could not reproduce the next morning. That embarrassment is useful. We should spend it here, before a listener spends money on the same trick.`, spare),
    line(2, "Second Pass", "neutral", secondPass(
      c,
      `Put beside ${c.b.core}, the question is whether this second sentence still makes sense offline.`,
      `What we still have not measured is the rude case. Turn the network off. Restart the machine. Ask ${c.b.core} to do the one job again. If that procedure does not exist, the procedure is the product you forgot to build.`,
    ), spare),
    line(1, "Who Stays", "heated", `Who stays is the person in the room when the login fails. Not the author of the thread. If ${c.b.core} has no story for that person, it is entertainment. Entertainment is allowed on a weekend. It is a bad plan for a desk that has to open on Monday.`, spare),
    line(2, "What I Would Ship", "excited", `I would ship the smallest loop that survives the plug being pulled. Input, result, and a record, all on the operator's machine. ${c.b.core} can grow after that. Growing before that is how a late-night show becomes an ad for a datacenter the listener does not control.`, spare),
    line(1, "The Hole", "skeptical", `The hole is pretending local means lonely. ${c.second}, a machine you hold can still be fed a lie at install time. Pulling the cord on ${c.b.topic} is necessary and not sufficient. You still have to know what you installed, or you have only moved the landlord into the spare room.`, spare),
    line(2, "Caller Intro", "neutral", `${c.caller.name} is on Line One from ${c.caller.location}. They tried the thing past the trailer. You are on ${c.b.stationName}. Tell us what was left when the convenient part stopped being convenient.`, spare),
    line("caller", "Field Report", "heated", c.world
      ? `${c.caller.name} in ${c.caller.location}. During ${c.b.core} the page was not the help. The help was a person nearby and a note we could reread without a signal. Everything that required a refresh had to wait. I am not making that romantic. I am saying the waiting was the design, whether we admitted it or not.`
      : `${c.caller.name}, ${c.caller.location}. We took ${c.b.core} off the rented service and onto a machine we could switch off. Half of it was real and kept working. Half of it was a call home that we had mistaken for a feature. The week got quieter after we deleted the call home. Quieter was the point.`, spare),
    line(2, "Caller Hold", "intrigued", `Thank you, ${c.caller.name}. Quieter is a result, and this desk does not sneer at it. If ${c.b.core} gets better when the hidden call stops, the hidden call was not a feature. It was the product wearing a costume. I want listeners to hear that without a wink.`, spare),
    line(1, "The Unasked", "skeptical", `What ${c.caller.name} did not ask, and I will, is who is allowed to change the local copy. If one person can alter ${c.b.topic} and nobody else can see the alteration, you did not escape a landlord. You appointed a smaller one. Write that name down.`, spare),
    line(2, "The Test", "excited", `The test fits on a card. Unplug the network. Run ${c.b.core} once. Restart. Run it again. If both results are explainable to a second person, keep going. If either result needs a phone call to a company, you are still renting, and the card should say so in ink.`, spare),
    line(1, "Ruling", "neutral", `Ruling on ${c.b.topic}. If it dies with the cord, say you are renting it. If it lives on a machine you can unplug, you may call it yours, and then you still have to govern it. ${c.b.core} does not get to skip that second sentence. Late night is for plain speech, and plain speech is the courtesy.`, spare),
    line(2, "Handoff", "laughing", `Listener, before you sleep on this: name the piece of ${c.b.core} that survives the plug, and the piece that phones home. ${c.first} will always pull the cord earlier than I will. We both want the list. The list is the show, more than either of our moods.`, spare),
    line(1, "Signoff", "neutral", signoff(c), spare),
  ];
}

function board(c: Cast): DeskLine[] {
  const q = c.world
    ? "what the public claim says, and what it carefully does not say"
    : "what in the public claim actually ran";
  const spare = `The board can wait. ${c.b.core} still has to survive a second reading.`;
  return [
    line(1, "Cold Open", "heated", open(c, q), spare),
    line(2, "First Take", "intrigued", `${c.second} here. I read ${c.b.core} the way I read a front page, which means I separate the verb from the costume. What did they say happened. What could a stranger reproduce. ${c.b.topic} gets that treatment even if the author is someone we like. Liking a post is not reporting.`, spare),
    line(1, "The Push", "skeptical", `The push is simple, ${c.second}. A claim about ${c.b.core} can be interesting and still be a trailer. I want the artifact. A command, a result, a date, a limit. If the public version of ${c.b.topic} has none of those, we say it is a mood with distribution, and we do not upgrade it out of politeness.`, spare),
    line(2, "Scene", "excited", c.world
      ? `The scene is a person halfway down a thread about ${c.b.core}, watching confident replies outrun the original report. The professional move is dull. Quote the report. Mark what was added later. Refuse to let the best sentence become the fact. Threads are a weather system. Weather is not a source.`
      : `The scene is a desk trying the thing the post swore was easy. ${c.b.core} looked finished in the screenshot. On a clean machine it asked for three accounts and a prayer. That gap is the story. Not the author's character. The gap. Listeners live in the gap, not in the screenshot.`, spare),
    line(1, "Page One", "neutral", evidence(
      c,
      `For ${c.b.core}, this is source material, not a verdict. A paragraph can support a clause. It cannot support a crusade.`,
      `I am not going to decorate ${c.b.core} with a citation I did not open. The post, or the lack of one, is the claim. We will talk about what a careful reader can actually check, and we will let the silence stay silence.`,
    ), spare),
    line(2, "What It Means", "intrigued", `What it means for the board is a demotion, and demotions are healthy. ${c.b.topic} moves from news to claim until someone outside the original thread can retrace it. Retraceable work can be celebrated louder, not softer. The volume was never the problem. The missing steps were.`, spare),
    line(1, "What It Does Not Prove", "skeptical", `It does not prove the author is a fraud, and it does not prove the author is a prophet. ${c.b.core} might be early, local, or just badly explained. Those are different stories. This desk collapses them only when we are lazy. We are not going to be lazy on a listener's time.`, spare),
    line(2, "Second Pass", "neutral", secondPass(
      c,
      `Set next to the original claim about ${c.b.core}, I ask which sentence a skeptical reader would underline, and which sentence they would delete.`,
      `The missing piece is a reproduction note. One stranger, one afternoon, one result for ${c.b.core}. Without that note, ${c.b.source} is a doorway into a conversation, and a conversation is not a measurement.`,
    ), spare),
    line(1, "Who Stays", "heated", `Who stays up is the person who believed the post and planned a week around it. They deserve a correction in the same size type as the original excitement. If we discuss ${c.b.topic} and never mention that person, we are doing theater for an audience that will not pay the cost.`, spare),
    line(2, "What I Would Ship", "excited", `If I were the author of ${c.b.core}, I would ship the dull appendix. Steps, limits, and the case where it fails. The witty top can stay. The appendix is what lets a stranger join the work instead of joining a mood. This board is better when the appendix is the point of pride.`, spare),
    line(1, "The Hole", "skeptical", `The hole in demanding an appendix, ${c.second}, is the performance of rigor. People paste logs they do not understand and call it proof. For ${c.b.topic}, a log is proof only if the host can say what would have looked different if the claim were false. Otherwise it is scenery.`, spare),
    line(2, "Caller Intro", "neutral", `Line One, ${c.caller.name} in ${c.caller.location}. They tried to cash the public claim. You are live on ${c.b.stationName}. What happened when you left the thread and touched the thing itself.`, spare),
    line("caller", "Field Report", "heated", c.world
      ? `${c.caller.name}, calling from ${c.caller.location}. On ${c.b.core}, our chat filled with certainty an hour before anyone linked the underlying report. We made one good decision, which was to wait. The cost of waiting was small. The cost of repeating the sharpest reply would have been a lie with our name on it.`
      : `${c.caller.name} in ${c.caller.location}. We gave ${c.b.core} an afternoon because the post made it sound like a coffee break. It was not a coffee break. Two steps were real. The third step was an account we were not willing to open. I do not think the author lied. I think the post forgot our constraints.`, spare),
    line(2, "Caller Hold", "intrigued", `${c.caller.name} just did the job the original post skipped, which is naming a constraint. ${c.b.core} met a real afternoon and came back smaller. Smaller and true is a better front-page story than large and foggy. I want more callers who bring the afternoon, not the slogan.`, spare),
    line(1, "The Unasked", "skeptical", `Unasked question. What would ${c.caller.name} have needed in the first screen to avoid that lost afternoon. If the answer is one sentence, ${c.b.topic} can still be a good claim with a bad edit. If the answer is the entire missing work, the edit is not the scandal. The absence is.`, spare),
    line(2, "The Test", "excited", `Test for the next loud claim about ${c.b.core}. Can a person who did not write it reach one true result before lunch, and can they see one honest failure. Pass both, and this board should cheer. Fail either, and we file it under interesting, which is not an insult. It is a category.`, spare),
    line(1, "Ruling", "neutral", `Ruling. ${c.b.topic} is as large as its reproducible step, and no larger. We can enjoy the writing. We will not let the writing outrun the step. ${c.b.core} gets curiosity immediately and confidence only after a stranger can retrace it. That is the whole policy of this hour.`, spare),
    line(2, "Handoff", "laughing", `If you post about ${c.b.core} after this, add the step that failed. ${c.first} will still be suspicious, which is his job and occasionally mine. The listener's job is easier. Reward the person who showed the miss. They made the next hour shorter for everyone else.`, spare),
    line(1, "Signoff", "neutral", signoff(c), spare),
  ];
}

function money(c: Cast): DeskLine[] {
  const q = c.world
    ? "who is already paying for this, and who is only posting about it"
    : "who writes the check when the miracle needs a person";
  const spare = `Until that check has a name, ${c.b.core} is still a mood with a microphone.`;
  return [
    line(1, "Cold Open", "heated", open(c, q), spare),
    line(2, "First Take", "intrigued", `${c.second} here. I like a bold claim, and I price it while I like it. ${c.b.core} has a buyer, a user, and a person who gets called when it breaks. If ${c.b.topic} cannot point to those three without blushing, it is not a strategy. It is a temperature. Temperatures do not close a quarter.`, spare),
    line(1, "The Push", "skeptical", `Show me the check, not the adjective. Who pays for ${c.b.core} in month thirteen, after the introduction is over. If the answer is a future round, ${c.b.topic} is being kept alive by storytelling. Storytelling is a skill. It is not a balance sheet, and this desk will not pretend that it is.`, spare),
    line(2, "Scene", "excited", c.world
      ? `The scene is a budget meeting the same week as the headline ${c.b.core}. Someone has to move people, fuel, or time. The post does not move them. A named payer does. We can describe the pressure without inventing a figure we did not read. Pressure is enough to ask who is already writing the transfer.`
      : `The scene is a conference room where ${c.b.core} has just been called inevitable. Inevitable is not a line item. I want the power, the people, and the month the invoice arrives. If those three are missing, the room is spending status, and status does not keep the lights on.`, spare),
    line(1, "Page One", "neutral", evidence(
      c,
      `It can support a clause about ${c.b.core}. It cannot support a valuation, and I will not build one out of adjectives.`,
      `No filing and no page I trust, so I will not invent a number for ${c.b.core}. We can still talk about who would have to pay, what they would be buying, and what happens to ${c.b.topic} when that buyer says no. The no is more informative than a fake total.`,
    ), spare),
    line(2, "What It Means", "intrigued", `The meaning is the transfer. ${c.b.topic} matters when money, time, or risk actually moves. If nothing moves except the conversation, we have a salon. Salons are pleasant. They should not be introduced to a listener as a market. A market has a price and a walk-away.`, spare),
    line(1, "What It Does Not Prove", "skeptical", `Attention does not prove solvency. A crowded hour about ${c.b.core} can sit on top of a buyer who has not agreed to return. I have watched that play. The second meeting is quieter and much more honest. We should start closer to the second meeting.`, spare),
    line(2, "Second Pass", "neutral", secondPass(
      c,
      `Beside ${c.b.core}, I ask whether this sentence names a payer, a cost, or only a hope.`,
      `The missing line is the walk-away price. What would make a serious buyer refuse ${c.b.core}. If we cannot say that, we also cannot say why they would accept it. ${c.b.source} does not get to skip the refusal.`,
    ), spare),
    line(1, "Who Stays", "heated", `Who stays is the operator after the announcer has gone to dinner. If ${c.b.topic} succeeds, someone still staffs it. If it fails, someone still explains it. Price that person in from the first sentence or stop calling ${c.b.core} a plan. Plans that forget labor become surprises, and surprises are expensive.`, spare),
    line(2, "What I Would Ship", "excited", `I would fund the boring contract around ${c.b.core} before I funded the spectacle. A buyer, a limit, a person on the hook, and a date when we stop if the date is missed. Spectacle can be the trailer. It cannot be the only asset. Trailers do not pay the electric bill.`, spare),
    line(1, "The Hole", "skeptical", `The hole, ${c.second}, is a cheap no. Some work around ${c.b.topic} is worth doing before a buyer exists, because the cost of waiting is the whole point. I accept that. Then say so. Call it research with a ceiling. Do not call it a market that has not arrived yet.`, spare),
    line(2, "Caller Intro", "neutral", `${c.caller.name} is on the line from ${c.caller.location}, closer to the invoice than we are. You are on ${c.b.stationName}. Tell us who ended up paying, in time or in money, once ${c.b.core} left the announcement.`, spare),
    line("caller", "Field Report", "heated", c.world
      ? `${c.caller.name} in ${c.caller.location}. With ${c.b.core}, the posts were free and the response was not. Staff hours moved the same day. Nobody waited for a perfect figure. The bill was attention, overtime, and a delayed plan. I wish the public version had said that cost out loud.`
      : `${c.caller.name}, ${c.caller.location}. We were pitched ${c.b.core} as a saving. The saving showed up in the slide. The new cost showed up in the schedule, in review time, and in a renewal we had not put in the model. I am not angry. I am precise. The model was incomplete, and incomplete models spend real money.`, spare),
    line(2, "Caller Hold", "intrigued", `${c.caller.name} priced the part the announcement treated as atmosphere. That is the adult version of ${c.b.core}. Atmosphere is free until a calendar breaks. Thank you for putting the calendar on the air. This desk will not round it back into a vibe.`, spare),
    line(1, "The Unasked", "skeptical", `Unasked, and necessary. What is the stop-loss for ${c.b.topic}. The date or the sum where ${c.caller.name}'s side walks away. If that line does not exist, the project is a hope with a corporate card. Hopes are human. Corporate cards need a stop.`, spare),
    line(2, "The Test", "excited", `The test is a one-page bill. Buyer, user, failure person, monthly cost, and the condition that ends ${c.b.core}. If a listener can draft that page after this hour, the hour worked. If the page is still adjectives, we entertained them, and entertainment is a different station.`, spare),
    line(1, "Ruling", "neutral", `Ruling on ${c.b.topic}. Name the payer and the stop before you name the destiny. ${c.b.core} may still be worth doing. Worth doing is a sentence with a cost attached. Destiny is a sentence trying to avoid one. We are in the business of the first sentence.`, spare),
    line(2, "Handoff", "laughing", `Before the next meeting about ${c.b.core}, write the stop-loss in the notes where everyone can see it. ${c.first} will ask for it anyway. Better it comes from you. The listener who does this will sound slower in the room and safer in the quarter, which is the correct exchange.`, spare),
    line(1, "Signoff", "neutral", signoff(c), spare),
  ];
}

const SCRIPTS: Record<string, (c: Cast) => DeskLine[]> = {
  "station-algorithmic-wire": wire,
  "station-kernel-panic": panic,
  "station-hn-live": board,
  "station-sv-confidential": money,
};

export function writeDeskScript(brief: DeskBrief): DeskLine[] {
  const caller = callerFor(brief.seed);
  const cast: Cast = {
    b: brief,
    first: givenName(brief.h1),
    second: givenName(brief.h2),
    caller,
    world: worldBand(brief.band),
    spare: "",
  };
  const write = SCRIPTS[brief.stationId] || wire;
  const lines = brief.live ? writeLiveHour(cast) : voicePacket(write(cast), cast);
  const seen = new Set<string>();
  return lines.filter((row) => {
    const key = row.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function voicePacket(lines: DeskLine[], c: Cast): DeskLine[] {
  const packet = c.b.packet;
  if (!packet) return lines;
  const spare = `We will not add a fact about ${c.b.core} that those pages did not give us.`;
  const sourced = !packet.soften && packet.sources.length >= 2;
  return lines.map((row) => {
    if (row.tag === "Cold Open" && packet.soften) {
      return line(
        row.by,
        row.tag,
        row.emotion,
        row.text.replace(
          "We will argue that all the way through, including the part that does not flatter the idea.",
          "We are holding this as a question, because the pages are not strong enough for a thesis.",
        ),
        spare,
      );
    }
    if (sourced && row.tag === "First Take") {
      return line(2, row.tag, "intrigued", `${c.second} here. I am taking the favorable reading from a page, not from a hunch. ${packet.framings.pro}`, spare);
    }
    if (row.tag === "The Push" && (sourced || packet.sources.length < 2)) {
      return line(1, row.tag, "skeptical", `That reading does not get the hour to itself. ${packet.framings.con}`, spare);
    }
    if (sourced && row.tag === "Scene") {
      return line(2, row.tag, row.emotion, `Here is the concrete piece, and it is only as solid as the page it came from. ${packet.concrete_example}`, spare);
    }
    if (row.tag === "Ruling") {
      const lead = packet.soften
        ? `We are not ready to rule on ${c.b.topic}. The honest close is a question.`
        : `The pages are strong enough for a narrow ruling on ${c.b.topic}.`;
      return line(1, row.tag, "neutral", `${lead} ${packet.open_question}`, spare);
    }
    return row;
  });
}

function pageLine(c: Cast): string {
  if (c.b.fact1) return c.b.fact1;
  return `I do not have a page I would quote under ${c.b.topic}. The public line is the headline, and I will not decorate it.`;
}

function otherLine(c: Cast): string {
  if (c.b.fact2) return c.b.fact2;
  return `There is no second site on ${c.b.topic}. I will not invent the opposing citation.`;
}

function writeLiveHour(c: Cast): DeskLine[] {
  const id = c.b.stationId;
  if (id === "station-kernel-panic") return livePanic(c);
  if (id === "station-hn-live") return liveBoard(c);
  if (id === "station-sv-confidential") return liveMoney(c);
  return liveWire(c);
}

function liveWire(c: Cast): DeskLine[] {
  const story = c.b.topic;
  const spare = `That is the live line on ${c.b.core}, taken from the feed, not from a saved essay.`;
  const page = pageLine(c);
  const other = otherLine(c);
  const scene = c.world
    ? `Picture the night desk with this exact line in front of it: ${story}. What they can confirm is the sentence on the page, read once and then left alone. What they must refuse to confirm is every detail that page left out. The map can wait. The phone does not.`
    : `This just landed where a person on duty can see it: ${story}. The sentence they can stand on is the one the page gave them, and it gets read once. Everything past that sentence is a guess, and a guess does not get a microphone on this desk.`;
  return [
    line(1, "Cold Open", "heated", open(c, c.world ? "what this fresh public line does to a service people are already using" : "what is still true in this fresh public line when someone has to operate it"), spare),
    line(2, "First Take", "intrigued", `${c.second} here. I am reading the claim as it arrived, not as I wish it had arrived. ${story}. If that line is the whole story, we say so. If a page expands it, we read the page and then we stop. I would rather be early and narrow than colorful and wrong.`, spare),
    line(1, "The Push", "skeptical", c.world
      ? `A headline is not a casualty report, ${c.second}. ${story} is words on a feed. I will not invent a number to sound informed. I want the ordinary service that bends if the line is as large as it sounds, and the service that does not bend at all.`
      : `The arrival of ${story} is not the same thing as a system that survived it. I have watched a true headline sit on top of a team that could not point to the failing part. If the people on duty cannot say what changed, they have a rumor with good timing.`, spare),
    line(2, "Scene", "excited", scene, spare),
    line(1, "Page One", "neutral", `${c.first}, I am going to read the page once. ${page} That is the sentence in front of me about ${c.b.core}. It answers one question. It does not become a log because I found it exciting.`, spare),
    line(2, "What It Means", "intrigued", `If I take ${story} seriously, the meaning is the handoff. A person who was not in the room has to be able to repeat the true part and refuse the rest. ${c.b.core} is now a public line. Public lines travel faster than corrections. The correction has to be just as plain.`, spare),
    line(1, "What It Does Not Prove", "skeptical", `And it does not prove the flattering version of ${story}. A clean paragraph is not a quiet night. We owe the listener the limit, said in the same tone as the claim. The limit is whatever ${c.b.source} did not put on the page.`, spare),
    line(2, "Second Pass", "neutral", `Second pass, and it does not exist to decorate the first. ${other} If that fights the first story about ${c.b.core}, I stay with the page I can still find.`, spare),
    line(1, "Who Stays", "heated", `Who stays is the person who has to keep a service up while ${story} is still thin. Name that person before you name the lesson. A feed can be loud and still leave the night shift alone with the work.`, spare),
    line(2, "What I Would Ship", "excited", `What I would ship tonight is a narrower note than the headline. ${c.b.core} gets one sentence a new person can learn, one way to tell the line was wrong, and one way to stop repeating it. The rest can wait for a better page.`, spare),
    line(1, "The Hole", "skeptical", `The hole, ${c.second}, is treating ${story} as finished because it was first. First is a clock. Finished is a page that still says the same thing after the replies. If we skip that wait, we shipped a favor to the loudest feed.`, spare),
    line(2, "Caller Intro", "neutral", `Line One is lit. ${c.caller.name} is calling from ${c.caller.location} about this exact item, ${story}. Go ahead, you are on ${c.b.stationName}. Tell us what you can check. Leave the slogan in the hallway.`, spare),
    line("caller", "Field Report", "heated", `I am ${c.caller.name}, in ${c.caller.location}. We saw ${story} before we had anything we could verify. The useful work was marking what the page said, what it did not say, and which service had to keep running. The loud version traveled faster. The careful one is what we used.`, spare),
    line(2, "Caller Hold", "intrigued", `${c.caller.name} separated the feed from the work, and that is the adult version of ${c.b.core}. Thank you. This desk will not round that back into a vibe.`, spare),
    line(1, "The Unasked", "skeptical", `Unasked, and necessary. When ${story} is wrong halfway, what is the first true sentence the operator can say. Not the lesson. The sentence. If we cannot write it, we are not ready to recommend the item.`, spare),
    line(2, "The Test", "excited", `The test is small and it fits this item. Can a person who missed the first post explain ${c.b.core} from the page alone, and can they stop repeating it if the page changes. If yes, it earned the next hour. If no, it stays a headline.`, spare),
    line(1, "Ruling", "neutral", c.b.fact1
      ? `Ruling on ${story}. We keep the sentence the page gave us, and we do not promote the sentence it did not. ${c.b.core} can be urgent and still be narrow. Narrow is what the listener can reuse without us in the room.`
      : `We are not ready to rule on ${story}. The honest close is a question, because a matching page did not land. What would a second, independent page have to say before this headline is a thesis?`, spare),
    line(2, "Handoff", "laughing", `If you are still here, write the failure sentence for ${c.b.core} before you forward ${story}. ${c.first} and I will still disagree on the pace. We do not disagree on that order.`, spare),
    line(1, "Signoff", "neutral", signoff(c), spare),
  ];
}

function livePanic(c: Cast): DeskLine[] {
  const story = c.b.topic;
  const spare = `Say it in the ungated voice: ${c.b.core} still has to survive after the feed moves on.`;
  const page = pageLine(c);
  const other = otherLine(c);
  return [
    line(1, "Cold Open", "heated", open(c, c.world ? "what still works when this public line is the thing stressing the network" : "what is left of this public line when the vendor cord is pulled"), spare),
    line(2, "First Take", "intrigued", `${c.second} here. ${story} is on the desk because it is live, not because it flatters us. I want the piece a person can still run if the account that posted it goes quiet. If that piece is missing, the item is a rental with a headline.`, spare),
    line(1, "The Push", "skeptical", `Pull the cord and say what remains of ${story}. If the answer is a login page, you were renting the claim. I will not invent a backup you do not have. ${c.b.core} is either operable from here or it is theater.`, spare),
    line(2, "Scene", "excited", c.world
      ? `The failure is the network, and the line on the radio is ${story}. A local note still has to outlast the refresh. The plan is the sentence you can read with the cable on the floor, and that sentence gets one reading, not a remix.`
      : `Unplug the flattering half of ${story} and see what is still in the room. If the claim dies without the vendor, the hour's job is to say you are renting it. Renting can be honest. Pretending it is yours cannot.`, spare),
    line(1, "Page One", "neutral", `Once, and then I stop. ${page} That is the page on ${c.b.core}. It is not a permission slip to add a second outage I did not see.`, spare),
    line(2, "What It Means", "intrigued", `The meaning of ${story} on this station is ownership. Who can switch it off. Who can explain it to a second person without opening a dashboard they do not control. If both answers are a stranger, the item does not belong to the building.`, spare),
    line(1, "What It Does Not Prove", "skeptical", `${story} does not prove you are sovereign because you liked the post. A demo that phones home is still a demo. We say the limit in the same breath as the praise.`, spare),
    line(2, "Second Pass", "neutral", `The other page, if it exists, gets the same cold reading. ${other} Where it does not match ${c.b.core}, we leave the hole visible.`, spare),
    line(1, "Who Stays", "heated", `Who stays is the named person who can still run ${c.b.core} after ${c.b.source} goes quiet. If the answer is nobody, the headline was a shrine.`, spare),
    line(2, "What I Would Ship", "excited", `I would ship the rude version. One offline step for ${story}, explained out loud, timed, and ugly. If it only works while the sponsor is watching, it does not ship from this desk.`, spare),
    line(1, "The Hole", "skeptical", `The hole is applause. ${story} can be clever and still collapse when the cord moves. Clever is not a power source.`, spare),
    line(2, "Caller Intro", "neutral", `${c.caller.name} from ${c.caller.location} has had to live with ${story}, not just repost it. You are on ${c.b.stationName}. What still ran when the easy path stopped.`, spare),
    line("caller", "Field Report", "heated", `I am ${c.caller.name}, in ${c.caller.location}. We tried to keep ${c.b.core} after the comfortable path blinked. The part we could explain kept going. The part that only existed inside someone else's login stopped. We did not need a braver slogan. We needed a switch we could reach.`, spare),
    line(2, "Caller Hold", "intrigued", `${c.caller.name} just priced the cord. That is the ungated version of ${story}. Thank you. We will not sand it back down.`, spare),
    line(1, "The Unasked", "skeptical", `Unasked: what is the stop for ${story}. The hour, the bill, or the outage where you pull it yourself. If that line does not exist, the project is a hope with a socket.`, spare),
    line(2, "The Test", "excited", `The test is one rude run. Take ${c.b.core} off the vendor path and explain it to a second person before the next headline. If you cannot, it goes back to the bench.`, spare),
    line(1, "Ruling", "neutral", c.b.fact1
      ? `Ruling on ${story}. If it dies when the cord is pulled, say you are renting it. The page we read does not get to overrule that test.`
      : `No ruling on ${story}. A page that mentions it did not land, and this desk will not invent one. The question stays open until a person can run the claim without the feed.`, spare),
    line(2, "Handoff", "laughing", `Before you sleep, name the piece of ${c.b.core} that survives the plug, and the piece that dies with ${story}. ${c.first} will pull the cord earlier than I will. The list is the show.`, spare),
    line(1, "Signoff", "neutral", signoff(c), spare),
  ];
}

function liveBoard(c: Cast): DeskLine[] {
  const story = c.b.topic;
  const spare = `Front page only: ${c.b.core} is exactly as large as a stranger can retrace.`;
  const page = pageLine(c);
  const other = otherLine(c);
  return [
    line(1, "Cold Open", "heated", open(c, "what in this public claim a stranger can retrace without joining the thread"), spare),
    line(2, "First Take", "intrigued", `${c.second} here. The board moved, and the item is ${story}. I am not grading the comments. I am asking which sentence a person who missed the thread can still check. If the answer is none, it was a mood.`, spare),
    line(1, "The Push", "skeptical", `A confident title is not a source, ${c.second}. ${story} can be sharp and still be a claim. Show me the step. If the step is behind a login, the public part of this hour is over, and we should say that out loud.`, spare),
    line(2, "Scene", "excited", `A stranger opens the item called ${story} with no context and no friends in the thread. The only fair reading is the page, not the pile-on. If they cannot repeat the page and then stop, the post was atmosphere. Atmosphere is not a step.`, spare),
    line(1, "Page One", "neutral", `Receipt, once. ${page} I am not going to add a benchmark the item did not bring. ${c.b.core} gets the words that are actually there.`, spare),
    line(2, "What It Means", "intrigued", `The meaning on this station is retraceability. ${story} is large if a second person can follow it, and small if they have to trust the author. Small is allowed. Calling it large is the failure.`, spare),
    line(1, "What It Does Not Prove", "skeptical", `It does not prove the replies. Replies are weather. ${story} is the claim. We do not let the weather write the ruling.`, spare),
    line(2, "Second Pass", "neutral", `If another page showed up, here it is, unimproved. ${other} A fight between pages is useful. A fight between moods is a different program.`, spare),
    line(1, "Who Stays", "heated", `Who stays is the reader who can still find ${c.b.core} tomorrow, not the account that posted ${story} first. First is a clock. The page is the work.`, spare),
    line(2, "What I Would Ship", "excited", `I would ship the failure note. What ${story} tried, what a stranger can rerun, and what broke. That note saves the next reader an afternoon. A victory lap does not.`, spare),
    line(1, "The Hole", "skeptical", `The hole is a demo that only runs on the author's machine while the title says ${story} as if it were general. General is a word you earn with a second machine.`, spare),
    line(2, "Caller Intro", "neutral", `${c.caller.name}, ${c.caller.location}, you are on ${c.b.stationName}. You saw ${story} the way a stranger sees it. What could you actually retrace.`, spare),
    line("caller", "Field Report", "heated", `I am ${c.caller.name}, in ${c.caller.location}. I opened ${c.b.core} the way anyone could. The part with a step, I could follow. The part that was only confidence, I could not. I do not need the thread to clap. I need the step to exist tomorrow.`, spare),
    line(2, "Caller Hold", "intrigued", `${c.caller.name} did the stranger's job on ${story}. That is the whole craft of this station. Thank you.`, spare),
    line(1, "The Unasked", "skeptical", `Unasked: what would falsify ${story} by tomorrow morning. If nothing could, it was not a claim. It was a jersey.`, spare),
    line(2, "The Test", "excited", `The test is one clean rerun, by someone who did not write ${c.b.core}, reported without adjectives. Pass, fail, or not public. Those are the only scores this desk prints.`, spare),
    line(1, "Ruling", "neutral", c.b.fact1
      ? `Ruling on ${story}. It is only as large as the step we could read. The rest stays a title until a stranger can retrace it.`
      : `No ruling on ${story}. The title is public and the page is not, and this board will not pretend those are the same thing.`, spare),
    line(2, "Handoff", "laughing", `If you post about ${c.b.core}, post the step that failed too. ${c.first} will ask for it. The listener who includes it will save a stranger an afternoon.`, spare),
    line(1, "Signoff", "neutral", signoff(c), spare),
  ];
}

function liveMoney(c: Cast): DeskLine[] {
  const story = c.b.topic;
  const spare = `Bring it back to the bill: ${c.b.core} is whoever pays when ${story} is no longer a headline.`;
  const page = pageLine(c);
  const other = otherLine(c);
  return [
    line(1, "Cold Open", "heated", open(c, c.world ? "who is already paying, in time or money, while this public line is still unfinished" : "who writes the check when this public line becomes an invoice"), spare),
    line(2, "First Take", "intrigued", `${c.second} here. ${story} arrived as news. I am translating it into a payer, a user, and a person who is called when it breaks. If I cannot name those three, the item is still a mood with a budget somewhere offstage.`, spare),
    line(1, "The Push", "skeptical", `Show me the check, not the destiny. ${story} can be important and still have no buyer. Attention is not solvency. If ${c.b.core} has a cost, the cost gets said on this desk before the applause.`, spare),
    line(2, "Scene", "excited", c.world
      ? `Someone is already on a clock because of ${story}. The headline is free. The response is not. Name the desk that lost the hour before you name the lesson, and let the page be read once when we get there.`
      : `Put ${story} on a one-page bill. Buyer, user, failure person, monthly cost, and the condition that ends the spend. The outside page gets read once into that bill, and it does not get to invent a second price.`, spare),
    line(1, "Page One", "neutral", `The page, once, with the price still in the room. ${page} I will not turn ${c.b.core} into a market it did not claim.`, spare),
    line(2, "What It Means", "intrigued", `The meaning of ${story} here is who eats the downside. A public line with no payer is a gift. A gift can be real. Calling it a business is how people get hurt.`, spare),
    line(1, "What It Does Not Prove", "skeptical", `${story} does not prove a market. It proves that a feed carried a sentence. Markets are invoices. We keep those words apart.`, spare),
    line(2, "Second Pass", "neutral", `The second page does not get to invent a price either. ${other} If neither page names a payer, then ${c.b.core} does not have one yet.`, spare),
    line(1, "Who Stays", "heated", `Who stays is the person who pays after ${story} leaves the front page. The poster can go. The invoice cannot.`, spare),
    line(2, "What I Would Ship", "excited", `I would ship the stop-loss in the same note as the headline. ${c.b.core} gets a number, a date, and a name. No number, no destiny. That is the whole product from this station.`, spare),
    line(1, "The Hole", "skeptical", `The hole is a crowded hour of adjectives around ${story}. Adjectives do not settle. If the page cannot support a bill, we say the page is the whole asset.`, spare),
    line(2, "Caller Intro", "neutral", `${c.caller.name} in ${c.caller.location}, you are on ${c.b.stationName}. You had to pay for something like ${story}, in money or in a ruined afternoon. Tell us which.`, spare),
    line("caller", "Field Report", "heated", `I am ${c.caller.name}, in ${c.caller.location}. ${c.b.core} looked free until it sat on our calendar. The part nobody priced was the part that broke the week. I am not asking for a villain. I am asking for the number to be said before the next one.`, spare),
    line(2, "Caller Hold", "intrigued", `${c.caller.name} priced the part ${story} treated as atmosphere. That is the adult version. Thank you. We will not round it back into a vision.`, spare),
    line(1, "The Unasked", "skeptical", `Unasked: the stop-loss for ${story}. The date or the sum where you walk away. If that line does not exist, it is a hope with a corporate card.`, spare),
    line(2, "The Test", "excited", `The test is a bill a listener can draft after this hour. Buyer, user, failure person, cost, and the end of ${c.b.core}. If the page is still only adjectives, we entertained them, and that is a different station.`, spare),
    line(1, "Ruling", "neutral", c.b.fact1
      ? `Ruling on ${story}. Name the payer and the stop before you name the destiny. The page limits the claim. The missing number limits it further.`
      : `No ruling on ${story}. We have the headline and we do not have a page that mentions it. A check cannot be written from a headline alone.`, spare),
    line(2, "Handoff", "laughing", `Before the next meeting about ${c.b.core}, write the stop under ${story} where everyone can see it. ${c.first} will ask. Better it comes from you.`, spare),
    line(1, "Signoff", "neutral", signoff(c), spare),
  ];
}

export function deskTakeaways(brief: DeskBrief): [string, string, string] {
  if (brief.live) {
    return [
      `${brief.core}: this hour follows the public line.`,
      brief.fact1 ? `A page that mentions it was read once.` : `No matching page landed, so the headline stays a question.`,
      `The next hour takes the next unused public item.`,
    ];
  }
  if (brief.packet?.soften) {
    return [
      brief.packet.open_question,
      `Confidence ${brief.packet.confidence.toFixed(2)}. One domain, or none, is not a thesis.`,
      `Say what the page said. Do not decorate ${brief.core}.`,
    ];
  }
  const world = worldBand(brief.band);
  const core = brief.core;
  if (brief.stationId === "station-kernel-panic") {
    return [
      `${core}: if it dies when the cord is pulled, say you are renting it.`,
      world
        ? `When the network is the failure, the local note outranks the refresh.`
        : `A machine you can unplug still has to be governed by a named person.`,
      `The test is one rude run, offline, explained to a second person.`,
    ];
  }
  if (brief.stationId === "station-hn-live") {
    return [
      `${core} is only as large as the step a stranger can retrace.`,
      `A confident thread is not a source. Quote the report, then stop.`,
      `Reward the failure note. It saves the next reader an afternoon.`,
    ];
  }
  if (brief.stationId === "station-sv-confidential") {
    return [
      `${core} needs a payer, a user, and a person who is called when it breaks.`,
      `Attention is not solvency. Write the stop-loss before the destiny.`,
      world
        ? `The headline is free. The response is already on someone's clock.`
        : `A one-page bill beats a crowded hour of adjectives.`,
    ];
  }
  return [
    `${core}: keep the part a person can operate, and do not promote the meeting.`,
    world
      ? `A headline is not a log. Say what is confirmed, and what must wait.`
      : `The first true failure sentence matters more than the announcement.`,
    `The test is one ordinary day away from the authors.`,
  ];
}
