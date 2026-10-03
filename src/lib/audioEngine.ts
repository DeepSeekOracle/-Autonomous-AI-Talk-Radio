import { ScriptSegment, Speaker } from '../types';
import { pickEnglishVoice } from './voices';
import { chunkSpeech, looksLikeInstruction, normalizeSpoken, speakable } from './speakable';

class RadioAudioEngine {
  private audioCtx: AudioContext | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private presenceFilter: BiquadFilterNode | null = null;
  private highpassFilter: BiquadFilterNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;

  // Speech synthesis state
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPlaying: boolean = false;
  private currentSegmentIndex: number = 0;
  private segments: ScriptSegment[] = [];
  private speakers: Record<string, Speaker> = {};
  private speedMultiplier: number = 1.0;
  private voiceMap: { male: SpeechSynthesisVoice | null; female: SpeechSynthesisVoice | null } = {
    male: null,
    female: null
  };

  // Callbacks
  private onSegmentChange?: (index: number) => void;
  private onPlaybackStateChange?: (isPlaying: boolean) => void;
  private onProgressUpdate?: (currentMs: number, totalMs: number) => void;
  private onShowComplete?: () => void;
  private timerInterval: number | null = null;
  private segmentStartTime: number = 0;
  private accumulatedElapsedMs: number = 0;
  private keepAliveTimer: number | null = null;
  private chunkWatch: number | null = null;
  private speakGen = 0;
  private lastSpokenNorm = "";

