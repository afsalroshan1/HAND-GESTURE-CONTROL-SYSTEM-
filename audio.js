/**
 * Lumina Audio Engine
 * Real-time sound synthesis via Web Audio API for tactile feedback.
 * Multi-device compatible: supports mobile touch-unlock for iOS Safari and Android Chrome.
 */
class LuminaAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.humGain = null;
    this.humOsc = null;
    this.isUnlocked = false;

    // Mobile touch unlock listener
    this.setupMobileUnlock();
  }

  setupMobileUnlock() {
    const unlock = () => {
      this.init();
      ['touchstart', 'touchend', 'click'].forEach(evt => {
        document.removeEventListener(evt, unlock);
      });
    };

    ['touchstart', 'touchend', 'click'].forEach(evt => {
      document.addEventListener(evt, unlock, { once: true, passive: true });
    });
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.setupWarmHum();
      }
    }
    
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().then(() => {
        this.isUnlocked = true;
      }).catch(() => {});
    } else if (this.ctx && this.ctx.state === 'running') {
      this.isUnlocked = true;
    }
  }

  setupWarmHum() {
    if (!this.ctx) return;
    try {
      this.humOsc = this.ctx.createOscillator();
      this.humOsc.type = 'sine';
      this.humOsc.frequency.setValueAtTime(60, this.ctx.currentTime);

      this.humGain = this.ctx.createGain();
      this.humGain.gain.setValueAtTime(0, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(140, this.ctx.currentTime);

      this.humOsc.connect(filter);
      filter.connect(this.humGain);
      this.humGain.connect(this.ctx.destination);
      this.humOsc.start();
    } catch (e) {
      console.warn('Hum oscillator init failed:', e);
    }
  }

  playSwitchOn() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Mechanical Relay "Click" Snap
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(800, now);
    snapOsc.frequency.exponentialRampToValueAtTime(120, now + 0.04);

    snapGain.gain.setValueAtTime(0.4, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    snapOsc.connect(snapGain);
    snapGain.connect(this.ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.05);

    // 2. Gentle Ascending Power-Up Chime
    const chordNotes = [523.25, 659.25, 783.99]; // C5, E5, G5
    chordNotes.forEach((freq, idx) => {
      const chimeOsc = this.ctx.createOscillator();
      const chimeGain = this.ctx.createGain();
      chimeOsc.type = 'sine';
      chimeOsc.frequency.setValueAtTime(freq, now + idx * 0.02);

      chimeGain.gain.setValueAtTime(0.12, now + idx * 0.02);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.02 + 0.35);

      chimeOsc.connect(chimeGain);
      chimeGain.connect(this.ctx.destination);
      chimeOsc.start(now + idx * 0.02);
      chimeOsc.stop(now + idx * 0.02 + 0.4);
    });

    // 3. Fade in subtle filament hum
    if (this.humGain) {
      this.humGain.gain.cancelScheduledValues(now);
      this.humGain.gain.setValueAtTime(this.humGain.gain.value, now);
      this.humGain.gain.linearRampToValueAtTime(0.035, now + 0.4);
    }
  }

  playSwitchOff() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Mechanical Relay Release Snap
    const snapOsc = this.ctx.createOscillator();
    const snapGain = this.ctx.createGain();
    snapOsc.type = 'triangle';
    snapOsc.frequency.setValueAtTime(650, now);
    snapOsc.frequency.exponentialRampToValueAtTime(80, now + 0.05);

    snapGain.gain.setValueAtTime(0.35, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    snapOsc.connect(snapGain);
    snapGain.connect(this.ctx.destination);
    snapOsc.start(now);
    snapOsc.stop(now + 0.06);

    // 2. Descending Power-Down Tone
    const downOsc = this.ctx.createOscillator();
    const downGain = this.ctx.createGain();
    downOsc.type = 'sine';
    downOsc.frequency.setValueAtTime(392, now); // G4
    downOsc.frequency.exponentialRampToValueAtTime(130, now + 0.25);

    downGain.gain.setValueAtTime(0.15, now);
    downGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

    downOsc.connect(downGain);
    downGain.connect(this.ctx.destination);
    downOsc.start(now);
    downOsc.stop(now + 0.3);

    // 3. Silence warm filament hum
    if (this.humGain) {
      this.humGain.gain.cancelScheduledValues(now);
      this.humGain.gain.setValueAtTime(this.humGain.gain.value, now);
      this.humGain.gain.linearRampToValueAtTime(0, now + 0.15);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted && this.humGain) {
      this.humGain.gain.setValueAtTime(0, this.ctx ? this.ctx.currentTime : 0);
    }
    return this.isMuted;
  }
}

window.luminaAudio = new LuminaAudioEngine();
