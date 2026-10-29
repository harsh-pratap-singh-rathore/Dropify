/**
 * Dropify Web Audio DSP Pipeline & Hybrid Streaming Engine
 * Reverse-engineered directly from Echo Music's Playback Architecture:
 * - PlaybackCutoffGuard: Auto-detects and recovers from premature network/lockscreen stream dropouts
 * - Zero-Failure Hybrid Streaming: Fast HTML5 direct audio + Instant Client-side YouTube Engine fallback
 * - Direct Hardware Sink on Mobile: Immune to Android Chrome Web Audio OS suspension
 * - Web Worker Keepalive: Background-thread timer immune to mobile browser tab suspension
 * - Silent Audio Hardware Loop: Keeps Android AudioFlinger HAL actively engaged
 */

import { PlaybackCutoffGuard } from './PlaybackCutoffGuard';
import { apiUrl } from '../config';
import { applyAutoEqToAudioManager, calculateBassSwapDucking } from './AutoEqParser';

export { AutoEqParser, calculateBassSwapDucking } from './AutoEqParser';

const isMobilePlatform = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
         (navigator.maxTouchPoints > 1 && typeof window !== 'undefined' && window.innerWidth <= 1024);
};

class AudioManager {
  constructor() {
    this.audioCtx = null;
    this.primaryAudio = new Audio();
    this.secondaryAudio = new Audio();

    // Enable crossOrigin = 'anonymous' so Web Audio createMediaElementSource
    // receives genuine audio data without CORS security muting on desktop
    this.primaryAudio.crossOrigin = 'anonymous';
    this.secondaryAudio.crossOrigin = 'anonymous';

    // Mobile Background Playback & Lockscreen Attributes
    this.primaryAudio.playsInline = true;
    this.secondaryAudio.playsInline = true;
    this.primaryAudio.setAttribute('playsinline', 'true');
    this.primaryAudio.setAttribute('webkit-playsinline', 'true');
    this.secondaryAudio.setAttribute('playsinline', 'true');
    this.secondaryAudio.setAttribute('webkit-playsinline', 'true');

    // High performance preload
    this.primaryAudio.preload = 'auto';
    this.secondaryAudio.preload = 'auto';

    // Attach audio elements directly to the DOM to guarantee Android OS process prioritization
    if (typeof document !== 'undefined') {
      const attachNode = (audio, id) => {
        if (!audio) return;
        audio.id = id;
        audio.style.cssText = 'position:fixed;width:1px;height:1px;left:-9999px;opacity:0.001;pointer-events:none;z-index:-1;';
        const mount = () => {
          if (document.body && !document.getElementById(id)) {
            document.body.appendChild(audio);
          }
        };
        if (document.body) {
          mount();
        } else {
          document.addEventListener('DOMContentLoaded', mount);
        }
      };
      attachNode(this.primaryAudio, 'dropify-primary-audio');
      attachNode(this.secondaryAudio, 'dropify-secondary-audio');
    }

    if (typeof window !== 'undefined') {
      window.__dropifyAudioManager = this;
    }

    this.primarySource = null;
    this.secondarySource = null;
    this.primaryDuckFilter = null;
    this.secondaryDuckFilter = null;

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
    this.crossfadeTimeout = null;
    this.bufferTimeout = null;
    this.isEqualizerEnabled = true;

    // Echo Music PlaybackCutoffGuard
    this.cutoffGuard = new PlaybackCutoffGuard(3.5, 3);
    this.currentCanonicalDuration = 0;
    this.currentTrackId = null;
    this.currentStreamUrl = null;
    this.shouldBePlaying = false;

    // State listeners
    this.onTimeUpdateCallback = null;
    this.onEndedCallback = null;
    this.onErrorCallback = null;
    this.onNearingEndCallback = null;

    // Hybrid YouTube Engine State (Zero-latency fallback bypassing datacenter IP blocks)
    this.ytPlayer = null;
    this.ytPlayerReady = false;
    this.ytInitStarted = false;
    this.pendingVideoId = null;
    this.currentMode = 'audio'; // 'audio' or 'yt'
    this.isYtPlaying = false;
    this.ytPollInterval = null;
    this.currentVolume = 0.85;

    this.setupAudioListeners();
    this.setupVisibilityHandler();
    this.setupBackgroundWorker();
    this.initYouTubePlayer();
  }

