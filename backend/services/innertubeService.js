const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Optimized Ytdl instance with multi-client fallback cascade (visionos, web_embedded, tv, mweb, web_creator)
let ytdlInstance = null;
function getYtdl() {
  if (!ytdlInstance) {
    try {
      const { Ytdl, DEFAULT_CLIENTS } = require('@distube/ytdl-core');
      ytdlInstance = new Ytdl({
        clients: DEFAULT_CLIENTS || ['visionos', 'web_embedded', 'tv', 'mweb', 'web_creator'],
        lang: 'en',
        country: 'US'
      });
    } catch (e) {
      console.warn('Ytdl init error:', e.message);
    }
  }
  return ytdlInstance;
}

/**
 * High-Performance Bounded LRU Cache with TTL Eviction
 * Guarantees process memory stability and prevents Out-Of-Memory (OOM) fatal crashes
 */
class BoundedLRUCache {
  constructor(maxSize = 500, ttlMs = 5 * 60 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    // Refresh LRU recency
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, expiry: Date.now() + this.ttlMs });
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

// In-memory format & metadata cache (Bounded LRU, TTL: 5 hours)
const infoCache = new BoundedLRUCache(500, 5 * 3600 * 1000);
const streamUrlCache = new BoundedLRUCache(500, 5 * 3600 * 1000);

// Strict Song Filter: YouTube Music Songs Only, zero non-music, zero podcasts/episodes
const NON_SONG_REGEX = /\b(podcast|episode|interview|gameplay|walkthrough|vlog|livestream|live\s*stream|reaction|review|audiobook|documentary|compilation|1\s*hour|10\s*hours|tutorial|unboxing|standup|stand-up|comedy\s*special|full\s*movie|trailer|news|lecture)\b/i;

function isValidSong(title, artist, durationSeconds, durationPartsCount) {
  if (!title || typeof title !== 'string') return false;
  // Reject multi-hour items
  if (durationPartsCount && durationPartsCount >= 3) return false;
  // Pure songs are between 45 seconds and 480 seconds (8 minutes)
  if (durationSeconds < 45 || durationSeconds > 480) return false;
  // Blacklist non-song titles or artists
  if (NON_SONG_REGEX.test(title) || NON_SONG_REGEX.test(artist || '')) return false;
  return true;
}

/**
 * Searches music tracks on YouTube Music using official InnerTube WEB_REMIX API
 * Filters strictly to SONGS ONLY (no videos, no podcasts, no 1-hour loops)
 */
