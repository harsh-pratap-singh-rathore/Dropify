const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Optimized Ytdl instance targeting embedded, TV, and visionos clients (zero player.js blocking, zero PO token requirement)
let ytdlInstance = null;
function getYtdl() {
  if (!ytdlInstance) {
    try {
      const { Ytdl } = require('@distube/ytdl-core');
      ytdlInstance = new Ytdl({
        clients: ['visionos'],
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
}

// In-memory format & metadata cache (Bounded LRU, TTL: 5 hours)
const infoCache = new BoundedLRUCache(500, 5 * 3600 * 1000);
const streamUrlCache = new BoundedLRUCache(500, 5 * 3600 * 1000);

/**
 * Searches music tracks on YouTube using official InnerTube JSON API (Zero scraping, works on cloud IPs)
 */
async function searchWithInnerTube(query) {
  const res = await axios.post('https://www.youtube.com/youtubei/v1/search', {
    query: query.trim(),
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

  const sections = res.data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
  const tracks = [];

  for (const sec of sections) {
    const items = sec.itemSectionRenderer?.contents || [];
    for (const item of items) {
      const v = item.videoRenderer;
      if (v && v.videoId && v.title?.runs?.[0]?.text) {
        const durationFormatted = v.lengthText?.simpleText || '0:00';
        const parts = durationFormatted.split(':').map(p => parseInt(p, 10));
        const duration = parts.length === 2 ? parts[0] * 60 + parts[1] : (parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : 0);

        // Strict song filter: exclude long DJ mixes, 2-3 hour compilations, or audiobooks (>10 mins)
        if (duration > 600 || parts.length >= 3) {
          continue;
        }

        tracks.push({
          id: v.videoId,
          title: v.title.runs[0].text,
          artist: v.ownerText?.runs?.[0]?.text || 'Various Artists',
          duration,
          durationFormatted,
          thumbnail: `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`,
          thumbnailHigh: `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          views: v.viewCountText?.simpleText || ''
        });
      }
    }
  }

  return tracks.slice(0, 30);
}

async function searchWithYtdl(query) {
  const ytdl = await getYtdl();
  if (!ytdl) throw new Error('Ytdl not initialized');
  const items = await ytdl.search(query.trim(), { limit: 25 });
  return (items || [])
    .filter(v => (v.lengthSeconds || 0) <= 600)
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
  const results = await yts(query);
  return (results.videos || [])
    .filter(v => (v.seconds || 0) <= 600)
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
  "Spotify Quick Picks": [
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
    },
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
    },
    {
      "id": "TUVcZfQe-Kw",
      "title": "Levitating",
      "artist": "Dua Lipa",
      "duration": 203,
      "durationFormatted": "3:23",
      "thumbnail": "https://i.ytimg.com/vi/TUVcZfQe-Kw/mqdefault.jpg",
      "thumbnailHigh": "https://i.ytimg.com/vi/TUVcZfQe-Kw/hqdefault.jpg"
    }
  ],
  "Trending Tracks": [
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
      "id": "7-x3uDFvHf4",
      "title": "Apna Bana Le - Bhediya",
      "artist": "Arijit Singh, Sachin-Jigar",
      "duration": 261,
      "durationFormatted": "4:21",
      "thumbnail": "https://i.ytimg.com/vi/7-x3uDFvHf4/mqdefault.jpg",
      "thumbnailHigh": "https://i.ytimg.com/vi/7-x3uDFvHf4/hqdefault.jpg"
    },
    {
      "id": "34Na4j8AVgA",
      "title": "Starboy",
      "artist": "The Weeknd ft. Daft Punk",
      "duration": 230,
      "durationFormatted": "3:50",
      "thumbnail": "https://i.ytimg.com/vi/34Na4j8AVgA/mqdefault.jpg",
      "thumbnailHigh": "https://i.ytimg.com/vi/34Na4j8AVgA/hqdefault.jpg"
    },
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
const HOME_CACHE_FILE = path.join(__dirname, '..', 'data', 'home_feed_cache.json');
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

// Echo Music Circadian Mood Seeds & Themes Catalog (35+ Seeds)
const MOOD_CATALOG = {
  morning: {
    greeting: 'Good Morning',
    moment: 'Morning Momentum',
    sections: [
      { title: 'Morning Acoustic Coffee', query: 'acoustic morning coffee indie' },
      { title: 'Upbeat Morning Energy', query: 'upbeat positive morning pop hits' },
      { title: 'Fresh Daily Discoveries', query: 'fresh hits discover 2026' },
      { title: 'Bollywood Morning Melodies', query: 'bollywood acoustic soul unplugged' },
      { title: 'Feel-Good Indie Folk', query: 'indie folk acoustic sunshine' }
    ]
  },
  afternoon: {
    greeting: 'Good Afternoon',
    moment: 'Deep Focus Flow',
    sections: [
      { title: 'Deep Work Beats', query: 'lo-fi beats to study relax' },
      { title: 'Instrumental Concentration', query: 'chill instrumental electronic beats' },
      { title: 'Indie Afternoon Chill', query: 'indie afternoon acoustic pop' },
      { title: 'Synthwave Velocity', query: 'retrowave synthwave 80s chill' },
      { title: 'Global Radio Top 50', query: 'global top 50 hits 2026' }
    ]
  },
  evening: {
    greeting: 'Good Evening',
    moment: 'Golden Hour Sunset',
    sections: [
      { title: 'Golden Hour Anthems', query: 'sunset golden hour acoustic hits' },
      { title: 'Trending Global Anthems', query: 'trending music viral hits' },
      { title: 'Desi Pop & Punjabi Energy', query: 'punjabi pop hits 2026 arijit diljit' },
      { title: 'Electronic Sunset Chill', query: 'future bass electronic sunset vibes' },
      { title: 'Evening Wind-Down', query: 'acoustic guitar chill evening unplugged' }
    ]
  },
  night: {
    greeting: 'Late Night Notes',
    moment: 'Midnight Lo-Fi & Chill',
    sections: [
      { title: 'Midnight Lo-Fi Doodles', query: 'midnight lofi chill beats sleep' },
      { title: 'Late Night Drives', query: 'synthwave night drive retro' },
      { title: 'Dark Ambient Chill', query: 'dark ambient acoustic soul' },
      { title: 'Smooth Midnight R&B', query: 'smooth rnb late night vibes' },
      { title: 'Sleep & Peaceful Piano', query: 'peaceful piano acoustic calm' }
    ]
  }
};

const EXTRA_GENRE_SEEDS = [
  { title: 'Bollywood Classics Reimagined', query: 'bollywood unplugged acoustic covers' },
  { title: 'Global Viral Radar', query: 'viral hits global top 50 2026' },
  { title: 'Phonk & Workout Drive', query: 'gym workout phonk hype music' },
  { title: 'Lo-Fi Chillhop Coffee', query: 'chillhop jazz beats lofi study' },
  { title: 'Indie Dream Pop', query: 'dream pop indie alternative' },
  { title: 'Punjabi Top Hits', query: 'top punjabi pop songs' },
  { title: 'Acoustic Soul', query: 'acoustic soul guitar vocals' },
  { title: 'Synthpop & Neon Beats', query: 'synthpop modern electronic hits' }
];

function getCircadianPeriod(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

const TRENDING_QUERIES = [
  'top global hit songs official audio',
  'chart topping hits pop music 2026',
  'trending music popular songs',
  'top 50 hit tracks radio',
  'viral songs 2026 hits'
];

const QUICK_PICK_QUERIES = [
  'popular acoustic indie songs',
  'fresh new songs official audio',
  'top catchy pop tracks',
  'acoustic guitar vocal hits',
  'popular radio hits 2026'
];

/**
 * Echo Music Dynamic Home Feed Engine
 * Generates fresh, contextual music shelves tailored to the time of day and diverse seeds.
 */
async function getHomeFeed(options = {}) {
  const { mood = null, forceRefresh = false, hour = new Date().getHours() } = options;
  const period = mood && MOOD_CATALOG[mood] ? mood : getCircadianPeriod(hour);
  const moodConfig = MOOD_CATALOG[period];

  if (!forceRefresh && inMemoryHomeFeed && Object.keys(inMemoryHomeFeed).length > 0 && (Date.now() - lastHomeRefresh < 1200000)) {
    return inMemoryHomeFeed;
  }

  // Randomize core shelf queries so re-roll always produces brand new songs
  const trendingQuery = TRENDING_QUERIES[Math.floor(Math.random() * TRENDING_QUERIES.length)];
  const quickQuery = QUICK_PICK_QUERIES[Math.floor(Math.random() * QUICK_PICK_QUERIES.length)];

  // Curate dynamic section seeds
  const chosenSections = [
    { title: 'Trending Tracks', query: trendingQuery },
    { title: 'Spotify Quick Picks', query: quickQuery }
  ];

  // Add 2 randomized sections from the current circadian mood
  const moodShuffled = [...moodConfig.sections].sort(() => 0.5 - Math.random());
  chosenSections.push(moodShuffled[0]);
  if (moodShuffled[1]) chosenSections.push(moodShuffled[1]);

  // Add 1-2 random extra genre seeds for discovery variety
  const extraShuffled = [...EXTRA_GENRE_SEEDS].sort(() => 0.5 - Math.random());
  chosenSections.push(extraShuffled[0]);
  if (extraShuffled[1]) chosenSections.push(extraShuffled[1]);

  try {
    const promises = chosenSections.map(async (sec) => {
      try {
        const rawTracks = await searchMusic(sec.query);
        // Exclude >10min tracks, and shuffle so rotation is obvious and fun
        const filtered = rawTracks.filter(t => (t.duration || 0) <= 600);
        const shuffled = filtered.sort(() => 0.5 - Math.random()).slice(0, 10);
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
        fs.writeFileSync(HOME_CACHE_FILE, JSON.stringify(results, null, 2), 'utf-8');
      } catch (e) {}
    }

    return inMemoryHomeFeed || results;
  } catch (error) {
    console.error('Home feed dynamic refresh error:', error.message);
    return inMemoryHomeFeed || DEFAULT_HOME_FEED;
  }
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
  const info = await ytdl.getInfo(videoId);
  const audioFormats = (info.formats || []).filter(f => f.hasAudio && !f.hasVideo && f.url);

  if (audioFormats.length === 0) {
    throw new Error('No direct audio format found');
  }

  // Prioritize based on preferred format or default:
  // itag 251 (Opus WebM 160kbps) & itag 140 (AAC 128kbps M4A)
  const sorted = audioFormats.sort((a, b) => {
    if (preferredFormat === 'mp4' || preferredFormat === 'aac') {
      if (a.itag === 140) return -1;
      if (b.itag === 140) return 1;
    }
    if (a.itag === 251) return -1;
    if (b.itag === 251) return 1;
    if (a.itag === 140) return -1;
    if (b.itag === 140) return 1;
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

  const cleanup = () => {
    if (!isCleanedUp) {
      isCleanedUp = true;
      try {
        abortController.abort();
      } catch (_) {}
    }
  };

  req.on('close', cleanup);
  res.on('close', cleanup);
  res.on('finish', cleanup);

  try {
    const userAgent = req.headers['user-agent'] || '';
    const isAppleSafari = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && !/Chrome|CriOS/i.test(userAgent));
    const preferredFormat = req.query.format || (isAppleSafari ? 'mp4' : null);

    let format = await resolveAudioFormat(videoId, preferredFormat);
    if (!format || !format.url) {
      throw new Error('No streaming URL resolved');
    }

    const fetchUpstream = async (targetUrl) => {
      const upstreamHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      };
      if (req.headers.range) {
        upstreamHeaders['Range'] = req.headers.range;
      }
      return axios.get(targetUrl, {
        headers: upstreamHeaders,
        responseType: 'stream',
        signal: abortController.signal,
        validateStatus: (status) => status >= 200 && status < 400
      });
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

    // Set CORS and streaming headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Accept');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');

    const contentType = upstreamRes.headers['content-type'] || format.mimeType || (preferredFormat === 'mp4' ? 'audio/mp4; codecs="mp4a.40.2"' : 'audio/webm; codecs="opus"');
    res.setHeader('Content-Type', contentType);

    if (upstreamRes.headers['content-range']) {
      res.setHeader('Content-Range', upstreamRes.headers['content-range']);
    }
    if (upstreamRes.headers['content-length']) {
      res.setHeader('Content-Length', upstreamRes.headers['content-length']);
    }

    res.status(upstreamRes.status);

    upstreamRes.data.on('error', (streamErr) => {
      cleanup();
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.end();
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
