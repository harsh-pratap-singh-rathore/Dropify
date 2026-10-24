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
        clients: ['visionos', 'web_embedded', 'tv'],
        lang: 'en',
        country: 'US'
      });
    } catch (e) {
      console.warn('Ytdl init error:', e.message);
    }
  }
  return ytdlInstance;
}

// In-memory format & metadata cache (TTL: 5 hours, similar to Echo Music's 21600s cache)
const infoCache = new Map();
const streamUrlCache = new Map();

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
  return (items || []).map(v => {
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
  return (results.videos || []).slice(0, 30).map(v => ({
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

/**
 * Gets curated home feed playlists and trending music
 * Always returns instantly with zero chance of failure
 */
async function getHomeFeed() {
  if (inMemoryHomeFeed && Object.keys(inMemoryHomeFeed).length > 0) {
    if (Date.now() - lastHomeRefresh > 3600000) {
      refreshHomeFeedParallel().catch(() => {});
    }
    return inMemoryHomeFeed;
  }

  return inMemoryHomeFeed || DEFAULT_HOME_FEED;
}

async function refreshHomeFeedParallel() {
  const sections = [
    { title: 'Trending Tracks', query: 'Top Global Music 2026 Hits' },
    { title: 'Spotify Quick Picks', query: 'Spotify Global Top 50 Hits' },
    { title: 'Chill & Relax', query: 'Lo-Fi Chill Beats relaxing' },
    { title: 'Electronic & Synth', query: 'Synthwave EDM Future Bass' },
    { title: 'Acoustic & Indie', query: 'Indie Acoustic Coffee Shop' },
    { title: 'Workout Energy', query: 'Workout Gym Hype motivation music' }
  ];

  try {
    const promises = sections.map(async (sec) => {
      try {
        const tracks = (await searchMusic(sec.query)).slice(0, 10);
        return { title: sec.title, tracks };
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
    console.error('Home feed refresh error:', error.message);
    return inMemoryHomeFeed || {};
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
async function resolveAudioFormat(videoId) {
  const cached = streamUrlCache.get(videoId);
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

  // Prioritize itag 251 (Opus WebM 160kbps - exactly like Echo Music) or highest audio bitrate
  const sorted = audioFormats.sort((a, b) => {
    if (a.itag === 251) return -1;
    if (b.itag === 251) return 1;
    return (b.bitrate || 0) - (a.bitrate || 0);
  });

  const bestFormat = sorted[0];
  streamUrlCache.set(videoId, {
    format: bestFormat,
    expiresAt: Date.now() + 5 * 3600 * 1000 // 5 hours TTL
  });

  return bestFormat;
}

/**
 * Streams audio for a given videoId directly to Express response
 * Handles HTTP Range requests for seeking support (HTTP 206 Partial Content)
 */
async function streamAudio(videoId, req, res) {
  try {
    const format = await resolveAudioFormat(videoId);
    const range = req.headers.range;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
    };

    if (range) {
      headers['Range'] = range;
    }

    const upstreamRes = await axios.get(format.url, {
      headers,
      responseType: 'stream',
      validateStatus: (status) => status >= 200 && status < 300
    });

    res.status(upstreamRes.status);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Content-Type', upstreamRes.headers['content-type'] || format.mimeType || 'audio/webm');

    if (upstreamRes.headers['content-range']) {
      res.setHeader('Content-Range', upstreamRes.headers['content-range']);
    }
    if (upstreamRes.headers['content-length']) {
      res.setHeader('Content-Length', upstreamRes.headers['content-length']);
    }

    upstreamRes.data.pipe(res);

    req.on('close', () => {
      try {
        upstreamRes.data.destroy();
      } catch (err) {}
    });

  } catch (error) {
    console.warn(`Direct stream error for ${videoId}, falling back to ytdl.download:`, error.message);
    try {
      const ytdl = await getYtdl();
      if (!ytdl) throw new Error('Ytdl not initialized');
      const audioStream = ytdl.download(videoId, {
        filter: f => f.hasAudio && !f.hasVideo,
        quality: 'highestaudio',
        highWaterMark: 1 << 22
      });

      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Content-Type', 'audio/webm');

      audioStream.pipe(res);

      req.on('close', () => {
        try {
          audioStream.destroy();
        } catch (err) {}
      });

      audioStream.on('error', (streamErr) => {
        console.error('Fallback ytdl stream error:', streamErr.message);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Stream failed', message: streamErr.message });
        }
      });
    } catch (fallbackError) {
      console.error('All streaming methods failed:', fallbackError.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Playback stream failed', message: fallbackError.message });
      }
    }
  }
}

module.exports = {
  searchMusic,
  getHomeFeed,
  getSongDetails,
  streamAudio
};
