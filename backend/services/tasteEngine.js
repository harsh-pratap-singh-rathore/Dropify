const storage = require('./storageService');
const innertube = require('./innertubeService');

const PLAY_WEIGHT = 2.0;
const SKIP_PENALTY = 3.0;
const LIKED_BONUS = 5.0;
const RECENCY_BONUS = 1.5;
const TIME_OF_DAY_BONUS = 1.3;

function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

function calculateScore(stats, isLiked, timeOfDay) {
  const now = Date.now();
  const isRecent = (now - (stats.lastPlayedAtMillis || 0)) < 7 * 86400000;
  const playMinutes = Math.max(0, (stats.totalPlayTimeMs || 0) / 60000.0);
  const normalizedPlayTime = Math.log(1.0 + playMinutes);

  let score = normalizedPlayTime * PLAY_WEIGHT;
  score -= (stats.skipCount || 0) * SKIP_PENALTY;
  if (isLiked) score += LIKED_BONUS;
  if (isRecent) score += RECENCY_BONUS;

  let multiplier = 1.0;
  if (timeOfDay === 'morning' && isRecent) multiplier = TIME_OF_DAY_BONUS;
  if (timeOfDay === 'night' && isLiked) multiplier = TIME_OF_DAY_BONUS;

  score *= multiplier;
  return Math.max(0, score);
}

/**
 * Records playback duration and completion
 */
function recordPlayback(trackId, title, artist, listenedMs, skipped = false) {
  const playStats = storage.getPlayStats() || {};
  const trackKey = `${title || ''}|${artist || ''}`.toLowerCase();
  
  if (!playStats[trackKey]) {
    playStats[trackKey] = {
      id: trackId,
      title,
      artist,
      totalPlayTimeMs: 0,
      skipCount: 0,
      lastPlayedAtMillis: Date.now()
    };
  }

  const stat = playStats[trackKey];
  stat.id = trackId; // Keep most recent id
  stat.totalPlayTimeMs += Math.round(listenedMs || 0);
  stat.lastPlayedAtMillis = Date.now();
  if (skipped && listenedMs < 15000) {
    stat.skipCount += 1;
  }

  // BE-12 & SEC-04: Cap playStats to 500 entries to prevent memory exhaustion & file bloat
  const keys = Object.keys(playStats);
  if (keys.length > 500) {
    keys.sort((a, b) => (playStats[a].lastPlayedAtMillis || 0) - (playStats[b].lastPlayedAtMillis || 0));
    const excess = keys.length - 500;
    for (let i = 0; i < excess; i++) {
      delete playStats[keys[i]];
    }
  }

  storage.savePlayStats(playStats);
  return stat;
}

/**
 * Generates an on-device smart mix tailored to user's taste and time of day
 */
async function generateTasteMix(count = 20) {
  const playStats = storage.getPlayStats();
  const library = storage.getLibrary();
  const exclusions = new Set(storage.getExclusions());
  const timeOfDay = getTimeOfDay();

  const likedKeys = new Set(library.likedSongs.map(s => `${s.title}|${s.artist}`.toLowerCase()));

  // Score all tracked songs
  const scoredTracks = [];
  for (const [key, stat] of Object.entries(playStats)) {
    if (exclusions.has(key)) continue;
    // Filter out tracks that are skipped constantly with low play time
    if (stat.skipCount >= 3 && stat.totalPlayTimeMs < 45000) continue;

    const isLiked = likedKeys.has(key);
    const score = calculateScore(stat, isLiked, timeOfDay);
    scoredTracks.push({ ...stat, score, isLiked });
  }

  scoredTracks.sort((a, b) => b.score - a.score);

  // If no listening history yet, fall back to liked songs or trending seeds
  let seeds = scoredTracks.slice(0, 5);
  if (seeds.length === 0 && library.likedSongs.length > 0) {
    seeds = library.likedSongs.slice(0, 5).map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      score: 5.0
    }));
  }

  if (seeds.length === 0) {
    // Brand new user: return fresh discovery tracks from available randomized shelves (BE-05)
    const home = await innertube.getHomeFeed();
    const shelfKeys = Object.keys(home || {});
    const trending = (home && home['Trending Tracks']) || (shelfKeys.length > 0 ? home[shelfKeys[0]] : []);
    return {
      title: 'Welcome Discovery Mix',
      description: 'Handpicked tracks to kickstart your listening profile',
      timeOfDay,
      tracks: (Array.isArray(trending) ? trending : []).slice(0, count)
    };
  }

  // Expand seeds by querying related tracks
  const mixTracks = new Map();
  // Include top seeds
  for (const s of seeds) {
    mixTracks.set(s.id, {
      id: s.id,
      title: s.title,
      artist: s.artist,
      thumbnail: `https://i.ytimg.com/vi/${s.id}/hqdefault.jpg`,
      score: s.score
    });
  }

  // Fetch related recommendations for the #1 seed
  try {
    const topSong = await innertube.getSongDetails(seeds[0].id);
    for (const rel of topSong.related || []) {
      const relKey = `${rel.title}|${rel.artist}`.toLowerCase();
      if (!exclusions.has(relKey) && !mixTracks.has(rel.id)) {
        mixTracks.set(rel.id, {
          id: rel.id,
          title: rel.title,
          artist: rel.artist,
          thumbnail: rel.thumbnail || `https://i.ytimg.com/vi/${rel.id}/hqdefault.jpg`
        });
        if (mixTracks.size >= count) break;
      }
    }
  } catch (err) {
    console.error('Failed to expand seeds:', err.message);
  }

  const mixName = timeOfDay === 'morning' 
    ? 'Morning Momentum Mix' 
    : (timeOfDay === 'night' ? 'Late Night Chill Mix' : 'Personalized Taste Mix');

  return {
    title: mixName,
    description: `Generated on-device using local taste scoring (${timeOfDay} profile)`,
    timeOfDay,
    seedCount: seeds.length,
    tracks: Array.from(mixTracks.values()).slice(0, count)
  };
}

module.exports = {
  recordPlayback,
  generateTasteMix,
  getTimeOfDay
};
