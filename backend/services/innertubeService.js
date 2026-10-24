const yts = require('yt-search');
const { Ytdl } = require('@distube/ytdl-core');
const axios = require('axios');

// Initialize Ytdl instance
const ytdl = new Ytdl();

// In-memory format & metadata cache (TTL: 5 hours, similar to Echo Music's 21600s cache)
const infoCache = new Map();
const streamUrlCache = new Map();

/**
 * Searches music tracks on YouTube
 */
async function searchMusic(query) {
  try {
    const results = await yts(query);
    const videos = (results.videos || []).slice(0, 30).map(v => ({
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
    return videos;
  } catch (error) {
    console.error('Search error:', error.message);
    return [];
  }
}

const fs = require('fs');
const path = require('path');

// Home Feed Disk Cache Path
const HOME_CACHE_FILE = path.join(__dirname, '..', 'data', 'home_feed_cache.json');
let inMemoryHomeFeed = null;
let lastHomeRefresh = 0;

try {
  if (fs.existsSync(HOME_CACHE_FILE)) {
    inMemoryHomeFeed = JSON.parse(fs.readFileSync(HOME_CACHE_FILE, 'utf-8'));
  }
} catch (e) {
  console.warn('Failed to load initial home feed cache:', e.message);
}

/**
 * Gets curated home feed playlists and trending music
 * Returns in 0ms from cache, and triggers parallel background refresh
 */
async function getHomeFeed() {
  // If we have cached feed, return instantly
  if (inMemoryHomeFeed && Object.keys(inMemoryHomeFeed).length > 0) {
    if (Date.now() - lastHomeRefresh > 3600000) {
      refreshHomeFeedParallel();
    }
    return inMemoryHomeFeed;
  }

  return await refreshHomeFeedParallel();
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
        const searchRes = await yts(sec.query);
        const tracks = (searchRes.videos || []).slice(0, 10).map((v) => ({
          id: v.videoId,
          title: v.title,
          artist: v.author?.name || 'Various Artists',
          duration: v.seconds,
          durationFormatted: v.timestamp,
          thumbnail: v.videoId ? `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg` : (v.thumbnail || ''),
          thumbnailHigh: v.videoId ? `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` : (v.thumbnail || '')
        }));
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
