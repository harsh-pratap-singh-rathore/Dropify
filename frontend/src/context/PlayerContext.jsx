import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import audioManager from '../audio/AudioManager';
import { apiUrl } from '../config';
import {
  saveDownloadedSong,
  getDownloadedSongs,
  getDownloadedSongAudioUrl,
  deleteDownloadedSong,
  isSongDownloaded
} from '../utils/offlineStorage';

const PlayerContext = createContext();

// Clean YouTube titles & channels into clean song name & primary artist
function cleanSongMeta(rawTitle = '', rawArtist = '') {
  let title = (rawTitle || '').trim();
  let artist = (rawArtist || '').trim();
  title = title.replace(/[\(\[\{【「][^\)\]\}】」]*(?:official|video|music\s+video|audio|lyric|lyrics|visualizer|live|remaster|remastered|4k|hd|prod\.|topic|edit|clip|soundtrack|song|version)[^\)\]\}】」]*[\)\]\}】」]/gi, ' ');
  let pipeArtists = [];
  if (title.includes('|')) {
    const pipeParts = title.split('|').map(p => p.trim()).filter(Boolean);
    title = pipeParts[0];
    pipeArtists = pipeParts.slice(1);
  }
  if (title.includes(' - ')) {
    const parts = title.split(/\s+-\s+/);
    if (parts.length >= 2) {
      const p0 = parts[0].trim();
      const p1 = parts.slice(1).join(' - ').trim();
      const isChannel = /(?:music|records|vevo|t-series|zee|sony|yrf|tips|speed|white|desimelodies|universal|warner|vibe)/i.test(artist);
      if (pipeArtists.length > 0) {
        title = p0;
        const singer = pipeArtists.find(a => /(?:arijit|pritam|shreya|atif|sidhu|diljit|karan|badshah|honey|jubin|armaan|sonu|mohit|neha|sunidhi|kk|anirudh)/i.test(a));
        artist = singer || pipeArtists[pipeArtists.length - 1];
      } else if (isChannel || !artist || artist.toLowerCase() === 'unknown artist') {
        artist = p0;
        title = p1;
      } else if (p0.toLowerCase().includes(artist.toLowerCase())) {
        title = p1;
      } else if (p1.toLowerCase().includes(artist.toLowerCase())) {
        title = p0;
      }
    }
  }
  title = title.replace(/[\(\)\[\]\{\}\|]/g, ' ').replace(/\s+/g, ' ').trim();
  return { title, artist };
}

