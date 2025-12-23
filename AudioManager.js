// Simple audio manager with Web Audio API
export class AudioManager {
  constructor() {
    this.context = null;
    this.muted = false;
    this.masterGain = null;
    
    // Initialize audio context on first user interaction
    this.initialized = false;
    
    // Music system
    this.musicGain = null;
    this.musicLayers = {
      bass: null,
      melody: null,
      harmony: null,
      drums: null
    };
    this.musicPlaying = false;
    this.currentWave = 1;
    this.musicMuted = false;
  }
  
  init() {
    if (this.initialized) return;
    
    try {
      this.context = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      
      // Separate gain for music
      this.musicGain = this.context.createGain();
      this.musicGain.gain.value = 0.3; // Background music is quieter
      this.musicGain.connect(this.masterGain);
      
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }
  
  playShoot(weaponType = 'normal') {
    if (!this.initialized || this.muted) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    // Different sounds for different weapons
    switch(weaponType) {
      case 'machinegun':
        // Rapid, low-pitched rattling sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.context.currentTime + 0.03);
        gain.gain.setValueAtTime(0.08, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.03);
        osc.stop(this.context.currentTime + 0.03);
        break;
        
      case 'laser':
        // High-pitched zap sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, this.context.currentTime);
        osc.frequency.linearRampToValueAtTime(1000, this.context.currentTime + 0.02);
        gain.gain.setValueAtTime(0.06, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.02);
        osc.stop(this.context.currentTime + 0.02);
        break;
        
      case 'shotgun':
        // Deep boom sound
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, this.context.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.15);
        osc.stop(this.context.currentTime + 0.15);
        break;
        
      default:
        // Normal pistol sound
        osc.frequency.setValueAtTime(800, this.context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, this.context.currentTime + 0.05);
        gain.gain.setValueAtTime(0.1, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.05);
        osc.stop(this.context.currentTime + 0.05);
        break;
    }
    
    osc.start();
  }
  
  playPowerupPickup() {
    if (!this.initialized || this.muted) return;
    
    // Magical ascending arpeggio
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      
      osc.connect(gain);
      gain.connect(this.masterGain);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.context.currentTime + i * 0.08);
      
      gain.gain.setValueAtTime(0, this.context.currentTime + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, this.context.currentTime + i * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + i * 0.08 + 0.3);
      
