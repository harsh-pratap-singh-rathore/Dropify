import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import audioManager from '../audio/AudioManager';
import { apiUrl } from '../config';

const PlayerContext = createContext();

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

  // Liked tracks cache
  const [likedSongIds, setLikedSongIds] = useState(new Set());

  const songStartTimeRef = useRef(0);
  const listenedDurationRef = useRef(0);

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

      // Update active synced lyric line
      if (lyricsData.lines && lyricsData.lines.length > 0) {
        let index = -1;
        for (let i = 0; i < lyricsData.lines.length; i++) {
          if (currentTime >= lyricsData.lines[i].time) {
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
      // Automix pre-arm next song
      if (queueIndex + 1 < queue.length) {
        // next track is ready
      }
    };
  }, [lyricsData, queue, queueIndex]);

  // High-precision 60fps real-time live lyric synchronization ticker
  useEffect(() => {
    if (!isPlaying) return;
    let animId;
    const syncTicker = () => {
      const curAudio = audioManager.getCurrentAudio();
      if (curAudio && !curAudio.paused && lyricsData?.lines?.length > 0) {
        const t = curAudio.currentTime;
        let index = -1;
        for (let i = 0; i < lyricsData.lines.length; i++) {
          if (t >= lyricsData.lines[i].time) {
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
  }, [isPlaying, lyricsData, audioManager]);

  // Load lyrics when song changes
  useEffect(() => {
    if (!currentSong) return;

    setIsLoadingLyrics(true);
    setLyricsData({ lines: [], synced: false, plain: '' });
    setActiveLyricIndex(-1);

    const queryParams = new URLSearchParams({
      title: currentSong.title,
      artist: currentSong.artist || '',
      duration: currentSong.duration || ''
    });

    fetch(apiUrl(`/api/lyrics/${currentSong.id}?${queryParams}`))
      .then(res => res.json())
      .then(data => {
        setLyricsData(data);
        setIsLoadingLyrics(false);
      })
      .catch(() => {
        setIsLoadingLyrics(false);
      });
  }, [currentSong]);

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

  const playSong = async (song, newQueue = null, index = 0) => {
    if (currentSong && currentSong.id !== song.id) {
      recordStats(currentTime < 15);
    }

    if (newQueue) {
      setQueue(newQueue);
      setQueueIndex(index);
    }

    setCurrentSong(song);
    songStartTimeRef.current = Date.now();
    listenedDurationRef.current = 0;

    const streamUrl = apiUrl(`/api/stream/${song.id}`);
    await audioManager.playTrack(streamUrl, false);
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
    if (queueIndex + 1 < queue.length) {
      const nextIndex = queueIndex + 1;
      setQueueIndex(nextIndex);
      const nextSong = queue[nextIndex];
      setCurrentSong(nextSong);
      const streamUrl = apiUrl(`/api/stream/${nextSong.id}`);
      audioManager.playTrack(streamUrl, withCrossfade);
      setIsPlaying(true);
    } else if (currentSong) {
      // Auto-Radio generation: fetch related recommendations
      fetch(apiUrl(`/api/song/${currentSong.id}`))
        .then(res => res.json())
        .then(details => {
          if (details.related && details.related.length > 0) {
            setQueue(prev => [...prev, ...details.related]);
            playNext(withCrossfade);
          }
        })
        .catch(() => {});
    }
  };

  const playPrevious = () => {
    if (currentTime > 4) {
      audioManager.seek(0);
    } else if (queueIndex > 0) {
      const prevIndex = queueIndex - 1;
      setQueueIndex(prevIndex);
      const prevSong = queue[prevIndex];
      setCurrentSong(prevSong);
      audioManager.playTrack(apiUrl(`/api/stream/${prevSong.id}`), false);
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
        likedSongIds,
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
