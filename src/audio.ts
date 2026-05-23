// Audio Manager - procedural Web Audio for billiards
export class AudioManager {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  sfxGain: GainNode | null = null;
  musicGain: GainNode | null = null;
  ambientOsc: OscillatorNode | null = null;

  masterVolume: number = 0.7;
  sfxVolume: number = 0.8;
  musicVolume: number = 0.3;

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.startAmbient();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  private startAmbient(): void {
    const ctx = this.ctx!;

    // Deep ambient hum
    this.ambientOsc = ctx.createOscillator();
    this.ambientOsc.type = 'sine';
    this.ambientOsc.frequency.value = 55;
    const ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.05;
    this.ambientOsc.connect(ambientGain);
    ambientGain.connect(this.musicGain!);
    this.ambientOsc.start();

    // Subtle pad
    const pad = ctx.createOscillator();
    pad.type = 'triangle';
    pad.frequency.value = 110;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.02;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 200;
    pad.connect(padFilter);
    padFilter.connect(padGain);
    padGain.connect(this.musicGain!);
    pad.start();

    // Slow LFO on pad
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 20;
    lfo.connect(lfoGain);
    lfoGain.connect(padFilter.frequency);
    lfo.start();
  }

  playBallHit(speed: number): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const vol = Math.min(speed * 0.6, 1.0);

    // Click/clack sound
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800 + speed * 400;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.1);

    // Noise burst for impact
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(vol * 0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.sfxGain!);
    noise.start(now);
  }

  playRailHit(speed: number): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const vol = Math.min(speed * 0.4, 0.6);

    // Thud
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.1);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playPocket(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Satisfying "plonk" + descending tone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.5);

    // Chime
    const chime = ctx.createOscillator();
    chime.type = 'triangle';
    chime.frequency.value = 880;
    const chimeGain = ctx.createGain();
    chimeGain.gain.setValueAtTime(0.2, now + 0.05);
    chimeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    chime.connect(chimeGain);
    chimeGain.connect(this.sfxGain!);
    chime.start(now + 0.05);
    chime.stop(now + 0.35);
  }

  playScratch(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Descending buzz
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  playCueHit(powerRatio: number): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;

    // Sharp tap
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 + powerRatio * 600, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4 + powerRatio * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(gain);
    gain.connect(this.sfxGain!);
    osc.start(now);
    osc.stop(now + 0.08);

    // Woody thud
    const thud = ctx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(200, now);
    thud.frequency.exponentialRampToValueAtTime(80, now + 0.08);
    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.3 * powerRatio, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    thud.connect(thudGain);
    thudGain.connect(this.sfxGain!);
    thud.start(now);
    thud.stop(now + 0.12);
  }

  playGameStart(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.2, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.35);
    });
  }

  playWin(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.15 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.5);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.55);
    });
  }

  playLose(): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const notes = [392, 349, 311, 261]; // G4, F4, Eb4, C4
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.2);
      gain.gain.linearRampToValueAtTime(0.15, now + i * 0.2 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.2 + 0.4);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.2);
      osc.stop(now + i * 0.2 + 0.45);
    });
  }

  setMasterVolume(v: number): void {
    this.masterVolume = v;
    if (this.masterGain) this.masterGain.gain.value = v;
  }

  setSfxVolume(v: number): void {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  setMusicVolume(v: number): void {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }
}