  constructor() {
    this.initVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => this.initVoices();
    }
  }

  private initAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();

      // Master Gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(0.9, this.audioCtx.currentTime);

      // Studio Compressor (Classic Broadcast AGC)
      this.compressor = this.audioCtx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-20, this.audioCtx.currentTime);
      this.compressor.knee.setValueAtTime(10, this.audioCtx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.audioCtx.currentTime);
      this.compressor.attack.setValueAtTime(0.005, this.audioCtx.currentTime);
      this.compressor.release.setValueAtTime(0.12, this.audioCtx.currentTime);

      // High-pass filter (sub-rumble cutoff)
      this.highpassFilter = this.audioCtx.createBiquadFilter();
      this.highpassFilter.type = 'highpass';
      this.highpassFilter.frequency.setValueAtTime(80, this.audioCtx.currentTime);

      // Presence filter (FM radio broadcast vocal punch)
      this.presenceFilter = this.audioCtx.createBiquadFilter();
      this.presenceFilter.type = 'peaking';
      this.presenceFilter.frequency.setValueAtTime(2800, this.audioCtx.currentTime);
      this.presenceFilter.Q.setValueAtTime(1.2, this.audioCtx.currentTime);
      this.presenceFilter.gain.setValueAtTime(3.5, this.audioCtx.currentTime);

      // Low-pass filter (FM band limit)
      this.lowpassFilter = this.audioCtx.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.setValueAtTime(13000, this.audioCtx.currentTime);

      // Realtime Analyser for VU meters
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      // Connect nodes
      this.highpassFilter
        .connect(this.presenceFilter)
        .connect(this.compressor)
        .connect(this.lowpassFilter)
        .connect(this.masterGain)
        .connect(this.analyser)
        .connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    return this.audioCtx;
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return;

    const maleVoice = pickEnglishVoice(voices, 'male');
    const femaleVoice = pickEnglishVoice(voices, 'female');
    this.voiceMap = {
      male: maleVoice,
      female: femaleVoice,
    };
  }

  public setCallbacks(options: {
    onSegmentChange?: (index: number) => void;
    onPlaybackStateChange?: (isPlaying: boolean) => void;
    onProgressUpdate?: (currentMs: number, totalMs: number) => void;
    onShowComplete?: () => void;
  }) {
    this.onSegmentChange = options.onSegmentChange;
    this.onPlaybackStateChange = options.onPlaybackStateChange;
    this.onProgressUpdate = options.onProgressUpdate;
    this.onShowComplete = options.onShowComplete;
  }

  public loadShow(segments: ScriptSegment[], speakers: Record<string, Speaker>, startIndex = 0) {
    this.stop();
    this.segments = segments;
    this.speakers = speakers;
    this.lastSpokenNorm = "";
    this.currentSegmentIndex = Math.max(0, Math.min(startIndex, segments.length - 1));
    this.calculateElapsedFromSegment(this.currentSegmentIndex);
  }

  public play() {
    if (!this.segments.length) return;
    this.initAudioContext();
    this.isPlaying = true;
    this.onPlaybackStateChange?.(true);
    this.playSegment(this.currentSegmentIndex);
    this.startProgressTicker();
  }

  public pause() {
    this.isPlaying = false;
    this.speakGen += 1;
    this.stopKeepAlive();
    this.clearChunkWatch();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.stopProgressTicker();
    this.onPlaybackStateChange?.(false);
  }

  public stop() {
    this.isPlaying = false;
    this.speakGen += 1;
    this.stopKeepAlive();
    this.clearChunkWatch();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.stopProgressTicker();
    this.currentSegmentIndex = 0;
    this.accumulatedElapsedMs = 0;
    this.lastSpokenNorm = "";
    this.onPlaybackStateChange?.(false);
    this.onSegmentChange?.(0);
    this.updateProgress();
  }

  public seekToSegment(index: number) {
    const wasPlaying = this.isPlaying;
    this.pause();
    this.currentSegmentIndex = Math.max(0, Math.min(index, this.segments.length - 1));
    this.calculateElapsedFromSegment(this.currentSegmentIndex);
    this.onSegmentChange?.(this.currentSegmentIndex);
    this.updateProgress();
    if (wasPlaying) {
      this.play();
    }
  }

  public setSpeed(multiplier: number) {
    this.speedMultiplier = multiplier;
    if (this.isPlaying) {
      // Re-trigger current segment at new speed
      this.pause();
      this.play();
    }
  }

  public setVolume(vol: number) {
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, vol)), this.audioCtx.currentTime);
    }
  }

  public setEqualizerPreset(preset: 'broadcast-warmth' | 'fm-clarity' | 'vintage-transistor' | 'bypass') {
    if (!this.audioCtx || !this.presenceFilter || !this.highpassFilter || !this.lowpassFilter) return;
    const now = this.audioCtx.currentTime;

    switch (preset) {
      case 'broadcast-warmth':
        this.highpassFilter.frequency.setValueAtTime(90, now);
        this.presenceFilter.frequency.setValueAtTime(2600, now);
        this.presenceFilter.gain.setValueAtTime(4.0, now);
        this.lowpassFilter.frequency.setValueAtTime(14000, now);
        break;
      case 'fm-clarity':
        this.highpassFilter.frequency.setValueAtTime(120, now);
        this.presenceFilter.frequency.setValueAtTime(3400, now);
        this.presenceFilter.gain.setValueAtTime(5.0, now);
        this.lowpassFilter.frequency.setValueAtTime(16000, now);
        break;
      case 'vintage-transistor':
        this.highpassFilter.frequency.setValueAtTime(320, now);
        this.presenceFilter.frequency.setValueAtTime(1800, now);
        this.presenceFilter.gain.setValueAtTime(8.0, now);
        this.lowpassFilter.frequency.setValueAtTime(4500, now);
        break;
      case 'bypass':
        this.highpassFilter.frequency.setValueAtTime(20, now);
        this.presenceFilter.gain.setValueAtTime(0, now);
        this.lowpassFilter.frequency.setValueAtTime(20000, now);
        break;
    }
  }

  private finishShow() {
    this.stopKeepAlive();
    this.stopProgressTicker();
    this.isPlaying = false;
    this.speakGen += 1;
    this.clearChunkWatch();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.onPlaybackStateChange?.(false);
    if (this.onShowComplete) {
      this.onShowComplete();
    } else {
      this.currentSegmentIndex = 0;
      this.accumulatedElapsedMs = 0;
      this.onSegmentChange?.(0);
      this.updateProgress();
    }
  }

  private clearChunkWatch() {
    if (this.chunkWatch !== null) {
      window.clearTimeout(this.chunkWatch);
      this.chunkWatch = null;
    }
  }

  private startKeepAlive() {
    this.stopKeepAlive();
  }

  private stopKeepAlive() {
    if (this.keepAliveTimer !== null) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private playSegment(index: number) {
    if (index >= this.segments.length) {
      this.finishShow();
      return;
    }

    const seg = this.segments[index];
    const spoken = speakable(seg.text);
    const norm = normalizeSpoken(spoken);
    if (!spoken || looksLikeInstruction(spoken) || (norm && norm === this.lastSpokenNorm)) {
      this.playSegment(index + 1);
      return;
    }
    this.lastSpokenNorm = norm;

    this.currentSegmentIndex = index;
    this.onSegmentChange?.(index);
    this.segmentStartTime = Date.now();

    if (seg.soundEffect === 'censor-bleep') {
      this.playCensorBleep();
    } else if (seg.soundEffect === 'cough' || seg.soundEffect === 'chuckle') {
      this.playSubtleStatic(150);
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      const duration = (seg.durationMs || 5000) / this.speedMultiplier;
      setTimeout(() => {
        if (this.isPlaying && this.currentSegmentIndex === index) {
          this.playSegment(index + 1);
        }
      }, duration);
      return;
    }

    const chunks = chunkSpeech(spoken);
    if (!chunks.length) {
      this.playSegment(index + 1);
      return;
    }

    this.startKeepAlive();
    this.speakChunks(chunks, index, 0);
  }

  private speakChunks(chunks: string[], segIndex: number, chunkIndex: number) {
    if (!this.isPlaying) return;
    if (chunkIndex >= chunks.length) {
      this.stopKeepAlive();
      window.setTimeout(() => {
        if (this.isPlaying) this.playSegment(segIndex + 1);
      }, 650 / this.speedMultiplier);
      return;
    }

    const gen = ++this.speakGen;
    this.clearChunkWatch();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    window.setTimeout(() => {
      if (!this.isPlaying || gen !== this.speakGen) return;
      const seg = this.segments[segIndex];
      const speaker = this.speakers[seg?.speakerId];
      const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
      const gender = speaker ? speaker.voiceGender : (segIndex % 2 === 0 ? 'male' : 'female');
      const matchedVoice = gender === 'female' ? this.voiceMap.female : this.voiceMap.male;
      if (matchedVoice) utterance.voice = matchedVoice;
      const neural = /natural|neural|online/i.test(matchedVoice?.name || '');
      const rawPitch = speaker?.voicePitch || 1.0;
      utterance.pitch = neural ? Math.min(1.15, Math.max(0.9, 1 + (rawPitch - 1) * 0.35)) : rawPitch;
      utterance.rate = (speaker?.voiceRate || 1.0) * this.speedMultiplier;

      let moved = false;
      const advance = () => {
        if (moved || !this.isPlaying || gen !== this.speakGen) return;
        moved = true;
        this.clearChunkWatch();
        this.speakChunks(chunks, segIndex, chunkIndex + 1);
      };
      // Chrome often drops onend. The line still has to move, or the hour never changes.
      const words = chunks[chunkIndex].split(/\s+/).length;
      const budget = Math.min(20000, Math.max(7000, (words * 520) / this.speedMultiplier));
      this.chunkWatch = window.setTimeout(() => {
        try { window.speechSynthesis.cancel(); } catch { /* already idle */ }
        advance();
      }, budget);

      utterance.onend = () => advance();
      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        window.setTimeout(() => advance(), 400);
      };

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    }, 90);
  }

  private calculateElapsedFromSegment(index: number) {
    let sum = 0;
    for (let i = 0; i < index && i < this.segments.length; i++) {
      sum += this.segments[i].durationMs || 7000;
    }
    this.accumulatedElapsedMs = sum;
  }

  private getTotalDuration(): number {
    return this.segments.reduce((acc, s) => acc + (s.durationMs || 7000), 0);
  }

  private startProgressTicker() {
    this.stopProgressTicker();
    this.timerInterval = window.setInterval(() => {
      this.updateProgress();
    }, 150);
  }

  private stopProgressTicker() {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private updateProgress() {
    const total = this.getTotalDuration();
    if (!this.isPlaying) {
      this.onProgressUpdate?.(this.accumulatedElapsedMs, total);
      return;
    }
    const currentSeg = this.segments[this.currentSegmentIndex];
    const segElapsed = (Date.now() - this.segmentStartTime) * this.speedMultiplier;
    const currentMs = Math.min(this.accumulatedElapsedMs + segElapsed, total);
    this.onProgressUpdate?.(currentMs, total);
  }

  // --- Analyser data for visualizers ---
  public getVisualizerData(): { frequencyData: Uint8Array; rms: number } {
    if (!this.analyser) {
      // Mock fluctuating visualizer data when active
      const dummy = new Uint8Array(32);
      if (this.isPlaying) {
        for (let i = 0; i < 32; i++) {
          dummy[i] = Math.floor(Math.sin(Date.now() * 0.01 + i) * 60 + 120 + Math.random() * 40);
        }
      }
      return { frequencyData: dummy, rms: this.isPlaying ? 0.65 : 0.05 };
    }

    const buffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    const rms = (sum / buffer.length) / 255;
    return { frequencyData: buffer, rms };
  }

  // --- Sound Effects Synthesizer ---

  public playAirhorn() {
    const ctx = this.initAudioContext();
    const frequencies = [466.16, 466.16 * 1.5, 466.16 * 2]; // Classic Bb airhorn blast chords
    const now = ctx.currentTime;

    frequencies.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.6);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.65);
    });
  }

  public playCensorBleep() {
    const ctx = this.initAudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, now); // Standard 1000Hz television/radio censor tone

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.setValueAtTime(0.18, now + 0.45);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.52);
  }

  public playStaticSweep() {
    const ctx = this.initAudioContext();
    const now = ctx.currentTime;
    const duration = 0.5;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(3500, now + duration * 0.7);
    filter.frequency.exponentialRampToValueAtTime(800, now + duration);
    filter.Q.setValueAtTime(4.0, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  public playNewsChime() {
    const ctx = this.initAudioContext();
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const noteStart = now + idx * 0.12;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.15, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteStart);
      osc.stop(noteStart + 0.65);
    });
  }

  public playTelephoneRing() {
    const ctx = this.initAudioContext();
    const now = ctx.currentTime;
    const freqs = [440, 480]; // US standard ring tone

    freqs.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.setValueAtTime(0.12, now + 0.8);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.85);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.9);
    });
  }

  public playApplause() {
    const ctx = this.initAudioContext();
    const now = ctx.currentTime;
    const duration = 1.2;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Crackle & clapping noise burst envelope
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.85 ? 1.5 : 0.6) * env;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + duration);
  }

  private playSubtleStatic(ms: number) {
    const ctx = this.initAudioContext();
    const now = ctx.currentTime;
    const duration = ms / 1000;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.08;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.connect(ctx.destination);
    noise.start(now);
  }
}

export const audioEngine = new RadioAudioEngine();