  /**
   * Dedicated Web Worker keepalive:
   * Background tabs on mobile Android freeze main-thread requestAnimationFrame and throttle setTimeout/setInterval.
   * Web Workers run on isolated OS threads and continue firing intervals, allowing us to actively verify
   * that Android AudioFlinger has not paused the stream.
   */
  setupBackgroundWorker() {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;
    try {
      const workerBlob = new Blob([`
        let keepaliveTimer = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (!keepaliveTimer) {
              keepaliveTimer = setInterval(() => {
                self.postMessage('keepalive_tick');
              }, 1200);
            }
          } else if (e.data === 'stop') {
            if (keepaliveTimer) {
              clearInterval(keepaliveTimer);
              keepaliveTimer = null;
            }
          }
        };
      `], { type: 'application/javascript' });

      const workerBlobUrl = URL.createObjectURL(workerBlob);
      this.keepaliveWorker = new Worker(workerBlobUrl);
      URL.revokeObjectURL(workerBlobUrl);
      this.keepaliveWorker.onmessage = (e) => {
        if (e.data === 'keepalive_tick') {
          this.onBackgroundKeepaliveTick();
        }
      };
      this.keepaliveWorker.postMessage('start');
    } catch (err) {
      console.warn('Dropify Worker keepalive notice:', err);
    }
  }

