/**
 * Dropify Web Audio DSP Pipeline & Hybrid Streaming Engine
 * Reverse-engineered from Echo Music's Media3 AudioProcessor & CustomEqualizer architecture
 * Integrates dual-pipeline HTML5 Web Audio DSP + Zero-latency Client-side YouTube Engine
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

    // Hybrid YouTube Engine State (bypasses serverless & cloud datacenter IP blocks)
    this.ytPlayer = null;
    this.ytPlayerReady = false;
    this.ytInitStarted = false;
    this.pendingVideoId = null;
    this.currentMode = 'audio'; // 'audio' or 'yt'
    this.isYtPlaying = false;
    this.ytPollInterval = null;
    this.currentVolume = 0.85;

    this.setupAudioListeners();
    this.initYouTubePlayer();
  }

  initYouTubePlayer() {
    if (typeof window === 'undefined') return;
    if (this.ytPlayerReady || this.ytInitStarted) return;
    this.ytInitStarted = true;

    // 1. Inject YouTube Iframe API if not already present
    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    // 2. Ensure hidden container exists
    let container = document.getElementById('dropify-yt-embed');
    if (!container) {
      container = document.createElement('div');
      container.id = 'dropify-yt-embed';
      container.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;top:-9999px;opacity:0.001;pointer-events:none;z-index:-1;';
      document.body.appendChild(container);
    }

    const onReadyCallback = () => {
      try {
        this.ytPlayer = new window.YT.Player('dropify-yt-embed', {
          height: '1',
          width: '1',
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            rel: 0,
            playsinline: 1
          },
          events: {
            onReady: () => {
              this.ytPlayerReady = true;
              if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
                this.ytPlayer.setVolume(Math.round(this.currentVolume * 100));
              }
              if (this.pendingVideoId) {
                const vid = this.pendingVideoId;
                this.pendingVideoId = null;
                this.playWithYouTube(vid);
              }
            },
            onStateChange: (event) => {
              if (event.data === window.YT.PlayerState.PLAYING) {
                this.isYtPlaying = true;
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                this.isYtPlaying = false;
              } else if (event.data === window.YT.PlayerState.ENDED) {
                this.isYtPlaying = false;
                if (this.onEndedCallback) {
                  this.onEndedCallback();
                }
              }
            },
            onError: (err) => {
              console.warn('YouTube engine notice:', err);
            }
          }
        });
      } catch (err) {
        console.warn('YT Player instantiate notice:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      onReadyCallback();
    } else {
      window.onYouTubeIframeAPIReady = onReadyCallback;
    }
  }

  playWithYouTube(videoId) {
    this.currentMode = 'yt';

    // Stop HTML5 audio to prevent double playback
    this.primaryAudio.pause();
    this.secondaryAudio.pause();

    if (!this.ytPlayerReady || !this.ytPlayer || typeof this.ytPlayer.loadVideoById !== 'function') {
      this.pendingVideoId = videoId;
      this.initYouTubePlayer();
      return;
    }

    try {
      this.ytPlayer.loadVideoById(videoId);
      this.ytPlayer.playVideo();
      this.isYtPlaying = true;
      this.startPollingYt();
    } catch (e) {
      console.warn('loadVideoById notice:', e);
    }
  }

  startPollingYt() {
    if (this.ytPollInterval) clearInterval(this.ytPollInterval);
    this.ytPollInterval = setInterval(() => {
      if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
        const cur = this.ytPlayer.getCurrentTime() || 0;
        const dur = this.ytPlayer.getDuration() || 0;
        if (dur > 0 && this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback({
            currentTime: cur,
            duration: dur,
            progress: (cur / dur) * 100
          });
        }
      }
    }, 100);
  }

  ensureAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.audioCtx = new AudioContextClass();

      // Master Analyser Node
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.85;

      // Master Gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.audioCtx.currentTime);

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

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  setupStereoWidener(inputNode) {
    this.widenerSplitter = this.audioCtx.createChannelSplitter(2);
    this.widenerMerger = this.audioCtx.createChannelMerger(2);

    const leftInGain = this.audioCtx.createGain();
    const rightInGain = this.audioCtx.createGain();
    leftInGain.gain.value = 0.5;
    rightInGain.gain.value = 0.5;

    this.midGain = this.audioCtx.createGain();
    this.sideGain = this.audioCtx.createGain();
    this.sideGain.gain.setValueAtTime(this.stereoWidth, this.audioCtx.currentTime);

    inputNode.connect(this.widenerSplitter);

    this.widenerSplitter.connect(leftInGain, 0);
    this.widenerSplitter.connect(rightInGain, 1);

    inputNode.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
  }

  setupAudioListeners() {
    const handleTimeUpdate = (audio) => {
      if (this.currentMode === 'audio' && this.getCurrentAudio() === audio && this.onTimeUpdateCallback) {
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
      if (this.currentMode === 'audio' && this.activePlayer === 'primary' && this.onEndedCallback) {
        this.onEndedCallback();
      }
    };

    this.secondaryAudio.onended = () => {
      if (this.currentMode === 'audio' && this.activePlayer === 'secondary' && this.onEndedCallback) {
        this.onEndedCallback();
      }
    };

    this.primaryAudio.onerror = (e) => this.onErrorCallback && this.onErrorCallback(e);
    this.secondaryAudio.onerror = (e) => this.onErrorCallback && this.onErrorCallback(e);
  }

  getCurrentAudio() {
    return this.activePlayer === 'primary' ? this.primaryAudio : this.secondaryAudio;
  }

  getCurrentTime() {
    if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.getCurrentTime === 'function') {
      return this.ytPlayer.getCurrentTime() || 0;
    }
    const curAudio = this.getCurrentAudio();
    return curAudio ? curAudio.currentTime || 0 : 0;
  }

  getIsPlaying() {
    if (this.currentMode === 'yt') {
      return !!this.isYtPlaying;
    }
    const curAudio = this.getCurrentAudio();
    return curAudio ? !curAudio.paused : false;
  }

  getStandbyAudio() {
    return this.activePlayer === 'primary' ? this.secondaryAudio : this.primaryAudio;
  }

  /**
   * Loads and plays a track with optional equal-power crossfade
   * Automatically uses client-side YouTube engine on production deployment to prevent 60s cloud stalls
   */
  async playTrack(streamUrl, shouldCrossfade = false, videoId = null) {
    this.ensureAudioContext();

    // Auto-extract videoId from streamUrl if not explicitly provided
    const match = streamUrl ? streamUrl.match(/\/api\/stream\/([a-zA-Z0-9_-]+)/) : null;
    const resolvedVideoId = videoId || (match ? match[1] : null);

    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    // In production (Vercel / Render), play directly via YouTube Engine for 200ms instant playback
    if (!isLocalhost && resolvedVideoId) {
      this.playWithYouTube(resolvedVideoId);
      return;
    }

    // In local development, try HTML5 streaming with instant fallback to YouTube if it stalls or errors
    let fallbackTriggered = false;
    const triggerFallback = () => {
      if (!fallbackTriggered && resolvedVideoId) {
        fallbackTriggered = true;
        this.playWithYouTube(resolvedVideoId);
      }
    };

    const current = this.getCurrentAudio();
    const timeoutTimer = setTimeout(() => {
      if (current.paused && current.readyState < 2) {
        triggerFallback();
      }
    }, 2500);

    const onPlayingHandler = () => {
      clearTimeout(timeoutTimer);
      current.removeEventListener('playing', onPlayingHandler);
      current.removeEventListener('error', onErrorHandler);
    };

    const onErrorHandler = () => {
      clearTimeout(timeoutTimer);
      current.removeEventListener('playing', onPlayingHandler);
      current.removeEventListener('error', onErrorHandler);
      triggerFallback();
    };

    current.addEventListener('playing', onPlayingHandler);
    current.addEventListener('error', onErrorHandler);

    if (shouldCrossfade && this.crossfadeDuration > 0 && !this.getCurrentAudio().paused && this.currentMode === 'audio') {
      await this.executeCrossfade(streamUrl);
    } else {
      this.currentMode = 'audio';
      current.src = streamUrl;
      current.load();
      try {
        await current.play();
      } catch (err) {
        console.warn('HTML5 Playback error, switching to YouTube engine:', err.message);
        triggerFallback();
      }
    }
  }

  async executeCrossfade(newStreamUrl) {
    this.isCrossfading = true;
    const now = this.audioCtx.currentTime;
    const duration = this.crossfadeDuration;

    const outgoingGain = this.activePlayer === 'primary' ? this.primaryGain : this.secondaryGain;
    const incomingGain = this.activePlayer === 'primary' ? this.secondaryGain : this.primaryGain;
    const outgoingAudio = this.getCurrentAudio();
    const incomingAudio = this.getStandbyAudio();

    incomingAudio.src = newStreamUrl;
    incomingAudio.load();
    await incomingAudio.play();

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
    if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      this.ytPlayer.pauseVideo();
      this.isYtPlaying = false;
      return;
    }
    this.getCurrentAudio().pause();
  }

  async resume() {
    this.ensureAudioContext();
    if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      this.ytPlayer.playVideo();
      this.isYtPlaying = true;
      return;
    }
    return this.getCurrentAudio().play();
  }

  seek(seconds) {
    if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.seekTo === 'function') {
      this.ytPlayer.seekTo(seconds, true);
      return;
    }
    const audio = this.getCurrentAudio();
    if (audio.duration) {
      audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
    }
  }

  setVolume(volume) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.ensureAudioContext();
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      this.ytPlayer.setVolume(Math.round(this.currentVolume * 100));
    }
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.audioCtx.currentTime);
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
    if (this.sideGain && this.audioCtx) {
      this.sideGain.gain.setValueAtTime(this.stereoWidth, this.audioCtx.currentTime);
    }
  }

  getFrequencyData(array) {
    if (this.currentMode === 'yt' && this.isYtPlaying) {
      const t = Date.now() / 150;
      for (let i = 0; i < array.length; i++) {
        const base = Math.sin(t + i * 0.4) * 0.5 + 0.5;
        const bounce = Math.sin(t * 1.8 + i * 0.8) * 0.3;
        array[i] = Math.min(255, Math.max(25, Math.floor((base + bounce) * 220)));
      }
      return;
    }
    if (this.analyser) {
      this.analyser.getByteFrequencyData(array);
    }
  }
}

export const audioManager = new AudioManager();
export default audioManager;
