const axios = require('axios');

// In-memory lyrics cache: key -> data
const lyricsCache = new Map();

const LABEL_REGEX = /(?:music\s+india|records|t-series|zee\s+music|sony\s+music|yrf|saregama|tips\s+official|speed\s+records|geet\s+mp3|white\s+hill|desimelodies|universal\s+music|warner\s+music|vevo|topic|channel)/i;

/**
 * Robust port and extension of Echo Music's MetadataCleaner.kt
 * Cleans YouTube titles and artist junk (pipes, Urdu/Hindi tags, 'by Artist', 'and 2 more', etc.)
 */
function cleanTrackMetadata(rawTitle, rawArtist) {
  let title = (rawTitle || '').trim();
  let artist = (rawArtist || '').trim();
  const extraArtists = [];

  // 1. Strip YouTube specific artist junk
  artist = artist
    .replace(/\s+and\s+\d+\s+more\b/gi, '')
    .replace(/\s+and\s+others\b/gi, '')
    .replace(/\s*-\s*Topic\b/gi, '')
    .replace(/VEVO\b/gi, '')
    .replace(/\s+Official\b/gi, '')
    .replace(/\s+Records\b/gi, '')
    .trim();

  // 2. Extract pipes: e.g. 'Kesariya - Brahmāstra | Ranbir Kapoor | Alia Bhatt | Pritam | Arijit Singh'
  if (title.includes('|')) {
    const pipeParts = title.split('|').map(p => p.trim()).filter(Boolean);
    if (pipeParts.length >= 2) {
      title = pipeParts[0];
      for (let i = 1; i < pipeParts.length; i++) {
        const seg = pipeParts[i];
        const isJunk = /(?:official|video|visualizer|audio|mv|lyrics?|remaster|hd|4k|lyrical|promo|teaser)/i.test(seg);
        if (!isJunk && seg.length > 1 && !LABEL_REGEX.test(seg)) {
          // If segment has multiple comma-separated names, split them
          const subNames = seg.split(/[,&/]/).map(n => n.trim()).filter(Boolean);
          extraArtists.push(...subNames);
        }
      }
      if ((!artist || artist.toLowerCase() === 'unknown artist' || LABEL_REGEX.test(artist)) && extraArtists.length > 0) {
        artist = extraArtists[0];
      }
    }
  }

  // 3. Handle 'by Artist' in title: e.g. 'Tu Hai Kahan by AUR'
  const byMatch = title.match(/^(.*?)\s+by\s+(.*?)$/i);
  if (byMatch) {
    title = byMatch[1].trim();
    if (!artist || artist.toLowerCase() === 'unknown artist' || LABEL_REGEX.test(artist)) {
      artist = byMatch[2].trim();
    }
  }

  // 4. Handle 'Artist - Title' vs 'Title - Artist' vs 'Title - Movie'
  if (title.includes(' - ')) {
    const parts = title.split(/\s+-\s+/);
    if (parts.length >= 2) {
      const p0 = parts[0].trim();
      const p1 = parts.slice(1).join(' - ').trim();

      if (artist && p0.toLowerCase().includes(artist.toLowerCase())) {
        title = p1;
      } else if (artist && p1.toLowerCase().includes(artist.toLowerCase())) {
        title = p0;
      } else if (/(?:official|video|visualizer|audio|mv|lyrics?|remaster|hd|4k|prod)/i.test(p1)) {
        title = p0;
      } else if (!artist || LABEL_REGEX.test(artist)) {
        artist = p0;
        title = p1;
      }
    }
  }

  // 5. Remove video/audio/language/format brackets
  title = title.replace(
    /[\(\[\{【「][^\)\]\}】」]*(?:official|video|music video|audio|lyric|lyrics|visualizer|live|remaster|remastered|4k|hd|prod\.|topic|edit|clip|from\s+"?|movie|soundtrack|song|version|hindi|punjabi|telugu|tamil|bhojpuri|malayalam|kannada)[^\)\]\}】」]*[\)\]\}】」]/gi,
    ' '
  );

  // 6. Remove non-Latin characters from title if Latin characters exist (e.g. Urdu/Arabic/Hindi translation tags like '| تو ہے کہاں')
  const hasLatin = /[a-zA-Z]/.test(title);
  if (hasLatin) {
    title = title.replace(/[^\x00-\x7F\s\-'\.,&]/g, ' ');
  }

  // 7. Remove featuring tags: (feat. Daft Punk), ft. Bruno Mars
  title = title.replace(/[\(\[]\s*(?:feat\.?|ft\.?|featuring)\s+[^\)\]]+[\)\]]/gi, ' ');
  title = title.replace(/\s+(?:feat\.?|ft\.?|featuring)\s+.*$/i, ' ');

  // 8. Clean up punctuation and whitespace
  title = title.replace(/[\(\)\[\]\{\}\|]/g, ' ').replace(/\s+/g, ' ').trim();
  title = title.replace(/^[\s\-_–—]+|[\s\-_–—]+$/g, '').trim();

  // Primary artist: split by '&', ',', '/', 'x', 'and', 'feat'
  const primaryArtist = (artist || '')
    .split(/\s*(?:&|,|\/|x|X|\band\b|\bfeat\.?\b|\bft\.?\b)\s*/)[0]
    .replace(/[^\w\s\u00C0-\u024F]/gi, '')
    .trim();

  return {
    cleanTitle: title,
    cleanArtist: artist,
    primaryArtist: primaryArtist || artist,
    extraArtists
  };
}

/**
 * Generates candidate title variations for maximum search matching
 * Prioritizes the cleanest, shortest song name first
 */
function getCandidateTitles(rawTitle, cleanTitle) {
  const list = [];

  // 1. Root song name before '-' (e.g. 'Kesariya - Brahmāstra' -> 'Kesariya')
  if (cleanTitle.includes('-')) {
    const beforeDash = cleanTitle.split('-')[0].trim();
    if (beforeDash.length >= 2) list.push(beforeDash);
  }

  // 2. Root song name after ':' (e.g. 'Diljit Dosanjh: G.O.A.T.' -> 'G.O.A.T.')
  if (rawTitle.includes(':')) {
    const afterColon = rawTitle.split(':').slice(1).join(':').replace(/[\(\[].*?[\)\]]/g, '').trim();
    if (afterColon.length >= 2) list.push(afterColon);
  }

  // 3. Full cleanTitle
  if (cleanTitle && !list.includes(cleanTitle)) list.push(cleanTitle);

  // 4. Strip common movie or language filler words
  for (const c of [...list]) {
    const stripped = c
      .replace(/\b(?:Hindi|Tamil|Telugu|Punjabi|Malayalam|Kannada|Bhojpuri|Bengali|Version|Audio|Lyrical|Song|Full Song|Title Track)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (stripped && stripped.length >= 2 && !list.includes(stripped)) list.push(stripped);
  }

  return list;
}

/**
 * Robust LRC timestamp parser
 */
function parseLrc(lrcText) {
  if (!lrcText || typeof lrcText !== 'string') return [];
  const lines = lrcText.split('\n');
  const result = [];
  const lrcRegex = /\[(\d{1,2}):(\d{2})(?:\.(\d{1,3}))?\](.*)/;

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      !trimmed ||
      trimmed.startsWith('[ar:') ||
      trimmed.startsWith('[ti:') ||
      trimmed.startsWith('[al:') ||
      trimmed.startsWith('[by:') ||
      trimmed.startsWith('[offset:')
    ) {
      continue;
    }

    const match = lrcRegex.exec(trimmed);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const msStr = match[3] || '0';
      const milliseconds = parseInt(msStr.padEnd(3, '0').slice(0, 3), 10);
      const time = minutes * 60 + seconds + milliseconds / 1000;
      let text = match[4].trim();

      text = text.replace(/<\d{1,2}:\d{2}(?:\.\d{1,3})?>/g, '').replace(/\{bg\}/g, '').trim();

      if (text) {
        result.push({ time, text });
      }
    }
  }

  result.sort((a, b) => a.time - b.time);
  return result;
}

