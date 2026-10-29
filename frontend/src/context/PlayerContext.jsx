import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import audioManager from '../audio/AudioManager';
import { apiUrl } from '../config';

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

  // Synced Lyrics State
  const [lyricsData, setLyricsData] = useState({ lines: [], synced: false, plain: '' });
  const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false);
  const [lyricsOffset, setLyricsOffset] = useState(-2.5); // Calibrated -2.5s offset to align Spotify/LRCLIB timestamps with YouTube music video playback

  // DSP & Equalizer State
  const [isEqOpen, setIsEqOpen] = useState(false);
  const [isEqualizerEnabled, setIsEqualizerEnabled] = useState(true);
  const [eqGains, setEqGains] = useState([2, 3, 1.5, 0, -1, 0.5, 1.5, 2.5, 3, 2]);
  const [stereoWidth, setStereoWidth] = useState(1.25);
  const [isWidenerEnabled, setIsWidenerEnabled] = useState(true);
  const [crossfadeDuration, setCrossfadeDuration] = useState(3.5);
  const [audioQuality, setAudioQuality] = useState('HIGH');

  // UI Modals
  const [isFullscreenPlayerOpen, setIsFullscreenPlayerOpen] = useState(false);
  const [isMusicFlowOpen, setIsMusicFlowOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

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

  isPlayingRef.current = isPlaying;
  currentSongRef.current = currentSong;
  durationRef.current = duration;
  currentTimeRef.current = currentTime;
  queueRef.current = queue;
  queueIndexRef.current = queueIndex;

  // Fetch initial library and preferences
  useEffect(() => {
    fetch(apiUrl('/api/library'))
      .then(res => res.json())
      .then(data => {
        if (data.likedSongs) {
          setLikedSongIds(new Set(data.likedSongs.map(s => s.id)));
        }
      })
      .catch(() => {});

    fetch(apiUrl('/api/preferences'))
      .then(res => res.json())
      .then(pref => {
        if (pref.eqBands) setEqGains(pref.eqBands.map(b => b.gain));
        if (pref.stereoWidth) setStereoWidth(pref.stereoWidth);
        if (pref.crossfadeDuration !== undefined) setCrossfadeDuration(pref.crossfadeDuration);
      })
      .catch(() => {});
  }, []);

  // Sync Audio Manager Listeners
  useEffect(() => {
    audioManager.onTimeUpdateCallback = ({ currentTime, duration, progress }) => {
      setCurrentTime(currentTime);
      setDuration(duration);
      setProgress(progress);
      listenedDurationRef.current = currentTime * 1000;

      // Update active synced lyric line with calibrated timing offset
      if (lyricsData.lines && lyricsData.lines.length > 0) {
        const adjustedTime = Math.max(0, currentTime + lyricsOffset);
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
      // Automix pre-arm next song recommendations when nearing queue end
      const q = queueRef.current || [];
      const qIdx = queueIndexRef.current || 0;
      const cur = currentSongRef.current;
      if (qIdx + 1 >= q.length && cur && cur.id && !isPreArmingRef.current) {
        isPreArmingRef.current = true;
        fetch(apiUrl(`/api/song/${cur.id}`))
          .then(res => res.json())
          .then(details => {
            if (details.related && details.related.length > 0) {
              setQueue(prev => {
                const existingIds = new Set(prev.map(s => s.id));
                const newTracks = details.related.filter(r => !existingIds.has(r.id));
                return newTracks.length > 0 ? [...prev, ...newTracks] : prev;
              });
            }
          })
          .catch(() => {})
          .finally(() => {
            setTimeout(() => { isPreArmingRef.current = false; }, 6000);
          });
      }
    };
  }, [lyricsData, queue, queueIndex, lyricsOffset]);

  // High-precision 60fps real-time live lyric synchronization ticker with calibrated timing offset
  useEffect(() => {
    if (!isPlaying || (!isFullscreenPlayerOpen && !isMusicFlowOpen)) return;
    let animId;
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
        setActiveLyricIndex(index);
      }
      animId = requestAnimationFrame(syncTicker);
    };

    animId = requestAnimationFrame(syncTicker);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isFullscreenPlayerOpen, isMusicFlowOpen, lyricsData, audioManager, lyricsOffset]);

  // Load lyrics when song changes
  useEffect(() => {
    if (!currentSong) return;

    const requestedSongId = currentSong.id;
    setIsLoadingLyrics(true);
    setLyricsData({ lines: [], synced: false, plain: '' });
    setActiveLyricIndex(-1);

    const { title: cleanTitle, artist: cleanArtist } = cleanSongMeta(currentSong.title, currentSong.artist);

    const queryParams = new URLSearchParams({
      title: cleanTitle || currentSong.title,
      artist: cleanArtist || currentSong.artist || '',
      duration: currentSong.duration || ''
    });

    fetch(apiUrl(`/api/lyrics/${currentSong.id}?${queryParams}`))
      .then(res => res.json())
      .then(data => {
        if (currentSongRef.current?.id === requestedSongId) {
          setLyricsData(data);
          setIsLoadingLyrics(false);
        }
      })
      .catch(() => {
        if (currentSongRef.current?.id === requestedSongId) {
          setIsLoadingLyrics(false);
        }
      });
  }, [currentSong?.id]);

  // HTML5 Media Session API Integration for Native Mobile Lockscreen Controls & Background Playback
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator) || !currentSong) return;

    const highThumb = currentSong.thumbnailHigh || currentSong.thumbnail || (currentSong.id ? `https://i.ytimg.com/vi/${currentSong.id}/hqdefault.jpg` : '');
    const midThumb = currentSong.thumbnail || (currentSong.id ? `https://i.ytimg.com/vi/${currentSong.id}/mqdefault.jpg` : '');

    try {
      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist || 'Dropify Artist',
        album: 'Dropify Music',
        artwork: [
          { src: midThumb, sizes: '96x96', type: 'image/jpeg' },
          { src: midThumb, sizes: '128x128', type: 'image/jpeg' },
          { src: highThumb, sizes: '256x256', type: 'image/jpeg' },
          { src: highThumb, sizes: '512x512', type: 'image/jpeg' }
        ]
      });
    } catch (e) {
      console.warn('MediaSession metadata notice:', e);
    }
  }, [currentSong]);

  // Register MediaSession action handlers ONCE with mutable refs to eliminate IPC registration flooding
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', async () => {
        await audioManager.resume();
        setIsPlaying(true);
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        audioManager.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        audioManager.pause();
        setIsPlaying(false);
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (playPreviousRef.current) playPreviousRef.current();
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (playNextRef.current) playNextRef.current(true);
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        const d = durationRef.current;
        if (details.seekTime !== undefined && d > 0 && seekToRef.current) {
          seekToRef.current((details.seekTime / d) * 100);
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
    } catch (e) {
      console.warn('MediaSession action handler notice:', e);
    }
  }, []);

  // Sync MediaSession playbackState with single dependency to prevent IPC flooding
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch (_) {}
  }, [isPlaying]);

  // Sync MediaSession position state for the lockscreen seekbar
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('mediaSession' in navigator) ||
      !('setPositionState' in navigator.mediaSession) ||
      duration <= 0
    ) return;

    try {
      navigator.mediaSession.setPositionState({
        duration: Math.max(0, duration),
        playbackRate: 1,
        position: Math.min(Math.max(0, currentTime), duration)
      });
    } catch (_) {}
  }, [currentTime, duration]);

  // Mobile WakeLock to keep audio playback thread active
  useEffect(() => {
    let wakeLock = null;
    let isCancelled = false;
    if (typeof window !== 'undefined' && 'wakeLock' in navigator && isPlaying) {
      navigator.wakeLock.request('screen').then(wl => {
        if (isCancelled) {
          wl.release().catch(() => {});
        } else {
          wakeLock = wl;
        }
      }).catch(() => {});
    }
    return () => {
      isCancelled = true;
      if (wakeLock) {
        wakeLock.release().catch(() => {});
      }
    };
  }, [isPlaying]);

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
  }, [isPlaying, currentSong?.id]);

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
      const songIdx = newQueue.findIndex(s => s.id === song.id);
      setQueueIndex(songIdx >= 0 ? songIdx : (index !== null ? index : 0));
    } else if (index !== null) {
      setQueueIndex(index);
    }

    setCurrentSong(song);
    audioManager.setCurrentSongMetadata(song);
    songStartTimeRef.current = Date.now();
    listenedDurationRef.current = 0;
    setCurrentTime(0);
    setProgress(0);

    // Track Recently Played
    setRecentlyPlayed((prev) => {
      const filtered = (prev || []).filter((s) => s.id !== song.id);
      const updated = [song, ...filtered].slice(0, 25);
      try {
        localStorage.setItem('dropify_recently_played', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });

    const streamUrl = apiUrl(`/api/stream/${song.id}`);
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
    playNext(true); // with equal-power crossfade
  };

  const playNext = (withCrossfade = false) => {
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
      const streamUrl = apiUrl(`/api/stream/${nextSong.id}`);
      audioManager.playTrack(streamUrl, withCrossfade, nextSong.id);
      setIsPlaying(true);
    } else if (currentSong) {
      // Auto-Radio generation: fetch related recommendations
      fetch(apiUrl(`/api/song/${currentSong.id}`))
        .then(res => res.json())
        .then(details => {
          if (details && details.related && details.related.length > 0) {
            const nextTrack = details.related[0];
            const remainingTracks = details.related.slice(1);
            setQueue(prev => [...prev, nextTrack, ...remainingTracks]);
            setQueueIndex(prev => prev + 1);
            setCurrentSong(nextTrack);
            audioManager.setCurrentSongMetadata(nextTrack);
            setCurrentTime(0);
            setProgress(0);
            const streamUrl = apiUrl(`/api/stream/${nextTrack.id}`);
            audioManager.playTrack(streamUrl, withCrossfade, nextTrack.id);
            setIsPlaying(true);
          }
        })
        .catch(() => {});
    }
  };

  const playPrevious = () => {
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
      audioManager.playTrack(apiUrl(`/api/stream/${prevSong.id}`), false, prevSong.id);
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

  playNextRef.current = playNext;
  playPreviousRef.current = playPrevious;
  seekToRef.current = seekTo;
  togglePlayPauseRef.current = togglePlayPause;

  const toggleLike = async (song = currentSong) => {
    if (!song) return;
    try {
      const res = await fetch(apiUrl('/api/library/like'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song })
      });
      const data = await res.json();
      setLikedSongIds(prev => {
        const next = new Set(prev);
        if (data.isLiked) next.add(song.id);
        else next.delete(song.id);
        return next;
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
        isFullscreenPlayerOpen,
        setIsFullscreenPlayerOpen,
        isMusicFlowOpen,
        setIsMusicFlowOpen,
        isShortcutsOpen,
        setIsShortcutsOpen,
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