      osc.start(this.context.currentTime + i * 0.08);
      osc.stop(this.context.currentTime + i * 0.08 + 0.3);
    });
  }
  
  playHit() {
    if (!this.initialized || this.muted) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(200, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.context.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.15, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.08);
    
    osc.start();
    osc.stop(this.context.currentTime + 0.08);
  }
  
  playEnemyDeath() {
    if (!this.initialized || this.muted) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, this.context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.context.currentTime + 0.2);
    
    gain.gain.setValueAtTime(0.2, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.2);
    
    osc.start();
    osc.stop(this.context.currentTime + 0.2);
  }
  
  playPlayerHit() {
    if (!this.initialized || this.muted) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, this.context.currentTime);
    
    gain.gain.setValueAtTime(0.25, this.context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.3);
    
    osc.start();
    osc.stop(this.context.currentTime + 0.3);
  }
  
  startMusic(wave = 1) {
    if (!this.initialized || this.musicPlaying) return;
    
    this.currentWave = wave;
    this.musicPlaying = true;
    
    // Start with bass layer (always playing)
    this.startBassLine();
    
    // Add melody after wave 2
    if (wave >= 2) {
      this.startMelody();
    }
    
    // Add harmony after wave 5
    if (wave >= 5) {
      this.startHarmony();
    }
    
    // Add drums after wave 3
    if (wave >= 3) {
      this.startDrums();
    }
  }
  
  stopMusic() {
    this.musicPlaying = false;
    
    // Stop all layers
    Object.keys(this.musicLayers).forEach(key => {
      if (this.musicLayers[key]) {
        try {
          this.musicLayers[key].stop();
        } catch (e) {
          // Already stopped
        }
        this.musicLayers[key] = null;
      }
    });
  }
  
  updateMusicIntensity(wave) {
    if (!this.musicPlaying || wave === this.currentWave) return;
    
    this.currentWave = wave;
    
    // Gradually add layers as waves progress
    if (wave >= 2 && !this.musicLayers.melody) {
      this.startMelody();
    }
    
    if (wave >= 3 && !this.musicLayers.drums) {
      this.startDrums();
    }
    
    if (wave >= 5 && !this.musicLayers.harmony) {
      this.startHarmony();
    }
    
    // Increase tempo with higher waves (subtle pitch increase)
    const tempoMultiplier = 1 + (wave - 1) * 0.02; // 2% faster per wave
    
    if (this.musicLayers.bass) {
      this.musicLayers.bass.playbackRate.value = tempoMultiplier;
    }
  }
  
  startBassLine() {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    
    osc.type = 'sawtooth';
    filter.type = 'lowpass';
    filter.frequency.value = 200;
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    
    // Bass pattern (simple repeating pattern)
    const bassTempo = 0.5; // Half second per note
    const pattern = [110, 110, 146.83, 146.83, 110, 110, 146.83, 110]; // A, A, D, D, A, A, D, A
    let noteIndex = 0;
    
    const playBassNote = () => {
      if (!this.musicPlaying) return;
      
      const freq = pattern[noteIndex % pattern.length];
      osc.frequency.setValueAtTime(freq, this.context.currentTime);
      
      gain.gain.setValueAtTime(0.15, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + bassTempo * 0.8);
      
      noteIndex++;
      setTimeout(playBassNote, bassTempo * 1000);
    };
    
    osc.start();
    this.musicLayers.bass = osc;
    playBassNote();
  }
  
  startMelody() {
    if (this.musicLayers.melody) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'square';
    osc.connect(gain);
    gain.connect(this.musicGain);
    
    // Melody pattern (higher octave)
    const melodyTempo = 0.25;
    const pattern = [440, 493.88, 523.25, 493.88, 440, 392, 440, 392]; // A4-B4-C5-B4-A4-G4-A4-G4
    let noteIndex = 0;
    
    const playMelodyNote = () => {
      if (!this.musicPlaying) return;
      
      const freq = pattern[noteIndex % pattern.length];
      osc.frequency.setValueAtTime(freq, this.context.currentTime);
      
      gain.gain.setValueAtTime(0.08, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + melodyTempo * 0.9);
      
      noteIndex++;
      setTimeout(playMelodyNote, melodyTempo * 1000);
    };
    
    osc.start();
    this.musicLayers.melody = osc;
    playMelodyNote();
  }
  
  startHarmony() {
    if (this.musicLayers.harmony) return;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(this.musicGain);
    
    // Harmony pattern (chord tones)
    const harmonyTempo = 1.0;
    const pattern = [220, 293.66, 220, 293.66]; // A3-D4-A3-D4
    let noteIndex = 0;
    
    const playHarmonyNote = () => {
      if (!this.musicPlaying) return;
      
      const freq = pattern[noteIndex % pattern.length];
      osc.frequency.setValueAtTime(freq, this.context.currentTime);
      
      gain.gain.setValueAtTime(0.05, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + harmonyTempo * 0.9);
      
      noteIndex++;
      setTimeout(playHarmonyNote, harmonyTempo * 1000);
    };
    
    osc.start();
    this.musicLayers.harmony = osc;
    playHarmonyNote();
  }
  
  startDrums() {
    if (this.musicLayers.drums) return;
    
    // Drums use noise bursts
    const drumTempo = 0.5;
    
    const playDrum = () => {
      if (!this.musicPlaying) return;
      
      // Kick drum
      const kickOsc = this.context.createOscillator();
      const kickGain = this.context.createGain();
      
      kickOsc.frequency.setValueAtTime(150, this.context.currentTime);
      kickOsc.frequency.exponentialRampToValueAtTime(30, this.context.currentTime + 0.1);
      
      kickGain.gain.setValueAtTime(0.15, this.context.currentTime);
      kickGain.gain.exponentialRampToValueAtTime(0.01, this.context.currentTime + 0.1);
      
      kickOsc.connect(kickGain);
      kickGain.connect(this.musicGain);
      
      kickOsc.start();
      kickOsc.stop(this.context.currentTime + 0.1);
      
      setTimeout(playDrum, drumTempo * 1000);
    };
    
    this.musicLayers.drums = { stop: () => {} }; // Placeholder
    playDrum();
  }
  
  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
  
  toggleMusicMute() {
    this.musicMuted = !this.musicMuted;
    if (this.musicGain) {
      this.musicGain.gain.value = this.musicMuted ? 0 : 0.3;
    }
    return this.musicMuted;
  }
}