async function searchWithInnerTube(query) {
  try {
    const res = await axios.post('https://music.youtube.com/youtubei/v1/search', {
      query: query.trim(),
      params: 'EgWKAQIIAWoSEAQQAxAFEAkQChAQEA4QFRAR', // YouTube Music "Songs" filter param
      context: {
        client: {
          clientName: 'WEB_REMIX',
          clientVersion: '1.20240101.01.00',
          hl: 'en',
          gl: 'US'
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      },
      timeout: 7500
    });

    const sections = res.data.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    const tracks = [];

    for (const sec of sections) {
      const contents = sec.musicShelfRenderer?.contents || sec.itemSectionRenderer?.contents || [];
      for (const item of contents) {
        const r = item.musicResponsiveListItemRenderer;
        if (!r) continue;

        const videoId = r.playlistItemData?.videoId ||
          r.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
          r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId;

        if (!videoId) continue;

        const title = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text?.trim() || '';
        if (!title) continue;

        const subRuns = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const subTexts = subRuns.map(x => x.text).join('').split('•').map(s => s.trim());

        let artist = subTexts[0] || 'Various Artists';
        if (artist.toLowerCase() === 'song' && subTexts[1]) {
          artist = subTexts[1];
        }

        let durationFormatted = '3:30';
        let duration = 210;
        let partsCount = 2;
        for (let i = subTexts.length - 1; i >= 0; i--) {
          const part = subTexts[i];
          if (/^\d{1,2}:\d{2}$/.test(part)) {
            durationFormatted = part;
            const [m, s] = part.split(':').map(Number);
            duration = m * 60 + s;
            break;
          } else if (/^\d{1,2}:\d{2}:\d{2}$/.test(part)) {
            partsCount = 3;
            break;
          }
        }

        if (!isValidSong(title, artist, duration, partsCount)) {
          continue;
        }

        tracks.push({
          id: videoId,
          title,
          artist,
          duration,
          durationFormatted,
          thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
          thumbnailHigh: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        });
      }
    }

    if (tracks.length > 0) {
      return tracks.slice(0, 30);
    }
  } catch (err) {
    console.warn('InnerTube WEB_REMIX notice:', err.message);
  }

  // Secondary InnerTube WEB fallback if WEB_REMIX returned 0 items
  try {
    const resWeb = await axios.post('https://www.youtube.com/youtubei/v1/search', {
      query: `${query.trim()} audio song`,
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20240101.01.00',
          hl: 'en',
          gl: 'US'
        }
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      },
      timeout: 7000
    });

    const sections = resWeb.data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const webTracks = [];

    for (const sec of sections) {
      const items = sec.itemSectionRenderer?.contents || [];
      for (const item of items) {
        const v = item.videoRenderer;
        if (v && v.videoId && v.title?.runs?.[0]?.text) {
          const durationFormatted = v.lengthText?.simpleText || '0:00';
          const parts = durationFormatted.split(':').map(p => parseInt(p, 10));
          const duration = parts.length === 2 ? parts[0] * 60 + parts[1] : (parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0);
          const title = v.title.runs[0].text;
          const artist = v.ownerText?.runs?.[0]?.text || 'Various Artists';

          if (!isValidSong(title, artist, duration, parts.length)) {
            continue;
          }

          webTracks.push({
            id: v.videoId,
            title,
            artist,
            duration,
            durationFormatted,
            thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
            thumbnailHigh: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
            views: v.viewCountText?.simpleText || ''
          });
        }
      }
    }
    return webTracks.slice(0, 30);
  } catch (err) {
    console.warn('InnerTube WEB search notice:', err.message);
    return [];
  }
}

async function searchWithYtdl(query) {
  const ytdl = await getYtdl();
  if (!ytdl) throw new Error('Ytdl not initialized');
  const items = await ytdl.search(`${query.trim()} song`, { limit: 25 });
  return (items || [])
    .filter(v => isValidSong(v.title, v.author?.name, v.lengthSeconds || 0, 2))
    .map(v => {
      const duration = v.lengthSeconds || 0;
      const min = Math.floor(duration / 60);
      const sec = Math.floor(duration % 60);
      const durationFormatted = `${min}:${sec < 10 ? '0' : ''}${sec}`;
      return {
        id: v.id,
        title: v.title,
        artist: v.author?.name || 'Various Artists',
        duration,
        durationFormatted,
        thumbnail: `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`,
        thumbnailHigh: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
        views: v.viewCount ? `${v.viewCount.toLocaleString()} views` : ''
      };
    });
}

async function searchWithYts(query) {
  const results = await yts(`${query.trim()} song`);
  return (results.videos || [])
    .filter(v => isValidSong(v.title, v.author?.name, v.seconds || 0, 2))
    .slice(0, 30)
    .map(v => ({
      id: v.videoId,
      title: v.title,
      artist: v.author?.name || 'Unknown Artist',
      duration: v.seconds,
      durationFormatted: v.timestamp,
      thumbnail: v.videoId ? `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg` : (v.thumbnail || ''),
      thumbnailHigh: v.videoId ? `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` : (v.thumbnail || ''),
      views: v.views,
      ago: v.ago
    }));
}

/**
 * Searches music tracks on YouTube (Multi-tiered: InnerTube API -> Ytdl -> Yts)
 */
async function searchMusic(query) {
  if (!query || !query.trim()) return [];

  // 1. Official InnerTube API (instant JSON, zero scraping, immune to cloud IP blocks)
  try {
    const tracks = await searchWithInnerTube(query);
    if (tracks.length > 0) return tracks;
  } catch (err) {
    console.warn('InnerTube search notice:', err.message);
  }

  // 2. Ytdl authenticated session
  try {
    const tracks = await searchWithYtdl(query);
    if (tracks.length > 0) return tracks;
  } catch (err) {
    console.warn('Ytdl search notice:', err.message);
  }

  // 3. Fallback to yt-search
  try {
    const tracks = await searchWithYts(query);
    if (tracks.length > 0) return tracks;
  } catch (err) {
    console.error('All search providers failed for query:', query, err?.message || err);
  }

  return [];
}