  onBackgroundKeepaliveTick() {
    if (!this.shouldBePlaying) return;

    if (this.currentMode === 'audio') {
      const cur = this.getCurrentAudio();
      if (cur) {
        if (cur.paused && cur.readyState >= 2) {
          cur.play().catch(() => {});
        }
      }
    } else if (this.currentMode === 'yt' && this.ytPlayer) {
      if (typeof this.ytPlayer.getPlayerState === 'function') {
        const state = this.ytPlayer.getPlayerState();
        if (state === 2) { // PAUSED
          this.ytPlayer.playVideo();
        }
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  setCurrentSongMetadata(song) {
    if (!song) return;
    this.currentSongMetadata = song;
    this.currentCanonicalDuration = Number(song.duration) || 0;
    this.currentTrackId = song.id || null;
    this.cutoffGuard.onTrackChanged(song.id);
  }

  initYouTubePlayer() {
    if (typeof window === 'undefined') return;
    if (this.ytPlayerReady || this.ytInitStarted) return;
    this.ytInitStarted = true;

    if (!document.getElementById('yt-iframe-api')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api';
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }

    let container = document.getElementById('dropify-yt-embed');
    if (!container) {
      container = document.createElement('div');
      container.id = 'dropify-yt-embed';
      container.style.cssText = 'position:fixed;width:1px;height:1px;bottom:0;right:0;opacity:0.01;pointer-events:none;z-index:-10;';
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
                this.shouldBePlaying = true;
                if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
                  try { navigator.mediaSession.playbackState = 'playing'; } catch (_) {}
                }
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                this.isYtPlaying = false;
                if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
                  try { navigator.mediaSession.playbackState = 'paused'; } catch (_) {}
                }
              } else if (event.data === window.YT.PlayerState.ENDED) {
                this.isYtPlaying = false;
                if (this.onEndedCallback) {
                  this.onEndedCallback();
                }
              }
            },
            onError: async (err) => {
              const code = err?.data;
              console.warn('YouTube engine notice code:', code);
              // Error 101 / 150: Video owner does not allow embedding
              // Error 100: Video removed or private
              if ((code === 101 || code === 150 || code === 100) && this.currentSongMetadata && !this._retriedAlternative) {
                this._retriedAlternative = true;
                const meta = this.currentSongMetadata;
                try {
                  const q = encodeURIComponent(`${meta.title} audio`);
                  const res = await fetch(apiUrl(`/api/search?q=${q}`));
                  const results = await res.json();
                  if (Array.isArray(results) && results.length > 0) {
                    const alt = results.find(r => r.id !== meta.id && r.id !== this.pendingVideoId) || results[0];
                    if (alt && alt.id) {
                      console.log('[AudioManager] Auto-recovering from embed restriction with alternative track:', alt.id);
                      this.playWithYouTube(alt.id);
                      return;
                    }
                  }
                } catch (_) {}
              }
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
    this.shouldBePlaying = true;

    // Immediately stop and clear HTML5 audios to prevent dual audio
    try {
      this.primaryAudio.pause();
      this.primaryAudio.currentTime = 0;
      this.primaryAudio.removeAttribute('src');
      this.primaryAudio.load();
      this.secondaryAudio.pause();
      this.secondaryAudio.currentTime = 0;
      this.secondaryAudio.removeAttribute('src');
      this.secondaryAudio.load();
    } catch (_) {}

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
        const dur = this.ytPlayer.getDuration() || this.currentCanonicalDuration || 0;
        if (dur > 0 && this.onTimeUpdateCallback) {
          this.onTimeUpdateCallback({
            currentTime: cur,
            duration: dur,
            progress: (cur / dur) * 100
          });
        }
      }
    }, 120);
  }

  /**
   * Audio Routing Strategy (Inspired by Echo Music's RoutingAudioSink):
   * On Mobile Android / iOS:
   * Direct native HTML5 <audio> output connects straight to Android's AudioTrack hardware.
   * This grants first-class MediaSession foreground service privileges, guaranteeing zero suspension
   * on screen lock.
   * On Desktop PC:
   * createMediaElementSource routes through Web Audio DSP (10-Band EQ, Mid/Side Widener, Analyser).
   */
  ensureAudioContext() {
    if (isMobilePlatform()) {
      return;
    }

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

      // DJ Automix 150 Hz Low-Shelf Bass-Swap Ducking Filters
      // Reverse-engineered from Echo Music's AutomixDuckAudioProcessor.kt
      this.primaryDuckFilter = this.audioCtx.createBiquadFilter();
      this.primaryDuckFilter.type = 'lowshelf';
      this.primaryDuckFilter.frequency.setValueAtTime(150, this.audioCtx.currentTime);
      this.primaryDuckFilter.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

      this.secondaryDuckFilter = this.audioCtx.createBiquadFilter();
      this.secondaryDuckFilter.type = 'lowshelf';
      this.secondaryDuckFilter.frequency.setValueAtTime(150, this.audioCtx.currentTime);
      this.secondaryDuckFilter.gain.setValueAtTime(0.0, this.audioCtx.currentTime);

      // Media Element Sources
      try {
        this.primarySource = this.audioCtx.createMediaElementSource(this.primaryAudio);
        this.secondarySource = this.audioCtx.createMediaElementSource(this.secondaryAudio);

        // Audio Graph: Source -> 150Hz Duck Filter -> Crossfade Gain -> Pre-EQ Mixer
        this.primarySource.connect(this.primaryDuckFilter);
        this.primaryDuckFilter.connect(this.primaryGain);

        this.secondarySource.connect(this.secondaryDuckFilter);
        this.secondaryDuckFilter.connect(this.secondaryGain);

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
      } catch (e) {
        console.warn('AudioContext source connect notice:', e);
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  setupStereoWidener(inputNode) {
    if (!this.audioCtx) return;
    this.widenerSplitter = this.audioCtx.createChannelSplitter(2);
    this.widenerMerger = this.audioCtx.createChannelMerger(2);

    // Mid channel: (L + R) * 0.5
    this.midGain = this.audioCtx.createGain();
    this.midGain.gain.value = 0.5;

    // Side channel: (L - R) * 0.5 * stereoWidth
    this.sideGain = this.audioCtx.createGain();
    this.sideGain.gain.setValueAtTime(this.stereoWidth * 0.5, this.audioCtx.currentTime);

    const rightInvert = this.audioCtx.createGain();
    rightInvert.gain.value = -1.0;

    const sideDiff = this.audioCtx.createGain();
    sideDiff.gain.value = 1.0;

    const sideInvert = this.audioCtx.createGain();
    sideInvert.gain.value = -1.0;

    inputNode.connect(this.widenerSplitter);

    // Mid summing: L + R into midGain
    this.widenerSplitter.connect(this.midGain, 0);
    this.widenerSplitter.connect(this.midGain, 1);

    // Side summing: L (+1) and R (-1) into sideDiff -> sideGain
    this.widenerSplitter.connect(sideDiff, 0);
    this.widenerSplitter.connect(rightInvert, 1);
    rightInvert.connect(sideDiff);
    sideDiff.connect(this.sideGain);

    // Recombine L = Mid + Side, R = Mid - Side
    const leftSum = this.audioCtx.createGain();
    const rightSum = this.audioCtx.createGain();

    this.midGain.connect(leftSum);
    this.sideGain.connect(leftSum);

    this.midGain.connect(rightSum);
    this.sideGain.connect(sideInvert);
    sideInvert.connect(rightSum);

    // Connect into merger channels (0: Left, 1: Right)
    leftSum.connect(this.widenerMerger, 0, 0);
    rightSum.connect(this.widenerMerger, 0, 1);

    this.widenerMerger.connect(this.masterGain);
    this.masterGain.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
  }

  setupVisibilityHandler() {
    if (typeof document === 'undefined') return;
    const handleVis = () => {
      if (this.shouldBePlaying) {
        if (this.currentMode === 'audio') {
          const cur = this.getCurrentAudio();
          if (cur && cur.paused && cur.readyState >= 2) {
            cur.play().catch(() => {});
          }
        } else if (this.currentMode === 'yt' && this.ytPlayer) {
          if (typeof this.ytPlayer.playVideo === 'function') {
            this.ytPlayer.playVideo();
          }
        }

        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
      }
    };

    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('focus', handleVis);
    window.addEventListener('blur', handleVis);
  }

  setupAudioListeners() {
    const handleTimeUpdate = (audio) => {
      if (this.currentMode === 'audio' && this.getCurrentAudio() === audio && this.onTimeUpdateCallback) {
        const cur = audio.currentTime || 0;
        const dur = audio.duration || this.currentCanonicalDuration || 0;
        this.onTimeUpdateCallback({
          currentTime: cur,
          duration: dur,
          progress: dur > 0 ? (cur / dur) * 100 : 0
        });

        // Trigger automix crossfade when approaching track ending
        if (
          this.crossfadeDuration > 0 &&
          dur > 15 &&
          dur - cur <= this.crossfadeDuration &&
          !this.isCrossfading
        ) {
          if (this.onNearingEndCallback) {
            this.onNearingEndCallback();
          }
        }
      }
    };

    const handleEnded = async (audio) => {
      if (this.currentMode !== 'audio') return;
      if (this.getCurrentAudio() !== audio) return;

      const currentPos = audio.currentTime;
      const canonicalDur = this.currentCanonicalDuration;
      const playerDur = audio.duration || -1;

      // Echo Music PlaybackCutoffGuard Verification
      const decision = this.cutoffGuard.verifyTrackCompletion(currentPos, canonicalDur, playerDur);

      if (decision.shouldRecover) {
        console.warn(
          `[Echo PlaybackCutoffGuard] Premature cutoff detected: pos=${currentPos.toFixed(1)}s, canonical=${canonicalDur}s (attempt #${decision.retryAttempt}). Auto-recovering...`
        );
        try {
          if (audio.readyState >= 2) {
            audio.currentTime = decision.resumePosition;
            await audio.play();
            return;
          }
        } catch (_) {}

        if (this.currentStreamUrl) {
          try {
            audio.src = this.currentStreamUrl;
            await new Promise((resolve) => {
              const onReady = () => {
                audio.removeEventListener('loadedmetadata', onReady);
                audio.removeEventListener('canplay', onReady);
                resolve();
              };
              audio.addEventListener('loadedmetadata', onReady, { once: true });
              audio.addEventListener('canplay', onReady, { once: true });
              audio.load();
            });
            audio.currentTime = decision.resumePosition;
            await audio.play();
            return;
          } catch (reloadErr) {
            if (reloadErr.name === 'AbortError') return;
            console.warn('[CutoffGuard] Direct recovery notice:', reloadErr.message);
          }
        }
      }

      // Genuine End of Track reached
      this.shouldBePlaying = false;
      if (this.onEndedCallback) {
        this.onEndedCallback();
      }
    };

    const handleStallOrWaiting = (audio) => {
      if (this.shouldBePlaying && this.getCurrentAudio() === audio) {
        setTimeout(() => {
          if (this.shouldBePlaying && audio.paused && audio.readyState >= 2) {
            audio.play().catch(() => {});
          }
        }, 1000);
      }
    };

    this.primaryAudio.ontimeupdate = () => handleTimeUpdate(this.primaryAudio);
    this.secondaryAudio.ontimeupdate = () => handleTimeUpdate(this.secondaryAudio);

    this.primaryAudio.onended = () => handleEnded(this.primaryAudio);
    this.secondaryAudio.onended = () => handleEnded(this.secondaryAudio);

    this.primaryAudio.onwaiting = () => handleStallOrWaiting(this.primaryAudio);
    this.secondaryAudio.onwaiting = () => handleStallOrWaiting(this.secondaryAudio);

    this.primaryAudio.onerror = (e) => {
      console.warn('Primary audio notice:', e);
      if (this.onErrorCallback) this.onErrorCallback(e);
    };
    this.secondaryAudio.onerror = (e) => {
      console.warn('Secondary audio notice:', e);
      if (this.onErrorCallback) this.onErrorCallback(e);
    };
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

  getDuration() {
    if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.getDuration === 'function') {
      return this.ytPlayer.getDuration() || this.currentCanonicalDuration || 0;
    }
    const curAudio = this.getCurrentAudio();
    return curAudio ? curAudio.duration || this.currentCanonicalDuration || 0 : (this.currentCanonicalDuration || 0);
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
   * Loads and plays a track with zero-failure hybrid architecture:
   * 1. On Android / Mobile: Strictly maintains native HTML5 <audio> streaming directly to Android AudioTrack.
   *    Under NO circumstances promotes mobile devices to YouTube iframe (because Chrome strictly terminates
   *    YouTube iframes when the screen turns off).
   * 2. On Desktop PC: Uses HTML5 direct audio with automated fallback to client-side YouTube engine if network stalls.
   */
  async playTrack(streamUrl, shouldCrossfade = false, videoId = null) {
    // Generation request ID to eliminate stale race conditions and overlapping audio
    this.playRequestId = (this.playRequestId || 0) + 1;
    const requestId = this.playRequestId;
    this._retriedAlternative = false;

    // 1. Immediately silence and stop ANY previous playback
    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try {
        this.ytPlayer.pauseVideo();
      } catch (_) {}
    }
    this.isYtPlaying = false;
    if (this.ytPollInterval) {
      clearInterval(this.ytPollInterval);
      this.ytPollInterval = null;
    }

    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
    if (this.crossfadeTimeout) {
      clearTimeout(this.crossfadeTimeout);
      this.crossfadeTimeout = null;
    }

    // Clean up any listeners from previous playTrack invocation
    if (this._activeCleanup) {
      try { this._activeCleanup(); } catch (_) {}
      this._activeCleanup = null;
    }

    // Immediately silence the standby audio player
    const standbyAudio = this.getStandbyAudio();
    try {
      standbyAudio.pause();
      standbyAudio.currentTime = 0;
      standbyAudio.removeAttribute('src');
      standbyAudio.load();
    } catch (_) {}

    // Immediately pause the current audio player
    const current = this.getCurrentAudio();
    try {
      current.pause();
      current.currentTime = 0;
    } catch (_) {}

    this.resetDuckGains();
    this.currentStreamUrl = streamUrl;
    this.shouldBePlaying = true;
    this.ensureAudioContext();

    const match = streamUrl ? streamUrl.match(/\/api\/stream\/([a-zA-Z0-9_-]+)/) : null;
    const resolvedVideoId = videoId || (match ? match[1] : null);

    const isMobile = isMobilePlatform();

    if (shouldCrossfade && this.crossfadeDuration > 0 && !current.paused && this.currentMode === 'audio' && !isMobile) {
      await this.executeCrossfade(streamUrl);
      return;
    }

    this.currentMode = 'audio';

    let fallbackTriggered = false;
    const triggerFallback = () => {
      if (this.playRequestId !== requestId) return; // Stale request, ignore!
      if (!fallbackTriggered && resolvedVideoId) {
        fallbackTriggered = true;
        console.log(`[AudioManager] Promoting ${isMobile ? 'mobile' : 'desktop'} to client-side YouTube engine for:`, resolvedVideoId);
        this.playWithYouTube(resolvedVideoId);
      }
    };

    // Buffer timeout: if native stream does not buffer within 3s (mobile) / 4s (desktop), fallback to YouTube
    const timeoutMs = isMobile ? 3000 : 4000;
    this.bufferTimeout = setTimeout(() => {
      if (this.playRequestId !== requestId) return;
      if (this.currentMode === 'audio' && current.readyState < 2) {
        triggerFallback();
      }
    }, timeoutMs);

    const onPlayingHandler = () => {
      if (this.playRequestId !== requestId) return;
      if (this.bufferTimeout) {
        clearTimeout(this.bufferTimeout);
        this.bufferTimeout = null;
      }
      current.removeEventListener('playing', onPlayingHandler);
      current.removeEventListener('error', onErrorHandler);
    };

    const onErrorHandler = () => {
      if (this.playRequestId !== requestId) return;
      if (this.bufferTimeout) {
        clearTimeout(this.bufferTimeout);
        this.bufferTimeout = null;
      }
      current.removeEventListener('playing', onPlayingHandler);
      current.removeEventListener('error', onErrorHandler);
      triggerFallback();
    };

    this._activeCleanup = () => {
      current.removeEventListener('playing', onPlayingHandler);
      current.removeEventListener('error', onErrorHandler);
    };

    current.addEventListener('playing', onPlayingHandler);
    current.addEventListener('error', onErrorHandler);

    current.src = streamUrl;
    current.load();

    try {
      await current.play();
      if (this.playRequestId !== requestId) {
        current.pause();
        return;
      }
      if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try { navigator.mediaSession.playbackState = 'playing'; } catch (_) {}
      }
    } catch (err) {
      if (this.playRequestId !== requestId) return;
      if (err.name === 'AbortError') return;
      console.warn('Direct HTML5 play notice, evaluating fallback:', err.message);
      triggerFallback();
    }
  }

  async executeCrossfade(newStreamUrl) {
    if (!this.audioCtx) return;
    this.isCrossfading = true;
    const now = this.audioCtx.currentTime;
    const duration = this.crossfadeDuration;

    const outgoingGain = this.activePlayer === 'primary' ? this.primaryGain : this.secondaryGain;
    const incomingGain = this.activePlayer === 'primary' ? this.secondaryGain : this.primaryGain;
    const outgoingAudio = this.getCurrentAudio();
    const incomingAudio = this.getStandbyAudio();

    const outgoingDuck = this.activePlayer === 'primary' ? this.primaryDuckFilter : this.secondaryDuckFilter;
    const incomingDuck = this.activePlayer === 'primary' ? this.secondaryDuckFilter : this.primaryDuckFilter;

    incomingAudio.src = newStreamUrl;
    incomingAudio.load();
    try {
      await incomingAudio.play();
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('Crossfade incoming play notice:', err.message);
    }

    // Set initial ducking levels: incoming ducked to -18 dB, outgoing at 0 dB
    if (incomingDuck && this.audioCtx) {
      try {
        incomingDuck.gain.cancelScheduledValues(now);
        incomingDuck.gain.setValueAtTime(-18.0, now);
      } catch (_) {}
    }
    if (outgoingDuck && this.audioCtx) {
      try {
        outgoingDuck.gain.cancelScheduledValues(now);
        outgoingDuck.gain.setValueAtTime(0.0, now);
      } catch (_) {}
    }

    const steps = 30;
    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const angle = progress * (Math.PI / 2);
      const outVal = Math.cos(angle);
      const inVal = Math.sin(angle);
      const timeAt = now + progress * duration;

      if (outgoingGain) outgoingGain.gain.setValueAtTime(outVal, timeAt);
      if (incomingGain) incomingGain.gain.setValueAtTime(inVal, timeAt);

      // DJ Automix 150 Hz Low-Shelf Bass-Swap Ducking
      const { outDuckDb, inDuckDb } = calculateBassSwapDucking(progress);
      if (outgoingDuck) outgoingDuck.gain.setValueAtTime(outDuckDb, timeAt);
      if (incomingDuck) incomingDuck.gain.setValueAtTime(inDuckDb, timeAt);
    }

    if (this.crossfadeTimeout) {
      clearTimeout(this.crossfadeTimeout);
    }

    this.crossfadeTimeout = setTimeout(() => {
      outgoingAudio.pause();
      outgoingAudio.currentTime = 0;
      this.activePlayer = this.activePlayer === 'primary' ? 'secondary' : 'primary';
      this.isCrossfading = false;
      this.crossfadeTimeout = null;
      this.resetDuckGains();
    }, duration * 1000);
  }

  resetDuckGains() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    if (this.primaryDuckFilter) {
      try {
        this.primaryDuckFilter.gain.cancelScheduledValues(now);
        this.primaryDuckFilter.gain.setValueAtTime(0.0, now);
      } catch (_) {}
    }
    if (this.secondaryDuckFilter) {
      try {
        this.secondaryDuckFilter.gain.cancelScheduledValues(now);
        this.secondaryDuckFilter.gain.setValueAtTime(0.0, now);
      } catch (_) {}
    }
  }

  startSilentKeepalive() {}
  stopSilentKeepalive() {}

  pause() {
    this.shouldBePlaying = false;
    this.resetDuckGains();
    if (this.bufferTimeout) {
      clearTimeout(this.bufferTimeout);
      this.bufferTimeout = null;
    }
    if (this.crossfadeTimeout) {
      clearTimeout(this.crossfadeTimeout);
      this.crossfadeTimeout = null;
    }
    if (this.ytPollInterval) {
      clearInterval(this.ytPollInterval);
      this.ytPollInterval = null;
    }
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = 'paused'; } catch (_) {}
    }
    if (this.ytPlayer && typeof this.ytPlayer.pauseVideo === 'function') {
      try { this.ytPlayer.pauseVideo(); } catch (_) {}
    }
    this.isYtPlaying = false;
    try { this.primaryAudio.pause(); } catch (_) {}
    try { this.secondaryAudio.pause(); } catch (_) {}
  }

  async resume() {
    this.shouldBePlaying = true;
    this.ensureAudioContext();
    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = 'playing'; } catch (_) {}
    }

    if (this.currentMode === 'yt' && this.ytPlayer && typeof this.ytPlayer.playVideo === 'function') {
      this.ytPlayer.playVideo();
      this.isYtPlaying = true;
      this.startPollingYt();
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
    const target = Math.max(0, seconds);
    audio.currentTime = target;
  }

  setVolume(volume) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.primaryAudio.volume = this.currentVolume;
    this.secondaryAudio.volume = this.currentVolume;

    this.ensureAudioContext();
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.currentVolume, this.audioCtx.currentTime);
    }
    if (this.ytPlayer && typeof this.ytPlayer.setVolume === 'function') {
      this.ytPlayer.setVolume(Math.round(this.currentVolume * 100));
    }
  }

  setEqualizerBand(index, gainDb) {
    this.ensureAudioContext();
    if (this.eqBands[index] && this.isEqualizerEnabled && this.audioCtx) {
      this.eqBands[index].gain.setValueAtTime(gainDb, this.audioCtx.currentTime);
    }
  }

  /**
   * Applies an AutoEQ headphone preset (either raw AutoEQ text or parsed object)
   * into the 10-band equalizer DSP chain using RBJ biquad frequency response math.
   */
  applyAutoEqPreset(presetOrText) {
    this.ensureAudioContext();
    return applyAutoEqToAudioManager(this, presetOrText);
  }

  getEqualizerGains() {
    return this.eqBands.map((band) => (band ? band.gain.value : 0.0));
  }

  resetEqualizer() {
    this.ensureAudioContext();
    this.eqBands.forEach((band) => {
      if (band && this.audioCtx) {
        band.gain.setValueAtTime(0.0, this.audioCtx.currentTime);
      }
    });
  }

  setStereoWidth(width) {
    this.ensureAudioContext();
    this.stereoWidth = Math.max(0, Math.min(2.5, width));
    if (this.sideGain && this.audioCtx) {
      this.sideGain.gain.setValueAtTime(this.stereoWidth * 0.5, this.audioCtx.currentTime);
    }
  }

  getFrequencyData(array) {
    if (isMobilePlatform() || (this.currentMode === 'yt' && this.isYtPlaying)) {
      if (!this.getIsPlaying()) {
        array.fill(0);
        return;
      }
      const t = Date.now() / 140;
      for (let i = 0; i < array.length; i++) {
        const base = Math.sin(t + i * 0.35) * 0.5 + 0.5;
        const bounce = Math.sin(t * 1.7 + i * 0.7) * 0.3;
        const beat = (Math.sin(t * 0.8) > 0.6) ? 0.25 : 0;
        array[i] = Math.min(255, Math.max(25, Math.floor((base + bounce + beat) * 220)));
      }
      return;
    }

    if (this.analyser) {
      this.analyser.getByteFrequencyData(array);
    } else {
      array.fill(0);
    }
  }
}

export const audioManager = new AudioManager();
export default audioManager;
