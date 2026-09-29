export interface Speaker {
  id: string;
  name: string;
  role: 'host-1' | 'host-2' | 'guest' | 'caller';
  title: string;
  avatar: string;
  voicePitch: number;
  voiceRate: number;
  voiceGender: 'male' | 'female';
  personality: string;
}

export interface ScriptSegment {
  id: string;
  speakerId: string;
  speakerName: string;
  text: string;
  timestampMs: number;
  durationMs: number;
  emotion?: 'neutral' | 'skeptical' | 'excited' | 'laughing' | 'heated' | 'intrigued';
  soundEffect?: 'censor-bleep' | 'cough' | 'chuckle' | 'paper-shuffle' | 'groan' | 'snort';
  topicTag?: string;
}

export interface Caller {
  id: string;
  name: string;
  location: string;
  topic: string;
  take: string;
  status: 'on-air' | 'screening' | 'queued' | 'dropped';
  avatar: string;
  durationSeconds?: number;
}

export interface ShowReference {
  title: string;
  url: string;
  type: 'github' | 'hn' | 'paper' | 'news';
}

export interface RadioShow {
  id: string;
  stationId: string;
  title: string;
  episodeNumber: number;
  description: string;
  durationMs: number;
  hosts: Speaker[];
  segments: ScriptSegment[];
  showNotes: string[];
  keyTakeaways: string[];
  references: ShowReference[];
  callers: Caller[];
  ungated: boolean;
  createdAt: string;
}

export interface RadioStation {
  id: string;
  name: string;
  frequency: string;
  genre: string;
  tagline: string;
  hosts: Speaker[];
  currentShowId: string;
  accentColor: string;
  bitrateKbps: number;
}

export interface AudioSettings {
  volume: number;
  playbackRate: number;
  equalizerPreset: 'broadcast-warmth' | 'fm-clarity' | 'vintage-transistor' | 'bypass';
  ungatedMode: boolean;
  autoScrollTranscript: boolean;
}