// Guaranteed Default Home Feed in case disk cache or YouTube is delayed
const DEFAULT_HOME_FEED = {
  "Global Hit Chartbusters": [
    {
      "id": "BddP6PYo2gs",
      "title": "Kesariya - Brahmāstra",
      "artist": "Arijit Singh, Pritam",
      "duration": 268,
      "durationFormatted": "4:28",
      "thumbnail": "https://i.ytimg.com/vi/BddP6PYo2gs/mqdefault.jpg",
      "thumbnailHigh": "https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg"
    },
    {
      "id": "V7LwfY5U5WI",
      "title": "Chaleya - Jawan",
      "artist": "Arijit Singh, Anirudh Ravichander",
      "duration": 200,
      "durationFormatted": "3:20",
      "thumbnail": "https://i.ytimg.com/vi/V7LwfY5U5WI/mqdefault.jpg",
      "thumbnailHigh": "https://i.ytimg.com/vi/V7LwfY5U5WI/hqdefault.jpg"
    },
    {
      "id": "34Na4j8AVgA",
      "title": "Starboy",
      "artist": "The Weeknd ft. Daft Punk",
      "duration": 230,
      "durationFormatted": "3:50",
      "thumbnail": "https://i.ytimg.com/vi/34Na4j8AVgA/mqdefault.jpg",
      "thumbnailHigh": "https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg"
    }
  ],
  "Acoustic Soul & Unplugged": [
    {
      "id": "JGwWNGJdvx8",
      "title": "Shape of You",
      "artist": "Ed Sheeran",
      "duration": 233,
      "durationFormatted": "3:53",
      "thumbnail": "https://i.ytimg.com/vi/JGwWNGJdvx8/mqdefault.jpg",
      "thumbnailHigh": "https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg"
    },
    {
      "id": "cl0a3i2wFcc",
      "title": "G.O.A.T.",
      "artist": "Diljit Dosanjh",
      "duration": 224,
      "durationFormatted": "3:44",
      "thumbnail": "https://i.ytimg.com/vi/cl0a3i2wFcc/mqdefault.jpg",
      "thumbnailHigh": "https://i.ytimg.com/vi/cl0a3i2wFcc/hqdefault.jpg"
    }
  ],
  "Bollywood & Desi Melodies": [
    {
      "id": "7-x3uDFvHf4",
      "title": "Apna Bana Le - Bhediya",
      "artist": "Arijit Singh, Sachin-Jigar",
      "duration": 261,
      "durationFormatted": "4:21",
      "thumbnail": "https://i.ytimg.com/vi/7-x3uDFvHf4/mqdefault.jpg",
      "thumbnailHigh": "https://i.ytimg.com/vi/7-x3uDFvHf4/hqdefault.jpg"
    },
    {
      "id": "7wtfhZwyrcc",
      "title": "Believer",
      "artist": "Imagine Dragons",
      "duration": 204,
      "durationFormatted": "3:24",
      "thumbnail": "https://i.ytimg.com/vi/7wtfhZwyrcc/mqdefault.jpg",
      "thumbnailHigh": "https://i.ytimg.com/vi/7wtfhZwyrcc/hqdefault.jpg"
    }
  ]
};

// Home Feed Disk Cache Path
const homeCacheDir = process.env.DROPIFY_DATA_DIR ? path.resolve(process.env.DROPIFY_DATA_DIR) : path.join(__dirname, '..', 'data');
const HOME_CACHE_FILE = path.join(homeCacheDir, 'home_feed_cache.json');
let inMemoryHomeFeed = DEFAULT_HOME_FEED;
let lastHomeRefresh = 0;

try {
  if (fs.existsSync(HOME_CACHE_FILE)) {
    const parsed = JSON.parse(fs.readFileSync(HOME_CACHE_FILE, 'utf-8'));
    if (parsed && Object.keys(parsed).length > 0) {
      inMemoryHomeFeed = parsed;
    }
  }
} catch (e) {
  console.warn('Using default home feed cache:', e.message);
}