/**
 * Convert plain text lyrics into structured lines with proportional time estimates
 */
function formatPlainLyrics(plainText, durationSeconds = null) {
  if (!plainText || typeof plainText !== 'string') return [];
  const rawLines = plainText.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('[') && !l.endsWith(']'));
  if (rawLines.length === 0) return [];

  const duration = durationSeconds ? parseFloat(durationSeconds) : rawLines.length * 4;
  return rawLines.map((text, idx) => ({
    time: Math.round(((idx / rawLines.length) * duration) * 10) / 10,
    text
  }));
}

/**
 * Multi-Engine Lyrics Resolver (LRCLIB Direct + Search -> Unison -> YouLyPlus -> Lyrics.ovh)
 * Guarantees lyrics resolution across global tracks (English, Bollywood, Punjabi, Pop, Indie, etc.)
 */
async function getLyrics(trackName, artistName, durationSeconds = null, videoId = null) {
  const { cleanTitle, cleanArtist, primaryArtist, extraArtists } = cleanTrackMetadata(trackName, artistName);
  const candidateTitles = getCandidateTitles(trackName, cleanTitle);

  // Filter out record labels from artists
  const validArtists = [primaryArtist, ...extraArtists]
    .filter(a => a && a.length > 1 && !LABEL_REGEX.test(a));
  const candidateArtists = Array.from(new Set(validArtists));

  const cacheKey = `${cleanTitle.toLowerCase()}_${primaryArtist.toLowerCase()}`;
  if (lyricsCache.has(cacheKey)) {
    const cached = lyricsCache.get(cacheKey);
    if (cached.found) return cached;
  }

  const duration = durationSeconds ? Math.round(parseFloat(durationSeconds)) : null;
  const headers = {
    'User-Agent': 'DropifyMusic/2.0 (Audiophile Web Engine; https://github.com)'
  };

  const rootTitle = candidateTitles[0] || cleanTitle;

  // --- Tier 1: Fast Parallel Search on LRCLIB with root title ---
  // Searching LRCLIB gives immediate matches for both exact & variation titles in <300ms
  try {
    const queries = [
      candidateArtists.length > 0 ? `${rootTitle} ${candidateArtists[0]}` : null,
      rootTitle
    ].filter(Boolean);

    for (const q of queries) {
      const searchResp = await axios.get('https://lrclib.net/api/search', {
        params: { q },
        timeout: 2200,
        headers
      });

      if (searchResp.data && searchResp.data.length > 0) {
        const best = searchResp.data.find(item => item.syncedLyrics) || searchResp.data[0];
        const synced = parseLrc(best.syncedLyrics);
        const resData = {
          found: true,
          synced: synced.length > 0,
          lines: synced.length > 0 ? synced : formatPlainLyrics(best.plainLyrics, duration),
          plain: best.plainLyrics || '',
          provider: 'LRCLIB (Search)',
          cleanTitle: best.trackName || rootTitle,
          primaryArtist: best.artistName || (candidateArtists[0] || primaryArtist)
        };
        lyricsCache.set(cacheKey, resData);
        return resData;
      }
    }
  } catch (e) { }

  // --- Tier 2: LRCLIB Direct Match ---
  for (const title of candidateTitles) {
    for (const artist of candidateArtists.slice(0, 2)) {
      try {
        const params = { track_name: title, artist_name: artist };
        if (duration) params.duration = duration;

        const resp = await axios.get('https://lrclib.net/api/get', { params, timeout: 1800, headers });
        if (resp.data && (resp.data.syncedLyrics || resp.data.plainLyrics)) {
          const synced = parseLrc(resp.data.syncedLyrics);
          const resData = {
            found: true,
            synced: synced.length > 0,
            lines: synced.length > 0 ? synced : formatPlainLyrics(resp.data.plainLyrics, duration),
            plain: resp.data.plainLyrics || '',
            provider: 'LRCLIB (Direct)',
            cleanTitle: title,
            primaryArtist: artist
          };
          lyricsCache.set(cacheKey, resData);
          return resData;
        }
      } catch (e) { }
    }
  }

  // --- Tier 3: Unison API (from Echo Music: https://unison.boidu.dev) ---
  for (const title of candidateTitles.slice(0, 2)) {
    try {
      const unisonParams = { song: title, artist: candidateArtists[0] || primaryArtist };
      if (duration) unisonParams.duration = duration;

      const uResp = await axios.get('https://unison.boidu.dev/lyrics', {
        params: unisonParams,
        timeout: 2000,
        headers
      });

      if (uResp.data?.success && uResp.data?.data?.lyrics) {
        const synced = parseLrc(uResp.data.data.lyrics);
        const resData = {
          found: true,
          synced: synced.length > 0,
          lines: synced.length > 0 ? synced : formatPlainLyrics(uResp.data.data.lyrics, duration),
          plain: uResp.data.data.lyrics,
          provider: 'Unison Engine',
          cleanTitle: title,
          primaryArtist: candidateArtists[0] || primaryArtist
        };
        lyricsCache.set(cacheKey, resData);
        return resData;
      }
    } catch (e) { }
  }

  // --- Tier 4: YouLyPlus / LyricsPlus community mirrors (from Echo Music) ---
  const mirrors = [
    'https://lyricsplus-seven.vercel.app',
    'https://lyrics-plus-backend.vercel.app',
    'https://lyricsplus.prjktla.my.id'
  ];

  for (const mirror of mirrors) {
    try {
      const youlyResp = await axios.get(`${mirror}/v2/lyrics/get`, {
        params: {
          title: rootTitle,
          artist: candidateArtists[0] || primaryArtist,
          duration: duration || undefined
        },
        timeout: 2000,
        headers
      });

      if (youlyResp.data && (youlyResp.data.syncedLyrics || youlyResp.data.plainLyrics)) {
        const synced = parseLrc(youlyResp.data.syncedLyrics);
        const resData = {
          found: true,
          synced: synced.length > 0,
          lines: synced.length > 0 ? synced : formatPlainLyrics(youlyResp.data.plainLyrics, duration),
          plain: youlyResp.data.plainLyrics || '',
          provider: 'YouLyPlus Engine',
          cleanTitle: rootTitle,
          primaryArtist: candidateArtists[0] || primaryArtist
        };
        lyricsCache.set(cacheKey, resData);
        return resData;
      }
    } catch (e) { }
  }

  // --- Tier 5: Lyrics.ovh Global Plain Lyrics Fallback ---
  for (const title of candidateTitles.slice(0, 2)) {
    for (const artist of candidateArtists.slice(0, 2)) {
      try {
        const ovhResp = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`, {
          timeout: 2000
        });

        if (ovhResp.data?.lyrics) {
          const formatted = formatPlainLyrics(ovhResp.data.lyrics, duration);
          if (formatted.length > 0) {
            const resData = {
              found: true,
              synced: false,
              lines: formatted,
              plain: ovhResp.data.lyrics,
              provider: 'Lyrics.ovh',
              cleanTitle: title,
              primaryArtist: artist
            };
            lyricsCache.set(cacheKey, resData);
            return resData;
          }
        }
      } catch (e) { }
    }
  }

  // Not found
  return {
    found: false,
    synced: false,
    lines: [],
    plain: 'Lyrics currently unavailable for this track.',
    cleanTitle: rootTitle,
    primaryArtist: candidateArtists[0] || primaryArtist
  };
}

module.exports = {
  getLyrics,
  parseLrc,
  formatPlainLyrics,
  cleanTrackMetadata,
  getCandidateTitles
};
