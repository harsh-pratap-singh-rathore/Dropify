/**
 * Dropify Web Audio DSP Pipeline
 * Reverse-engineered from Echo Music's Media3 AudioProcessor & CustomEqualizer architecture
 */

class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.primaryAudio = new Audio();
    this.secondaryAudio = new Audio();
    this.primaryAudio.crossOrigin = 'anonymous';
    this.secondaryAudio.crossOrigin = 'anonymous';

    this.primarySource = null;
    this.secondarySource = null;

    this.eqBands = [];
    this.eqFrequencies = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

    this.masterGain = null;
    this.analyser = null;
    this.primaryGain = null;
    this.secondaryGain = null;

    // Stereo Widener Nodes
    this.widenerSplitter = null;
    this.widenerMerger = null;
    this.midGain = null;
    this.sideGain = null;
    this.stereoWidth = 1.25;
    this.isWidenerEnabled = true;

    this.activePlayer = 'primary'; // 'primary' or 'secondary'
    this.crossfadeDuration = 3.5; // seconds
    this.isCrossfading = false;
    this.isEqualizerEnabled = true;

    // State listeners
    this.onTimeUpdateCallback = null;
    this.onEndedCallback = null;
    this.onErrorCallback = null;

    this.setupAudioListeners();
  }

  ensureAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      // Master Analyser Node
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.85;

      // Master Gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

      // Primary & Secondary Crossfade Gains
      this.primaryGain = this.audioCtx.createGain();
      this.secondaryGain = this.audioCtx.createGain();
      this.primaryGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
      this.secondaryGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

      // Media Element Sources
      this.primarySource = this.audioCtx.createMediaElementSource(this.primaryAudio);
      this.secondarySource = this.audioCtx.createMediaElementSource(this.secondaryAudio);

      this.primarySource.connect(this.primaryGain);
      this.secondarySource.connect(this.secondaryGain);

      // Pre-EQ Mixer
      const preEqMixer = this.audioCtx.createGain();
      this.primaryGain.connect(preEqMixer);
      this.secondaryGain.connect(preEqMixer);

      // Build 10-Band Biquad Filter Parametric Equalizer Chain
      let lastNode = preEqMixer;
      this.eqBands = this.eqFrequencies.map((freq, index) => {
        const filter = this.audioCtx.createBiquadFilter();
        if (index === 0) {
          filter.type = 'lowshelf';
        } else if (index === this.eqFrequencies.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.414;
        }
        filter.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        filter.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

        lastNode.connect(filter);
        lastNode = filter;
        return filter;
      });

      // Build Mid/Side Stereo Widener
      this.setupStereoWidener(lastNode);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  setupStereoWidener(inputNode) {
    // Channel Splitter: Left (0) and Right (1)
    this.widenerSplitter = this.audioCtx.createChannelSplitter(2);
    this.widenerMerger = this.audioCtx.createChannelMerger(2);

    // Sum (Mid) = 0.5 * L + 0.5 * R
    // Diff (Side) = 0.5 * L - 0.5 * R
    const leftInGain = this.audioCtx.createGain();
    const rightInGain = this.audioCtx.createGain();
    leftInGain.gain.value = 0.5;
    rightInGain.gain.value = 0.5;

    this.midGain = this.audioCtx.createGain();
    this.sideGain = this.audioCtx.createGain();
    this.sideGain.gain.setValueAtTime(this.stereoWidth, this.audioCtx.currentTime);

    inputNode.connect(this.widenerSplitter);

    // Direct routing into master gain & analyser
    this.widenerSplitter.connect(leftInGain, 0);
    this.widenerSplitter.connect(rightInGain, 1);

    // For standard output, connect input straight to master
    inputNode.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
  }

  setupAudioListeners() {
    const handleTimeUpdate = (audio) => {
      if (this.getCurrentAudio() === audio && this.onTimeUpdateCallback) {
        this.onTimeUpdateCallback({
          currentTime: audio.currentTime,
          duration: audio.duration || 0,
          progress: audio.duration ? (audio.currentTime / audio.duration) * 100 : 0
        });

        // Trigger automix crossfade when approaching track ending
        if (
          this.crossfadeDuration > 0 &&
          audio.duration &&
          audio.duration - audio.currentTime <= this.crossfadeDuration &&
          !this.isCrossfading &&
          audio.duration > 15
        ) {
          if (this.onNearingEndCallback) {
            this.onNearingEndCallback();
          }
        }
      }
    };

    this.primaryAudio.ontimeupdate = () => handleTimeUpdate(this.primaryAudio);
    this.secondaryAudio.ontimeupdate = () => handleTimeUpdate(this.secondaryAudio);

    this.primaryAudio.onended = () => {
      if (this.activePlayer === 'primary' && this.onEndedCallback) {
        this.onEndedCallback();
      }
    };

    this.secondaryAudio.onended = () => {
      if (this.activePlayer === 'secondary' && this.onEndedCallback) {
        this.onEndedCallback();
      }
    };

    this.primaryAudio.onerror = (e) => this.onErrorCallback && this.onErrorCallback(e);
    this.secondaryAudio.onerror = (e) => this.onErrorCallback && this.onErrorCallback(e);
  }

  getCurrentAudio() {
    return this.activePlayer === 'primary' ? this.primaryAudio : this.secondaryAudio;
  }

  getStandbyAudio() {
    return this.activePlayer === 'primary' ? this.secondaryAudio : this.primaryAudio;
  }

  /**
   * Loads and plays a track with optional equal-power crossfade
   */
  async playTrack(streamUrl, shouldCrossfade = false) {
    this.ensureAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {
        console.warn('AudioContext resume error:', e);
      }
    }

    if (shouldCrossfade && this.crossfadeDuration > 0 && !this.getCurrentAudio().paused) {
      await this.executeCrossfade(streamUrl);
    } else {
      const current = this.getCurrentAudio();
      current.src = streamUrl;
      current.load();
      try {
        await current.play();
      } catch (err) {
        console.warn('Playback autoplay error:', err.message);
      }
    }
  }

  /**
   * Constant acoustic power volume crossfading
   * Outgoing Gain = cos(t * PI / 2)
   * Incoming Gain = sin(t * PI / 2)
   * cos^2 + sin^2 = 1.0 (Zero center volume drop)
   */
  async executeCrossfade(newStreamUrl) {
    this.isCrossfading = true;
    const now = this.audioCtx.currentTime;
    const duration = this.crossfadeDuration;

    const outgoingGain = this.activePlayer === 'primary' ? this.primaryGain : this.secondaryGain;
    const incomingGain = this.activePlayer === 'primary' ? this.secondaryGain : this.primaryGain;
    const outgoingAudio = this.getCurrentAudio();
    const incomingAudio = this.getStandbyAudio();

    // Prepare incoming track
    incomingAudio.src = newStreamUrl;
    incomingAudio.load();
    await incomingAudio.play();

    // Schedule smooth equal-power fade
    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const angle = progress * (Math.PI / 2);
      const outVal = Math.cos(angle);
      const inVal = Math.sin(angle);
      const timeAt = now + progress * duration;

      outgoingGain.gain.setValueAtTime(outVal, timeAt);
      incomingGain.gain.setValueAtTime(inVal, timeAt);
    }

    setTimeout(() => {
      outgoingAudio.pause();
      outgoingAudio.currentTime = 0;
      this.activePlayer = this.activePlayer === 'primary' ? 'secondary' : 'primary';
      this.isCrossfading = false;
    }, duration * 1000);
  }

  pause() {
    this.getCurrentAudio().pause();
  }

  async resume() {
    this.ensureAudioContext();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      try {
        await this.audioCtx.resume();
      } catch (e) {}
    }
    return this.getCurrentAudio().play();
  }

  seek(seconds) {
    const audio = this.getCurrentAudio();
    if (audio.duration) {
      audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
    }
  }

  setVolume(volume) {
    this.ensureAudioContext();
    const clamped = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(clamped, this.audioCtx.currentTime);
    }
  }

  setEqualizerBand(index, gainDb) {
    this.ensureAudioContext();
    if (this.eqBands[index] && this.isEqualizerEnabled) {
      this.eqBands[index].gain.setValueAtTime(gainDb, this.audioCtx.currentTime);
    }
  }

  setStereoWidth(width) {
    this.ensureAudioContext();
    this.stereoWidth = Math.max(0, Math.min(2.5, width));
    if (this.sideGain) {
      this.sideGain.gain.setValueAtTime(this.stereoWidth, this.audioCtx.currentTime);
    }
  }

  getFrequencyData(array) {
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array);
    }
  }
}

export const audioManager = new AudioManager();
export default audioManager;