// 24+ Dynamic Curated Categories (Randomly Juggled - Zero Fixed Shelves)
const DYNAMIC_CATEGORY_POOL = [
  { title: 'Global Hit Chartbusters', query: 'global top hits pop songs' },
  { title: 'Acoustic Soul & Unplugged', query: 'acoustic soul guitar live unplugged songs' },
  { title: 'Bollywood & Desi Melodies', query: 'bollywood romantic acoustic melodies songs' },
  { title: 'Midnight Lo-Fi & Chill', query: 'lofi chill beats midnight sleep study' },
  { title: 'Indie Pop Sketches', query: 'indie pop alternative bedroom pop songs' },
  { title: 'High-Energy Anthems', query: 'upbeat workout energetic dance songs' },
  { title: 'Golden Hour Sunset Grooves', query: 'golden hour sunset acoustic pop songs' },
  { title: 'Retro Synthwave Drive', query: 'synthwave 80s retrowave electronic songs' },
  { title: 'Punjabi Heatwave Hits', query: 'punjabi pop hit songs' },
  { title: 'Chillhop Coffee Lounge', query: 'chillhop jazz beats lofi study songs' },
  { title: 'Smooth Late Night R&B', query: 'smooth rnb late night chill songs' },
  { title: 'Heartfelt Ballads & Melancholy', query: 'sad emotional piano acoustic ballads' },
  { title: 'Deep Focus & Zen Instrumentals', query: 'deep focus instrumental calm songs' },
  { title: 'Coke Studio & Sufi Melodies', query: 'coke studio sufi acoustic songs' },
  { title: 'Feel-Good Roadtrip Beats', query: 'feel good sunny roadtrip acoustic songs' },
  { title: 'Dark Ambient Chill', query: 'dark ambient acoustic soul songs' },
  { title: 'Afrobeats Rhythm Pulse', query: 'afrobeats dance songs' },
  { title: '90s & 2000s Nostalgia Mix', query: '2000s pop rock classic hits' },
  { title: 'Dream Pop & Ethereal Waves', query: 'dream pop indie reverb songs' },
  { title: 'Electropop & Club Heat', query: 'electropop dance electronic songs' },
  { title: 'Acoustic Morning Sunshine', query: 'acoustic morning guitar sunny folk' },
  { title: 'Rainy Day Cafe Notes', query: 'rainy day acoustic jazz piano songs' },
  { title: 'Bolly Chill & Lo-Fi Rewind', query: 'bollywood lofi chill remake songs' },
  { title: 'Viral Global Radio Wave', query: 'viral hits global top 50 songs' }
];

const MOOD_SPECIFIC_POOLS = {
  morning: [
    { title: 'Morning Acoustic Coffee', query: 'acoustic morning coffee indie songs' },
    { title: 'Upbeat Morning Energy', query: 'upbeat positive morning pop hits' },
    { title: 'Fresh Daily Discoveries', query: 'fresh hits discover songs' },
    { title: 'Bollywood Morning Melodies', query: 'bollywood acoustic soul unplugged' },
    { title: 'Feel-Good Indie Folk', query: 'indie folk acoustic sunshine songs' }
  ],
  afternoon: [
    { title: 'Deep Work Beats', query: 'lo-fi beats to study relax' },
    { title: 'Instrumental Concentration', query: 'chill instrumental electronic beats' },
    { title: 'Indie Afternoon Chill', query: 'indie afternoon acoustic pop songs' },
    { title: 'Synthwave Velocity', query: 'retrowave synthwave 80s chill' },
    { title: 'Global Radio Top Hits', query: 'global top 50 hits songs' }
  ],
  evening: [
    { title: 'Golden Hour Anthems', query: 'sunset golden hour acoustic hits' },
    { title: 'Trending Global Vibes', query: 'trending music viral hit songs' },
    { title: 'Desi Pop & Punjabi Energy', query: 'punjabi pop hits arijit diljit' },
    { title: 'Electronic Sunset Chill', query: 'future bass electronic sunset vibes' },
    { title: 'Evening Wind-Down Acoustic', query: 'acoustic guitar chill evening unplugged' }
  ],
  night: [
    { title: 'Midnight Lo-Fi Doodles', query: 'midnight lofi chill beats sleep' },
    { title: 'Late Night Neon Drives', query: 'synthwave night drive retro' },
    { title: 'Dark Ambient Chill', query: 'dark ambient acoustic soul' },
    { title: 'Smooth Midnight R&B', query: 'smooth rnb late night vibes' },
    { title: 'Peaceful Piano & Sleep', query: 'peaceful piano acoustic calm songs' }
  ]
};