export function PlayerProvider({ children }) {
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.85);

  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [autoplayEnabled, setAutoplayEnabledState] = useState(() => {
    try {
      const s = localStorage.getItem('dropify_autoplay');
      return s === null ? true : s === 'true';
    } catch (_) {
      return true;
    }
  });

  // Synced Lyrics State
  const [lyricsData, setLyricsData] = useState({ lines: [], synced: false, plain: '' });
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [lyricsOffset, setLyricsOffset] = useState(-2.5);

  // DSP & Equalizer State
  const [isEqOpen, setIsEqOpen] = useState(false);
  const [isEqualizerEnabled, setIsEqualizerEnabled] = useState(true);
  const [eqGains, setEqGains] = useState([2, 3, 1.5, 0, -1, 0.5, 1.5, 2.5, 3, 2]);
  const [stereoWidth, setStereoWidth] = useState(1.25);
  const [isWidenerEnabled, setIsWidenerEnabled] = useState(true);
  const [crossfadeDuration, setCrossfadeDuration] = useState(3.5);
  const [audioQuality, setAudioQualityState] = useState(() => {
    try {
      return localStorage.getItem('dropify_quality') || 'HIGH';
    } catch (_) {
      return 'HIGH';
    }
  });

  // Speed & Pitch State (Varispeed / Tempo)
  const [playbackSpeed, setPlaybackSpeedState] = useState(() => {
    try {
      const s = localStorage.getItem('dropify_speed');
      return s ? parseFloat(s) : 1.0;
    } catch (_) {
      return 1.0;
    }
  });
  const [varispeed, setVarispeedState] = useState(() => {
    try {
      return localStorage.getItem('dropify_varispeed') === 'true';
    } catch (_) {
      return false;
    }
  });
  const [isSpeedModalOpen, setIsSpeedModalOpen] = useState(false);

  // Sleep Timer State
  const [sleepTimer, setSleepTimer] = useState({
    active: false,
    remainingSeconds: 0,
    targetTime: null,
    pauseAtSongEnd: false,
    initialMinutes: 0
  });
  const [isSleepTimerModalOpen, setIsSleepTimerModalOpen] = useState(false);

  // Song DNA State (Genius & Wikipedia Backstory)
  const [isDnaOpen, setIsDnaOpen] = useState(false);
  const [dnaData, setDnaData] = useState(null);
  const [isLoadingDna, setIsLoadingDna] = useState(false);

  // Universal Share State (Song.link / Odesli)
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareSong, setShareSong] = useState(null);

  // Player Theme State (Nothing OS Liquid Glass, Apple Ambient Glow, Turntable, Minimal)
  const [playerTheme, setPlayerThemeState] = useState(() => {
    try {
      return localStorage.getItem('dropify_player_theme') || 'liquid-glass';
    } catch (_) {
      return 'liquid-glass';
    }
  });

  // 4-Mode Theme State (Dark, AMOLED Matte, Light Paper, System Default from Dropify Android)
  const [themeMode, setThemeModeState] = useState(() => {
    try {
      return localStorage.getItem('dropify_theme_mode') || 'dark';
    } catch (_) {
      return 'dark';
    }
  });

  const setThemeMode = (mode) => {
    setThemeModeState(mode);
    try {
      localStorage.setItem('dropify_theme_mode', mode);
    } catch (_) {}
  };

  useEffect(() => {
    const applyTheme = () => {
      let resolved = themeMode;
      if (themeMode === 'system') {
        resolved = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', resolved);
    };
    applyTheme();
    if (themeMode === 'system' && window.matchMedia) {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener('change', applyTheme);
      return () => mql.removeEventListener('change', applyTheme);
    }
  }, [themeMode]);

  // Dropify Android Specific Feature States
  const [sameVibeRadioEnabled, setSameVibeRadioEnabledState] = useState(() => {
    try {
      const val = localStorage.getItem('dropify_same_vibe_radio');
      return val !== null ? val === 'true' : true;
    } catch (_) {
      return true;
    }
  });
  const setSameVibeRadioEnabled = (val) => {
    setSameVibeRadioEnabledState(val);
    try { localStorage.setItem('dropify_same_vibe_radio', String(val)); } catch (_) {}
  };

  const [ambientGlowEnabled, setAmbientGlowEnabledState] = useState(() => {
    try {
      const val = localStorage.getItem('dropify_ambient_glow');
      return val !== null ? val === 'true' : true;
    } catch (_) {
      return true;
    }
  });
  const setAmbientGlowEnabled = (val) => {
    setAmbientGlowEnabledState(val);
    try { localStorage.setItem('dropify_ambient_glow', String(val)); } catch (_) {}
  };

  const [bluetoothDelayMs, setBluetoothDelayMsState] = useState(() => {
    try {
      const val = localStorage.getItem('dropify_bluetooth_delay');
      return val ? parseInt(val, 10) : 0;
    } catch (_) {
      return 0;
    }
  });
  const setBluetoothDelayMs = (val) => {
    setBluetoothDelayMsState(val);
    try { localStorage.setItem('dropify_bluetooth_delay', String(val)); } catch (_) {}
  };

  const clearStreamCache = async () => {
    try {
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(
          cacheKeys.map((key) => {
            if (key.includes('stream') || key.includes('audio-cache') || key.includes('dropify-runtime')) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        );
      }
      return true;
    } catch (e) {
      console.warn('Error clearing stream cache:', e);
      return false;
    }
  };

  // Offline Mode & Downloads State
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [isDownloadingMap, setIsDownloadingMap] = useState({});
  const [isOfflineMode, setIsOfflineModeState] = useState(() => {
    try {
      return localStorage.getItem('dropify_offline_mode') === 'true';
    } catch (_) {
      return false;
    }
  });

  // UI Modals
  const [isFullscreenPlayerOpen, setIsFullscreenPlayerOpen] = useState(false);
  const [isMusicFlowOpen, setIsMusicFlowOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Liked tracks cache
  const [likedSongIds, setLikedSongIds] = useState(new Set());

  // Recently Played tracks with localStorage persistence
  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try {
      const saved = localStorage.getItem('dropify_recently_played');
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const songStartTimeRef = useRef(0);
  const listenedDurationRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const currentSongRef = useRef(currentSong);
  const durationRef = useRef(duration);
  const currentTimeRef = useRef(currentTime);
  const queueRef = useRef(queue);
  const queueIndexRef = useRef(queueIndex);
  const isPreArmingRef = useRef(false);
  const playNextRef = useRef();
  const playPreviousRef = useRef();
  const seekToRef = useRef();
  const togglePlayPauseRef = useRef();
  const sleepTimerRef = useRef(sleepTimer);

  isPlayingRef.current = isPlaying;
  currentSongRef.current = currentSong;
  durationRef.current = duration;
  currentTimeRef.current = currentTime;
  queueRef.current = queue;
  queueIndexRef.current = queueIndex;
  sleepTimerRef.current = sleepTimer;

  // Initialize offline downloads list
  useEffect(() => {
    getDownloadedSongs().then((list) => setDownloadedSongs(list)).catch(() => {});
  }, []);

  // Fetch initial library and preferences
  useEffect(() => {
    fetch(apiUrl('/api/library'))
      .then((res) => res.json())
      .then((lib) => {
        if (lib && Array.isArray(lib.likedSongs)) {
          setLikedSongIds(new Set(lib.likedSongs.map((s) => s.id)));
        }
      })
      .catch((err) => console.warn('Could not load library cache:', err));

    fetch(apiUrl('/api/preferences'))
      .then((res) => res.json())
      .then((prefs) => {
        if (prefs) {
          if (Array.isArray(prefs.eqBands)) {
            const numericBands = prefs.eqBands.map((band) => {
              const val = typeof band === 'object' && band !== null ? band.gain : band;
              const num = Number(val);
              return Number.isFinite(num) ? num : 0;
            });
            setEqGains(numericBands);
            numericBands.forEach((gain, i) => audioManager.setEqualizerBand(i, gain));
          }
          if (typeof prefs.stereoWidth === 'number' && Number.isFinite(prefs.stereoWidth)) {
            setStereoWidth(prefs.stereoWidth);
            audioManager.setStereoWidth(prefs.stereoWidth);
          }
          if (typeof prefs.crossfadeDuration === 'number' && Number.isFinite(prefs.crossfadeDuration)) {
            setCrossfadeDuration(prefs.crossfadeDuration);
            audioManager.setCrossfadeDuration(prefs.crossfadeDuration);
          }
          if (prefs.audioQuality) {
            setAudioQualityState(prefs.audioQuality);
          }
        }
      })
      .catch((err) => console.warn('Could not load preferences cache:', err));
  }, []);

  // Sync Audio Listeners
  useEffect(() => {
    audioManager.onTimeUpdateCallback = (time, dur) => {
      setCurrentTime(time);
      if (dur > 0) {
        setDuration(dur);
        setProgress((time / dur) * 100);
      }
      listenedDurationRef.current = time;

      // Update active synced lyric line
      if (lyricsData.lines && lyricsData.lines.length > 0) {
        const adjustedTime = Math.max(0, time + lyricsOffset);
        let index = -1;
        for (let i = 0; i < lyricsData.lines.length; i++) {
          if (adjustedTime >= lyricsData.lines[i].time) {
            index = i;
          } else {
            break;
          }
        }
        setActiveLyricIndex(index);
      }
    };

    audioManager.onEndedCallback = () => {
      handleSongEnded();
    };

    audioManager.onNearingEndCallback = () => {
      if (!autoplayEnabled) return;
      const q = queueRef.current || [];
      const qIdx = queueIndexRef.current || 0;
      const cur = currentSongRef.current;
      if (qIdx + 1 >= q.length && cur && cur.id && !isPreArmingRef.current) {
        isPreArmingRef.current = true;
        fetch(apiUrl(`/api/song/${cur.id}`))
          .then((res) => res.json())
          .then((details) => {
            if (details.related && details.related.length > 0) {
              setQueue((prev) => {
                const existingIds = new Set(prev.map((s) => s.id));
                const newTracks = details.related.filter((r) => !existingIds.has(r.id));
                return [...prev, ...newTracks];
              });
            }
          })
          .catch(() => {})
          .finally(() => {
            isPreArmingRef.current = false;
          });
      }
    };
  }, [lyricsData, queue, queueIndex, lyricsOffset, autoplayEnabled]);

  // High-precision 60fps lyric synchronization ticker
  useEffect(() => {
    let animId;
    if ((isFullscreenPlayerOpen || isMusicFlowOpen) && lyricsData?.lines?.length > 0) {
      const syncTicker = () => {
        if (audioManager.getIsPlaying() && lyricsData?.lines?.length > 0) {
          const t = audioManager.getCurrentTime();
          const adjustedTime = Math.max(0, t + lyricsOffset);
          let index = -1;
          for (let i = 0; i < lyricsData.lines.length; i++) {
            if (adjustedTime >= lyricsData.lines[i].time) {
              index = i;
            } else {
              break;
            }
          }
          setActiveLyricIndex((prev) => (prev !== index ? index : prev));
        }
        animId = requestAnimationFrame(syncTicker);
      };
      animId = requestAnimationFrame(syncTicker);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isFullscreenPlayerOpen, isMusicFlowOpen, lyricsData, lyricsOffset]);

  // Load lyrics when song changes
  useEffect(() => {
    if (!currentSong) return;
    const requestedSongId = currentSong.id;
    setIsLoadingLyrics(true);
    setLyricsData({ lines: [], synced: false, plain: '' });
    setActiveLyricIndex(-1);

    const { title: cleanTitle, artist: cleanArtist } = cleanSongMeta(currentSong.title, currentSong.artist);
    const queryParams = new URLSearchParams({
      title: cleanTitle,
      artist: cleanArtist,
      duration: currentSong.duration || ''
    }).toString();

    fetch(apiUrl(`/api/lyrics/${currentSong.id}?${queryParams}`))
      .then((res) => res.json())
      .then((data) => {
        if (currentSongRef.current?.id === requestedSongId) {
          setLyricsData(data);
          setIsLoadingLyrics(false);
        }
      })
      .catch((err) => {
        console.error('Lyrics fetch error:', err);
        if (currentSongRef.current?.id === requestedSongId) {
          setIsLoadingLyrics(false);
        }
      });
  }, [currentSong?.id]);

  // Sleep Timer Countdown Ticker
  useEffect(() => {
    if (!sleepTimer.active || sleepTimer.pauseAtSongEnd || !sleepTimer.targetTime) return;

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.round((sleepTimer.targetTime - Date.now()) / 1000));
      if (diff <= 0) {
        clearInterval(interval);
        // Fade out volume smoothly over 2.5s and pause
        const currentVol = audioManager.currentVolume || 0.85;
        const steps = 15;
        let step = 0;
        const fadeInterval = setInterval(() => {
          step++;
          audioManager.setVolume(Math.max(0, currentVol * (1 - step / steps)));
          if (step >= steps) {
            clearInterval(fadeInterval);
            audioManager.pause();
            setIsPlaying(false);
            audioManager.setVolume(currentVol);
            clearSleepTimer();
          }
        }, 150);
      } else {
        setSleepTimer((prev) => ({ ...prev, remainingSeconds: diff }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer.active, sleepTimer.targetTime, sleepTimer.pauseAtSongEnd]);

  // MediaSession API Integration
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!currentSong) return;

    const artworkList = [];
    if (currentSong.thumbnail) {
      artworkList.push({ src: currentSong.thumbnail, sizes: '300x300', type: 'image/jpeg' });
    }
    if (currentSong.thumbnailHigh) {
      artworkList.push({ src: currentSong.thumbnailHigh, sizes: '600x600', type: 'image/jpeg' });
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist || 'Dropify',
      album: currentSong.album || 'Dropify Music',
      artwork: artworkList
    });

    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (_) {}

    navigator.mediaSession.setActionHandler('play', () => {
      if (togglePlayPauseRef.current) togglePlayPauseRef.current();
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      if (togglePlayPauseRef.current) togglePlayPauseRef.current();
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (playNextRef.current) playNextRef.current(true);
    });
    navigator.mediaSession.setActionHandler('previoustrack', () => {
      if (playPreviousRef.current) playPreviousRef.current();
    });
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined && durationRef.current > 0 && seekToRef.current) {
        seekToRef.current((details.seekTime / durationRef.current) * 100);
      }
    });
    navigator.mediaSession.setActionHandler('seekbackward', (details) => {
      const offset = details.seekOffset || 10;
      const d = durationRef.current;
      const cur = currentTimeRef.current;
      if (d > 0 && seekToRef.current) {
        seekToRef.current(Math.max(0, ((cur - offset) / d) * 100));
      }
    });
    navigator.mediaSession.setActionHandler('seekforward', (details) => {
      const offset = details.seekOffset || 10;
      const d = durationRef.current;
      const cur = currentTimeRef.current;
      if (d > 0 && seekToRef.current) {
        seekToRef.current(Math.min(100, ((cur + offset) / d) * 100));
      }
    });
  }, [currentSong?.id, isPlaying]);

  // Desktop Electron Native Controls & Tray/Discord Sync
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;

    if (window.electronAPI.updatePlaybackState) {
      window.electronAPI.updatePlaybackState({
        isPlaying,
        currentSong,
        currentTime,
        duration
      });
    }
  }, [isPlaying, currentSong?.id, currentTime, duration]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.onMediaAction) return;

    const cleanup = window.electronAPI.onMediaAction((action) => {
      switch (action) {
        case 'play-pause':
          if (togglePlayPauseRef.current) togglePlayPauseRef.current();
          break;
        case 'next':
        case 'next-track':
          if (playNextRef.current) playNextRef.current(true);
          break;
        case 'prev':
        case 'prev-track':
        case 'previous':
          if (playPreviousRef.current) playPreviousRef.current();
          break;
        default:
          break;
      }
    });

    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  const recordStats = (skipped = false) => {
    if (!currentSong) return;
    const listened = listenedDurationRef.current || 0;
    fetch(apiUrl('/api/taste/record'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackId: currentSong.id,
        title: currentSong.title,
        artist: currentSong.artist,
        listenedMs: listened,
        durationMs: (duration || 0) * 1000,
        skipped
      })
    }).catch(() => {});
  };

  const playSong = async (song, newQueue = null, index = null) => {
    if (currentSong && currentSong.id !== song.id) {
      recordStats(currentTime < 15);
    }

    if (newQueue && Array.isArray(newQueue)) {
      setQueue(newQueue);
      const songIdx = newQueue.findIndex((s) => s.id === song.id);
      setQueueIndex(songIdx >= 0 ? songIdx : (index !== null ? index : 0));
    } else if (index !== null) {
      setQueueIndex(index);
    }

    audioManager.setCurrentSongMetadata(song);
    songStartTimeRef.current = Date.now();
    listenedDurationRef.current = 0;
    setCurrentTime(0);
    setProgress(0);
    setCurrentSong(song);

    // Save to Recently Played
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((s) => s.id !== song.id);
      const updated = [song, ...filtered].slice(0, 30);
      try {
        localStorage.setItem('dropify_recently_played', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    // Check if song is downloaded for offline playback
    const offlineData = await getDownloadedSongAudioUrl(song.id);
    if (offlineData && offlineData.url) {
      await audioManager.playTrack(offlineData.url, false, song.id);
      if (offlineData.lyrics) {
        setLyricsData(offlineData.lyrics);
      }
      setIsPlaying(true);
      return;
    }

    if (isOfflineMode) {
      alert(`"${song.title}" is not downloaded for offline playback. Turn off Offline Mode or download it first.`);
      return;
    }

    const qualityParam = audioQuality ? `?quality=${audioQuality.toLowerCase()}` : '';
    const streamUrl = apiUrl(`/api/stream/${song.id}${qualityParam}`);
    await audioManager.playTrack(streamUrl, false, song.id);
    setIsPlaying(true);
  };

  const togglePlayPause = async () => {
    if (!currentSong) return;
    if (isPlaying) {
      audioManager.pause();
      setIsPlaying(false);
    } else {
      await audioManager.resume();
      setIsPlaying(true);
    }
  };

  const handleSongEnded = () => {
    recordStats(false);

    // Sleep Timer "Pause when current song ends"
    if (sleepTimerRef.current?.active && sleepTimerRef.current?.pauseAtSongEnd) {
      audioManager.pause();
      setIsPlaying(false);
      clearSleepTimer();
      return;
    }

    playNext(true);
  };

  const playNext = async (withCrossfade = false) => {
    const q = queueRef.current || [];
    const qIdx = queueIndexRef.current || 0;
    if (qIdx + 1 < q.length) {
      const nextIndex = qIdx + 1;
      setQueueIndex(nextIndex);
      const nextSong = q[nextIndex];
      setCurrentSong(nextSong);
      audioManager.setCurrentSongMetadata(nextSong);
      setCurrentTime(0);
      setProgress(0);

      // Check offline audio
      const offlineData = await getDownloadedSongAudioUrl(nextSong.id);
      if (offlineData && offlineData.url) {
        audioManager.playTrack(offlineData.url, withCrossfade, nextSong.id);
        if (offlineData.lyrics) setLyricsData(offlineData.lyrics);
      } else {
        const qualityParam = audioQuality ? `?quality=${audioQuality.toLowerCase()}` : '';
        const streamUrl = apiUrl(`/api/stream/${nextSong.id}${qualityParam}`);
        audioManager.playTrack(streamUrl, withCrossfade, nextSong.id);
      }
      setIsPlaying(true);
    } else if (currentSong && autoplayEnabled && !isOfflineMode) {
      // Auto-Radio: fetch related recommendations
      fetch(apiUrl(`/api/song/${currentSong.id}`))
        .then((res) => res.json())
        .then((details) => {
          if (details && details.related && details.related.length > 0) {
            const nextTrack = details.related[0];
            const remainingTracks = details.related.slice(1);
            setQueue((prev) => [...prev, nextTrack, ...remainingTracks]);
            setQueueIndex((prev) => prev + 1);
            setCurrentSong(nextTrack);
            audioManager.setCurrentSongMetadata(nextTrack);
            setCurrentTime(0);
            setProgress(0);
            const qualityParam = audioQuality ? `?quality=${audioQuality.toLowerCase()}` : '';
            const streamUrl = apiUrl(`/api/stream/${nextTrack.id}${qualityParam}`);
            audioManager.playTrack(streamUrl, withCrossfade, nextTrack.id);
            setIsPlaying(true);
          }
        })
        .catch(() => {});
    }
  };

  const playPrevious = async () => {
    if (currentTime > 4) {
      audioManager.seek(0);
      setCurrentTime(0);
      setProgress(0);
    } else if (queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      setQueueIndex(prevIndex);
      const prevSong = queue[prevIndex];
      setCurrentSong(prevSong);
      audioManager.setCurrentSongMetadata(prevSong);
      setCurrentTime(0);
      setProgress(0);

      const offlineData = await getDownloadedSongAudioUrl(prevSong.id);
      if (offlineData && offlineData.url) {
        audioManager.playTrack(offlineData.url, false, prevSong.id);
        if (offlineData.lyrics) setLyricsData(offlineData.lyrics);
      } else {
        const qualityParam = audioQuality ? `?quality=${audioQuality.toLowerCase()}` : '';
        const streamUrl = apiUrl(`/api/stream/${prevSong.id}${qualityParam}`);
        audioManager.playTrack(streamUrl, false, prevSong.id);
      }
      setIsPlaying(true);
    }
  };

  const seekTo = (percent) => {
    if (duration > 0) {
      const targetTime = (percent / 100) * duration;
      audioManager.seek(targetTime);
      setCurrentTime(targetTime);
      setProgress(percent);
    }
  };

  // Speed and Pitch control
  const setPlaybackSpeed = (speed) => {
    const s = Math.max(0.25, Math.min(2.5, Number(speed) || 1.0));
    setPlaybackSpeedState(s);
    try {
      localStorage.setItem('dropify_speed', String(s));
    } catch (_) {}
    audioManager.setPlaybackSpeed(s, !varispeed);
  };

  const setVarispeed = (val) => {
    const v = Boolean(val);
    setVarispeedState(v);
    try {
      localStorage.setItem('dropify_varispeed', String(v));
    } catch (_) {}
    audioManager.setPlaybackSpeed(playbackSpeed, !v);
  };

  // Sleep Timer control
  const startSleepTimer = (minutes) => {
    if (minutes === -1) {
      setSleepTimer({
        active: true,
        remainingSeconds: 0,
        targetTime: null,
        pauseAtSongEnd: true,
        initialMinutes: -1
      });
    } else {
      const seconds = minutes * 60;
      setSleepTimer({
        active: true,
        remainingSeconds: seconds,
        targetTime: Date.now() + seconds * 1000,
        pauseAtSongEnd: false,
        initialMinutes: minutes
      });
    }
  };

  const clearSleepTimer = () => {
    setSleepTimer({
      active: false,
      remainingSeconds: 0,
      targetTime: null,
      pauseAtSongEnd: false,
      initialMinutes: 0
    });
  };

  // Queue Management actions
  const addToQueue = (song) => {
    if (!song) return;
    setQueue((prev) => {
      if (prev.some((s) => s.id === song.id)) return prev;
      return [...prev, song];
    });
  };

  const playNextInQueue = (song) => {
    if (!song) return;
    setQueue((prev) => {
      const nextQueue = prev.filter((s) => s.id !== song.id);
      const insertAt = Math.min(nextQueue.length, queueIndex + 1);
      nextQueue.splice(insertAt, 0, song);
      return nextQueue;
    });
  };

  const removeFromQueue = (indexToRemove) => {
    setQueue((prev) => {
      const nextQueue = prev.filter((_, idx) => idx !== indexToRemove);
      if (indexToRemove < queueIndex) {
        setQueueIndex((q) => Math.max(0, q - 1));
      } else if (indexToRemove === queueIndex) {
        if (nextQueue.length > 0) {
          const nextIdx = Math.min(queueIndex, nextQueue.length - 1);
          playSong(nextQueue[nextIdx], nextQueue, nextIdx);
        } else {
          audioManager.pause();
          setIsPlaying(false);
          setCurrentSong(null);
        }
      }
      return nextQueue;
    });
  };

  const reorderQueue = (fromIdx, toIdx) => {
    setQueue((prev) => {
      const nextQueue = [...prev];
      const [moved] = nextQueue.splice(fromIdx, 1);
      nextQueue.splice(toIdx, 0, moved);
      if (queueIndex === fromIdx) {
        setQueueIndex(toIdx);
      } else if (fromIdx < queueIndex && toIdx >= queueIndex) {
        setQueueIndex((q) => q - 1);
      } else if (fromIdx > queueIndex && toIdx <= queueIndex) {
        setQueueIndex((q) => q + 1);
      }
      return nextQueue;
    });
  };

  const clearQueue = () => {
    if (currentSong) {
      setQueue([currentSong]);
      setQueueIndex(0);
    } else {
      setQueue([]);
      setQueueIndex(0);
    }
  };

  const setAutoplayEnabled = (val) => {
    setAutoplayEnabledState(val);
    try {
      localStorage.setItem('dropify_autoplay', String(val));
    } catch (_) {}
  };

  const saveQueueAsPlaylist = async (name) => {
    if (!name || queue.length === 0) return false;
    try {
      const res = await fetch(apiUrl('/api/library/playlist'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      const data = await res.json();
      const playlist = data.playlists?.find((p) => p.name === name);
      if (playlist && playlist.id) {
        for (const track of queue) {
          await fetch(apiUrl(`/api/library/playlist/${playlist.id}/add`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ song: track })
          });
        }
      }
      return true;
    } catch (_) {
      return false;
    }
  };

  // Song DNA Action
  const fetchDna = async (song = currentSong) => {
    if (!song) return;
    setIsLoadingDna(true);
    setIsDnaOpen(true);
    try {
      const params = new URLSearchParams({
        title: song.title || '',
        artist: song.artist || '',
        album: song.album || ''
      });
      const res = await fetch(apiUrl(`/api/dna/${song.id}?${params.toString()}`));
      const data = await res.json();
      if (data.success && data.dna) {
        setDnaData(data.dna);
      } else {
        setDnaData({
          title: song.title,
          artist: song.artist,
          album: song.album || 'Single',
          meaning: `"${song.title}" is an acoustic recording by ${song.artist}.`,
          bio: `${song.artist} is an active contemporary artist.`
        });
      }
    } catch (_) {
      setDnaData({
        title: song.title,
        artist: song.artist,
        album: song.album || 'Single',
        meaning: `"${song.title}" is an acoustic recording by ${song.artist}.`,
        bio: `${song.artist} is an active contemporary artist.`
      });
    } finally {
      setIsLoadingDna(false);
    }
  };

  // Universal Share Action
  const openShareModal = (song = currentSong) => {
    if (!song) return;
    setShareSong(song);
    setIsShareOpen(true);
  };

  // Player Theme Action
  const setPlayerTheme = (theme) => {
    setPlayerThemeState(theme);
    try {
      localStorage.setItem('dropify_player_theme', theme);
    } catch (_) {}
  };

  // Audio Quality Action
  const setAudioQuality = (quality) => {
    setAudioQualityState(quality);
    try {
      localStorage.setItem('dropify_quality', quality);
    } catch (_) {}
    fetch(apiUrl('/api/preferences'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioQuality: quality })
    }).catch(() => {});
  };

  // Offline Download Actions
  const downloadSong = async (song = currentSong) => {
    if (!song || !song.id) return;
    setIsDownloadingMap((prev) => ({ ...prev, [song.id]: true }));
    try {
      const audioRes = await fetch(apiUrl(`/api/stream/${song.id}`));
      const audioBlob = await audioRes.blob();

      let lyrics = null;
      try {
        const lyricsRes = await fetch(
          apiUrl(`/api/lyrics/${song.id}?title=${encodeURIComponent(song.title)}&artist=${encodeURIComponent(song.artist)}`)
        );
        lyrics = await lyricsRes.json();
      } catch (_) {}

      await saveDownloadedSong(song, audioBlob, lyrics);
      const updatedList = await getDownloadedSongs();
      setDownloadedSongs(updatedList);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloadingMap((prev) => ({ ...prev, [song.id]: false }));
    }
  };

  const removeDownloadedSong = async (songId) => {
    await deleteDownloadedSong(songId);
    const updatedList = await getDownloadedSongs();
    setDownloadedSongs(updatedList);
  };

  const setIsOfflineMode = (val) => {
    setIsOfflineModeState(val);
    try {
      localStorage.setItem('dropify_offline_mode', String(val));
    } catch (_) {}
  };

  // Likes and Library sync
  const toggleLike = async (song) => {
    const isLiked = likedSongIds.has(song.id);
    const newLiked = new Set(likedSongIds);
    if (isLiked) {
      newLiked.delete(song.id);
    } else {
      newLiked.add(song.id);
    }
    setLikedSongIds(newLiked);

    try {
      await fetch(apiUrl('/api/library/like'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song, isLiked: !isLiked })
      });
    } catch (err) {}
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    audioManager.setVolume(newVol);
  };

  const updateEqGain = (index, val) => {
    const updated = [...eqGains];
    updated[index] = val;
    setEqGains(updated);
    audioManager.setEqualizerBand(index, val);
  };

  const updateStereoWidth = (val) => {
    setStereoWidth(val);
    audioManager.setStereoWidth(val);
  };

  // Wire refs
  playNextRef.current = playNext;
  playPreviousRef.current = playPrevious;
  seekToRef.current = seekTo;
  togglePlayPauseRef.current = togglePlayPause;

  return (
    <PlayerContext.Provider
      value={{
        currentSong,
        isPlaying,
        currentTime,
        duration,
        progress,
        volume,
        queue,
        queueIndex,
        isQueueOpen,
        setIsQueueOpen,
        addToQueue,
        playNextInQueue,
        removeFromQueue,
        reorderQueue,
        clearQueue,
        saveQueueAsPlaylist,
        autoplayEnabled,
        setAutoplayEnabled,
        lyricsData,
        setLyricsData,
        activeLyricIndex,
        setActiveLyricIndex,
        isLoadingLyrics,
        setIsLoadingLyrics,
        lyricsOffset,
        setLyricsOffset,
        isEqOpen,
        setIsEqOpen,
        isEqualizerEnabled,
        setIsEqualizerEnabled,
        eqGains,
        updateEqGain,
        stereoWidth,
        updateStereoWidth,
        isWidenerEnabled,
        setIsWidenerEnabled,
        crossfadeDuration,
        setCrossfadeDuration,
        audioQuality,
        setAudioQuality,
        playbackSpeed,
        setPlaybackSpeed,
        varispeed,
        setVarispeed,
        isSpeedModalOpen,
        setIsSpeedModalOpen,
        sleepTimer,
        startSleepTimer,
        clearSleepTimer,
        isSleepTimerModalOpen,
        setIsSleepTimerModalOpen,
        isDnaOpen,
        setIsDnaOpen,
        dnaData,
        isLoadingDna,
        fetchDna,
        isShareOpen,
        setIsShareOpen,
        shareSong,
        openShareModal,
        playerTheme,
        setPlayerTheme,
        themeMode,
        setThemeMode,
        sameVibeRadioEnabled,
        setSameVibeRadioEnabled,
        ambientGlowEnabled,
        setAmbientGlowEnabled,
        bluetoothDelayMs,
        setBluetoothDelayMs,
        clearStreamCache,
        downloadedSongs,
        isDownloadingMap,
        downloadSong,
        removeDownloadedSong,
        isOfflineMode,
        setIsOfflineMode,
        isFullscreenPlayerOpen,
        setIsFullscreenPlayerOpen,
        isMusicFlowOpen,
        setIsMusicFlowOpen,
        isShortcutsOpen,
        setIsShortcutsOpen,
        isSettingsOpen,
        setIsSettingsOpen,
        likedSongIds,
        recentlyPlayed,
        setRecentlyPlayed,
        playSong,
        togglePlayPause,
        playNext,
        playPrevious,
        seekTo,
        toggleLike,
        handleVolumeChange,
        audioManager
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  return useContext(PlayerContext);
}