function getCircadianPeriod(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

const VALID_MOODS = new Set(['morning', 'afternoon', 'evening', 'night']);
let activeHomeRefreshPromise = null;
let lastForcedRefreshTime = 0;

/**
 * Echo Music Dynamic Home Feed Engine
 * Randomly juggles diverse categories with zero fixed shelves.
 * Every re-roll or refresh delivers brand new randomized sections and tracks.
 */
async function getHomeFeed(options = {}) {
  const { mood = null, forceRefresh = false, hour = new Date().getHours() } = options;
  const sanitizedMood = (typeof mood === 'string' && VALID_MOODS.has(mood.toLowerCase())) ? mood.toLowerCase() : null;
  const period = sanitizedMood ? sanitizedMood : getCircadianPeriod(hour);

  // Return cached feed if within 5 minutes and not forced, or if forceRefresh is triggered too rapidly (30s cooldown)
  const now = Date.now();
  if (!forceRefresh && inMemoryHomeFeed && Object.keys(inMemoryHomeFeed).length > 0 && (now - lastHomeRefresh < 300000)) {
    return inMemoryHomeFeed;
  }
  if (forceRefresh && (now - lastForcedRefreshTime < 30000) && inMemoryHomeFeed && Object.keys(inMemoryHomeFeed).length > 0) {
    return inMemoryHomeFeed;
  }

  // Single-flight promise lock to prevent cache stampedes / concurrent YouTube hammering
  if (activeHomeRefreshPromise) {
    return activeHomeRefreshPromise;
  }

  activeHomeRefreshPromise = (async () => {
    try {
      if (forceRefresh) lastForcedRefreshTime = Date.now();

      // JUGGLE RANDOMLY: Pick 5-6 diverse categories with zero fixed/pinned sections
      let candidatePool = [];
      if (sanitizedMood && MOOD_SPECIFIC_POOLS[sanitizedMood]) {
        const moodItems = [...MOOD_SPECIFIC_POOLS[sanitizedMood]].sort(() => 0.5 - Math.random()).slice(0, 3);
        const extraItems = [...DYNAMIC_CATEGORY_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);
        candidatePool = [...moodItems, ...extraItems];
      } else {
        candidatePool = [...DYNAMIC_CATEGORY_POOL].sort(() => 0.5 - Math.random()).slice(0, 6);
      }

      // Shuffle the chosen categories thoroughly so no category is ever fixed at position 0
      const chosenSections = candidatePool.sort(() => 0.5 - Math.random()).slice(0, 5);

      const promises = chosenSections.map(async (sec) => {
        try {
          const rawTracks = await searchMusic(sec.query);
          // Exclude non-songs, duration between 45s and 480s, shuffle rotation
          const filtered = rawTracks.filter(t => (t.duration || 0) >= 45 && (t.duration || 0) <= 480);
          const shuffled = filtered.sort(() => 0.5 - Math.random()).slice(0, 12);
          return { title: sec.title, tracks: shuffled };
        } catch (err) {
          return { title: sec.title, tracks: [] };
        }
      });

      const sectionResults = await Promise.all(promises);
      const results = {};
      for (const res of sectionResults) {
        if (res.tracks.length > 0) {
          results[res.title] = res.tracks;
        }
      }

      if (Object.keys(results).length > 0) {
        inMemoryHomeFeed = results;
        lastHomeRefresh = Date.now();
        try {
          const cacheDir = path.dirname(HOME_CACHE_FILE);
          if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
          const tmpFile = `${HOME_CACHE_FILE}.${Date.now()}.tmp`;
          fs.writeFileSync(tmpFile, JSON.stringify(results, null, 2), 'utf-8');
          fs.renameSync(tmpFile, HOME_CACHE_FILE);
        } catch (e) {}
      }

      return inMemoryHomeFeed || results;
    } catch (error) {
      console.error('Home feed dynamic refresh error:', error.message);
      return inMemoryHomeFeed || DEFAULT_HOME_FEED;
    } finally {
      activeHomeRefreshPromise = null;
    }
  })();

  return activeHomeRefreshPromise;
}

/**
 * Gets metadata and direct audio stream info
 */
async function getSongDetails(videoId) {
  if (infoCache.has(videoId)) {
    return infoCache.get(videoId);
  }

  try {
    const ytdl = await getYtdl();
    if (!ytdl) throw new Error('Ytdl not initialized');
    const info = await ytdl.getInfo(videoId);
    const details = {
      id: videoId,
      title: info.videoDetails.title,
      artist: info.videoDetails.author?.name || 'Unknown Artist',
      duration: parseInt(info.videoDetails.lengthSeconds, 10),
      thumbnail: info.videoDetails.thumbnails?.[info.videoDetails.thumbnails.length - 1]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      description: info.videoDetails.description,
      related: (info.related_videos || []).slice(0, 15).map(r => ({
        id: r.id,
        title: r.title,
        artist: r.author?.name || 'Related Artist',
        duration: r.length_seconds,
        thumbnail: `https://i.ytimg.com/vi/${r.id}/hqdefault.jpg`
      }))
    };
    infoCache.set(videoId, details);
    return details;
  } catch (error) {
    try {
      const searchRes = await yts({ videoId });
      const details = {
        id: videoId,
        title: searchRes.title,
        artist: searchRes.author?.name || 'Unknown Artist',
        duration: searchRes.seconds,
        thumbnail: searchRes.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        related: []
      };
      return details;
    } catch (e) {
      throw new Error(`Failed to retrieve song details for ${videoId}: ${error.message}`);
    }
  }
}

/**
 * Resolves best audio format (Opus 160kbps itag 251 or AAC 128kbps itag 140)
 */
async function resolveAudioFormat(videoId, preferredFormat = null) {
  const cacheKey = preferredFormat ? `${videoId}_${preferredFormat}` : videoId;
  const cached = streamUrlCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.format;
  }

  const ytdl = await getYtdl();
  if (!ytdl) throw new Error('Ytdl not initialized');
  const info = await ytdl.getInfo(videoId, {
    requestOptions: {
      timeout: 8000
    }
  });
  const audioFormats = (info.formats || []).filter(f => f.hasAudio && !f.hasVideo && f.url);

  if (audioFormats.length === 0) {
    throw new Error('No direct audio format found');
  }

  // Prioritize based on preferred format or default:
  // itag 251 (Opus WebM 160kbps) & itag 140 (AAC 128kbps M4A)
  const sorted = audioFormats.sort((a, b) => {
    const getPriority = (f) => {
      if (preferredFormat === 'mp4' || preferredFormat === 'aac') {
        if (f.itag === 140) return 100;
      }
      if (f.itag === 251) return 90;
      if (f.itag === 140) return 80;
      return 10;
    };
    const diff = getPriority(b) - getPriority(a);
    if (diff !== 0) return diff;
    return (b.bitrate || 0) - (a.bitrate || 0);
  });

  const bestFormat = sorted[0];
  streamUrlCache.set(cacheKey, {
    format: bestFormat,
    expiresAt: Date.now() + 5 * 3600 * 1000 // 5 hours TTL
  });

  return bestFormat;
}

/**
 * Streams audio for a given videoId directly to Express response
 * Handles HTTP Range requests for seeking support (HTTP 206 Partial Content)
 * Proxies the stream from Google Video CDN to avoid client IP binding (403 Forbidden)
 */
async function streamAudio(videoId, req, res) {
  const abortController = new AbortController();
  let isCleanedUp = false;
  let upstreamStream = null;

  const cleanup = () => {
    if (!isCleanedUp) {
      isCleanedUp = true;
      try { abortController.abort(); } catch (_) {}
      if (upstreamStream && !upstreamStream.destroyed) {
        try { upstreamStream.destroy(); } catch (_) {}
      }
    }
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
  res.on('finish', cleanup);
  res.on('error', () => {
    cleanup();
  });

  try {
    const userAgent = req.headers['user-agent'] || '';
    const isAppleSafari = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && !/Chrome|CriOS/i.test(userAgent));
    const preferredFormat = req.query.format || (isAppleSafari ? 'mp4' : null);

    let format = await resolveAudioFormat(videoId, preferredFormat);
    if (!format || !format.url) {
      throw new Error('No streaming URL resolved');
    }

    const MAX_UPSTREAM_REDIRECTS = 3;

    const fetchUpstream = async (targetUrl) => {
      let currentUrl = targetUrl;
      let redirectsFollowed = 0;

      while (true) {
        // SEC-05: Enforce HTTPS and validate against Google/YouTube media domains
        try {
          const parsed = new URL(currentUrl);
          if (parsed.protocol !== 'https:' || !/(?:googlevideo\.com|youtube\.com)$/i.test(parsed.hostname)) {
            throw new Error(`Forbidden upstream audio host: ${parsed.hostname}`);
          }
        } catch (urlErr) {
          throw new Error('Invalid upstream streaming URL: ' + urlErr.message);
        }

        const upstreamHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        };
        if (req.headers.range) {
          upstreamHeaders['Range'] = req.headers.range;
        }

        const res = await axios.get(currentUrl, {
          headers: upstreamHeaders,
          responseType: 'stream',
          signal: abortController.signal,
          timeout: 10000,
          maxRedirects: 0, // SEC-05: Prevent uncontrolled SSRF redirect chasing
          validateStatus: (status) => (status >= 200 && status < 400) || status === 416
        });

        // BE-05: Handle HTTP 3xx redirects securely by following up to MAX_UPSTREAM_REDIRECTS
        if (res.status >= 300 && res.status < 400) {
          const location = res.headers['location'];
          if (!location) {
            throw new Error(`Upstream redirected with HTTP ${res.status} but no Location header`);
          }
          if (redirectsFollowed >= MAX_UPSTREAM_REDIRECTS) {
            throw new Error(`Too many upstream redirects (limit ${MAX_UPSTREAM_REDIRECTS})`);
          }
          // Destroy unconsumed redirect stream body to prevent socket/memory leaks
          if (res.data && typeof res.data.destroy === 'function') {
            res.data.destroy();
          }
          currentUrl = new URL(location, currentUrl).href;
          redirectsFollowed++;
          continue;
        }

        return res;
      }
    };

    let upstreamRes;
    try {
      upstreamRes = await fetchUpstream(format.url);
    } catch (err) {
      const status = err.response?.status;
      if (status === 403 || status === 410 || status === 404) {
        const cacheKey = preferredFormat ? `${videoId}_${preferredFormat}` : videoId;
        streamUrlCache.delete(cacheKey);
        streamUrlCache.delete(videoId);
        format = await resolveAudioFormat(videoId, preferredFormat);
        upstreamRes = await fetchUpstream(format.url);
      } else {
        throw err;
      }
    }

    // BE-03: Handle HTTP 416 Range Not Satisfiable cleanly
    if (upstreamRes.status === 416) {
      res.setHeader('Accept-Ranges', 'bytes');
      if (upstreamRes.headers['content-range']) {
        res.setHeader('Content-Range', upstreamRes.headers['content-range']);
      }
      return res.status(416).end();
    }

    // BE-04: Set CORS and range caching headers (no-cache private, Vary: Range)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'no-cache, private');
    res.setHeader('Vary', 'Range');

    const contentType = upstreamRes.headers['content-type'] || format.mimeType || (preferredFormat === 'mp4' ? 'audio/mp4; codecs="mp4a.40.2"' : 'audio/webm; codecs="opus"');
    res.setHeader('Content-Type', contentType);

    if (upstreamRes.headers['content-range']) {
      res.setHeader('Content-Range', upstreamRes.headers['content-range']);
    }
    if (upstreamRes.headers['content-length']) {
      res.setHeader('Content-Length', upstreamRes.headers['content-length']);
    }

    res.status(upstreamRes.status);

    upstreamStream = upstreamRes.data;

    upstreamRes.data.on('error', (streamErr) => {
      cleanup();
      if (!res.headersSent) {
        try { res.status(500).end(); } catch (_) {}
      } else {
        try { res.end(); } catch (_) {}
      }
    });

    upstreamRes.data.pipe(res);
  } catch (error) {
    if (abortController.signal.aborted || req.destroyed) {
      return;
    }
    console.warn(`Direct stream error for ${videoId}:`, error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Playback stream failed', message: error.message });
    }
  }
}

module.exports = {
  searchMusic,
  getHomeFeed,
  getSongDetails,
  streamAudio,
  resolveAudioFormat,
  streamUrlCache,
  infoCache
};
