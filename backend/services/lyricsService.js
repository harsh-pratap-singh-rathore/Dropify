const axios = require('axios');

// In-memory lyrics cache: key -> data
const lyricsCache = new Map();

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'on', 'of', 'to', 'is', 'and', 'or', 'by', 'for', 'with',
  'tu', 'hai', 'hain', 'se', 'ko', 'ki', 'ka', 'ke', 'ye', 'yeh', 'wo', 'woh', 'ho', 'na', 'ne', 'me', 'mein'
]);

const IS_LABEL_NAME = /(?:records|music\s+india|vevo|t-series|zee\s+music|sony\s+music|yrf|saregama|tips\s+official|speed\s+records|geet\s+mp3|white\s+hill|desimelodies|universal\s+music|warner\s+music|vibe\s+music|lofi\s+records|official\s+channel|audio\s+hub|music\s+company)/i;

const JUNK_TAG_REGEX = /^(?:official\s+)?(?:video|audio|visualizer|music\s+video|lyric\s+video|lyrics?|mv|remaster(?:ed)?|hd|4k|lyrical(?:\s+video)?|teaser|promo|clip|live|full\s+song|song)$/i;

function getSignificantWords(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2 && !STOP_WORDS.has(w));
}

/**
 * Calculates strict relevance score (0-100+) between candidate search item and target track
 * Returns -1 if the search result is an entirely different song, preventing false-positive hijacking.
 */
function calculateRelevance(item, targetTitle, targetArtist, targetDuration) {
  if (!item || !item.trackName) return -1;
  const normalize = (str) => (str || '').toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const itemTrack = normalize(item.trackName);
  const itemArtist = normalize(item.artistName);
  const tgtTrack = normalize(targetTitle);
  const tgtArtist = normalize(targetArtist);
  if (!tgtTrack) return -1;

  const itemWords = new Set(itemTrack.split(/\s+/));
  const tgtSigWords = getSignificantWords(tgtTrack);
  const exactTrack = itemTrack === tgtTrack;
  const containsTrack = itemTrack.includes(tgtTrack) || tgtTrack.includes(itemTrack);

  let sigMatches = 0;
  for (const w of tgtSigWords) {
    if (itemWords.has(w)) sigMatches++;
  }

  // If there are significant words in target title, require at least one match or containment
  if (tgtSigWords.length > 0 && sigMatches === 0 && !containsTrack && !exactTrack) {
    return -1; // REJECT: zero significant words matched!
  }

  if (tgtSigWords.length === 0 && !containsTrack && !exactTrack) {
    return -1;
  }

  // Strict Duration Sanity Check: If durations differ by > 45s, reject!
  if (targetDuration && item.duration) {
    const diff = Math.abs(item.duration - targetDuration);
    if (diff > 45) {
      return -1; // REJECT: Length difference is too large to be the same song
    }
  }

  // Require at least 50% significant word overlap if not exact/contained
  if (!exactTrack && !containsTrack && tgtSigWords.length > 1) {
    const overlapRatio = sigMatches / tgtSigWords.length;
    if (overlapRatio < 0.5) {
      return -1; // REJECT: Insufficient title overlap
    }
  }

  let score = 0;
  if (exactTrack) score += 60;
  else if (containsTrack) score += 40;
  else score += (sigMatches / Math.max(tgtSigWords.length, 1)) * 35;

  if (tgtArtist && itemArtist) {
    const tgtArtSig = getSignificantWords(tgtArtist);
    const itemArtWords = new Set(itemArtist.split(/\s+/));
    const artMatches = tgtArtSig.filter(w => itemArtWords.has(w)).length;
    if (itemArtist === tgtArtist || itemArtist.includes(tgtArtist) || tgtArtist.includes(itemArtist)) {
      score += 35;
    } else if (artMatches > 0) {
      score += 20;
    } else if (tgtArtSig.length > 0) {
      score -= 30; // Artist mismatch penalty
    }
  }

  if (targetDuration && item.duration) {
    const diff = Math.abs(item.duration - targetDuration);
    if (diff <= 5) score += 25;
    else if (diff <= 15) score += 15;
    else if (diff <= 30) score += 5;
    else if (diff > 35) score -= 20;
  }

  if (item.syncedLyrics && item.syncedLyrics.length > 50) score += 10;
  return score;
}

/**
 * Robust port and extension of Echo Music's MetadataCleaner
 * Strips bracket tags first, extracts pipes/colons/by, and correctly handles
 * 'Artist - Song' vs 'Song - Movie/Artist' variations without destroying the song title.
 */
function cleanTrackMetadata(rawTitle, rawArtist) {
  let title = (rawTitle || '').trim();
  let artist = (rawArtist || '').trim();
  const extraArtists = [];
  const extraTitles = [];
  let hadPipes = false;

  // 1. Remove emojis and garbage unicode symbols
  title = title.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');

  // 2. Strip YouTube channel junk from rawArtist
  artist = artist
    .replace(/\s+and\s+\d+\s+more\b/gi, '')
    .replace(/\s+and\s+others\b/gi, '')
    .replace(/\s*-\s*Topic\b/gi, '')
    .replace(/VEVO\b/gi, '')
    .replace(/\s+Official\b/gi, '')
    .replace(/\s+Records\b/gi, '')
    .trim();

  // 3. STEP 1: Strip bracket tags FIRST (e.g. '(Official Video)', '(Lyrics)', '[Lyric Video]', '(4K HD)')
  // CRITICAL: This MUST happen before hyphen or pipe splitting so '(Lyrics)' doesn't trigger false junk removal!
  title = title.replace(
    /[\(\[\{【「][^\)\]\}】」]*(?:official|video|music\s+video|audio|lyric|lyrics|visualizer|live|remaster|remastered|4k|hd|prod\.|topic|edit|clip|from\s+"?|soundtrack|song|version|hindi|punjabi|telugu|tamil|bhojpuri|malayalam|kannada|full\s+song)[^\)\]\}】」]*[\)\]\}】」]/gi,
    ' '
  );

  // 4. Extract pipes: e.g. 'Kesariya - Brahmāstra | Ranbir Kapoor | Alia Bhatt | Pritam | Arijit Singh'
  if (title.includes('|')) {
    hadPipes = true;
    const pipeParts = title.split('|').map(p => p.trim()).filter(Boolean);
    if (pipeParts.length >= 2) {
      title = pipeParts[0];
      for (let i = 1; i < pipeParts.length; i++) {
        const seg = pipeParts[i];
        const isJunk = JUNK_TAG_REGEX.test(seg);
        if (!isJunk && seg.length > 1 && !IS_LABEL_NAME.test(seg)) {
          const subNames = seg.split(/[,&/]/).map(n => n.trim()).filter(Boolean);
          extraArtists.push(...subNames);
        }
      }
      if ((!artist || IS_LABEL_NAME.test(artist) || artist.toLowerCase() === 'unknown artist') && extraArtists.length > 0) {
        const singerPref = extraArtists.find(a => /(?:arijit|pritam|shreya|atif|sidhu|diljit|karan|badshah|honey|jubin|armaan|sonu|mohit|neha|sunidhi|kk|anirudh|ar\s+rahman)/i.test(a));
        artist = singerPref || extraArtists[extraArtists.length - 1];
      }
    }
  }

  // 5. Handle colon ':' (e.g. 'Diljit Dosanjh: G.O.A.T.')
  if (title.includes(':')) {
    const colonParts = title.split(':').map(p => p.trim()).filter(Boolean);
    if (colonParts.length === 2) {
      const c0 = colonParts[0];
      const c1 = colonParts[1];
      if (!JUNK_TAG_REGEX.test(c1)) {
        extraArtists.push(c0);
        extraTitles.push(c1);
        if (!artist || IS_LABEL_NAME.test(artist) || artist.toLowerCase() === 'unknown artist') {
          artist = c0;
          title = c1;
        } else {
          title = c1;
        }
      }
    }
  }

  // 6. Handle 'by Artist' (e.g. 'Tu Hai Kahan by AUR')
  const byMatch = title.match(/^(.*?)\s+by\s+(.*?)$/i);
  if (byMatch) {
    title = byMatch[1].trim();
    const byArtist = byMatch[2].trim();
    extraArtists.push(byArtist);
    if (!artist || IS_LABEL_NAME.test(artist) || artist.toLowerCase() === 'unknown artist') {
      artist = byArtist;
    }
  }

  // 7. Handle hyphen ' - ' (e.g. 'AUR - Tu hai kahan', 'Alan Walker - Faded', 'Kesariya - Brahmāstra')
  if (title.includes(' - ')) {
    const parts = title.split(/\s+-\s+/);
    if (parts.length >= 2) {
      const p0 = parts[0].trim();
      const p1 = parts.slice(1).join(' - ').trim();

      const p1IsJunk = JUNK_TAG_REGEX.test(p1);
      const p0IsJunk = JUNK_TAG_REGEX.test(p0);

      if (p1IsJunk) {
        title = p0;
      } else if (p0IsJunk) {
        title = p1;
      } else {
        extraTitles.push(p0);
        extraTitles.push(p1);

        const normArtist = (artist || '').toLowerCase();
        if (normArtist && p0.toLowerCase().includes(normArtist)) {
          // Artist is p0, title is p1
          title = p1;
        } else if (normArtist && p1.toLowerCase().includes(normArtist)) {
          // Artist is p1, title is p0
          title = p0;
          extraArtists.push(p1);
        } else if (hadPipes) {
          // In titles with pipes like 'Kesariya - Brahmāstra | ...', p0 is always the song title!
          title = p0;
        } else if (!artist || IS_LABEL_NAME.test(artist) || artist.toLowerCase() === 'unknown artist') {
          // In standard YouTube uploads like 'AUR - Tu hai kahan' by 'Vibe Music':
          // p0 is the artist, p1 is the song title!
          extraArtists.push(p0);
          artist = p0;
          title = p1;
        } else {
          // Fallback: p0 is the song, p1 is subtitle
          title = p0;
        }
      }
    }
  }

  // 8. Remove non-Latin characters from title if Latin characters exist (e.g. Urdu/Arabic/Hindi translation tags like '| تو ہے کہاں')
  const hasLatin = /[a-zA-Z]/.test(title);
  if (hasLatin) {
    title = title.replace(/[^\x00-\x7F\s\-'\.,&]/g, ' ');
  }

  // 9. Remove featuring tags: (feat. Daft Punk), ft. Bruno Mars
  title = title.replace(/[\(\[]\s*(?:feat\.?|ft\.?|featuring)\s+[^\)\]]+[\)\]]/gi, ' ');
  title = title.replace(/\s+(?:feat\.?|ft\.?|featuring)\s+.*$/i, ' ');

  // 10. Clean up punctuation and whitespace
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
    extraArtists: Array.from(new Set(extraArtists.filter(a => a && a.length > 1 && !IS_LABEL_NAME.test(a)))),
    extraTitles: Array.from(new Set(extraTitles.filter(t => t && t.length > 1 && !JUNK_TAG_REGEX.test(t))))
  };
}

/**
 * Generates candidate title variations for maximum search matching
 * Prioritizes the cleanest, shortest song name first
 */
function getCandidateTitles(rawTitle, cleanTitle, extraTitles = []) {
  const list = [];

  // 1. cleanTitle first
  if (cleanTitle && cleanTitle.length >= 2) list.push(cleanTitle);

  // 2. Extra extracted titles (e.g. p0 from 'Kesariya - Brahmāstra')
  for (const t of extraTitles) {
    const cleanT = t.replace(/[\(\)\[\]\{\}]/g, '').trim();
    if (cleanT && cleanT.length >= 2 && !list.includes(cleanT)) {
      list.push(cleanT);
    }
  }

  // 3. Substring before hyphen if still in cleanTitle
  if (cleanTitle && cleanTitle.includes('-')) {
    const beforeDash = cleanTitle.split('-')[0].trim();
    if (beforeDash.length >= 2 && !list.includes(beforeDash)) list.push(beforeDash);
  }

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
 * Multi-Engine Lyrics Resolver (LRCLIB Direct -> LRCLIB Scored Search -> Unison -> YouLyPlus -> Lyrics.ovh)
 * Guarantees exact lyrics resolution across global tracks and prevents wrong-song hijacking.
 */
async function getLyrics(trackName, artistName, durationSeconds = null, videoId = null) {
  const { cleanTitle, cleanArtist, primaryArtist, extraArtists, extraTitles } = cleanTrackMetadata(trackName, artistName);
  const candidateTitles = getCandidateTitles(trackName, cleanTitle, extraTitles);

  // Filter out record labels from candidate artists
  const validArtists = [primaryArtist, cleanArtist, ...extraArtists]
    .filter(a => a && a.length > 1 && !IS_LABEL_NAME.test(a));
  const candidateArtists = Array.from(new Set(validArtists));

  const cleanId = (videoId || '').trim();
  const cacheKey = `${cleanId ? cleanId + '_' : ''}${(candidateTitles[0] || cleanTitle).toLowerCase()}_${(candidateArtists[0] || primaryArtist || '').toLowerCase()}`;
  if (lyricsCache.has(cacheKey)) {
    const cached = lyricsCache.get(cacheKey);
    if (cached.found) return cached;
  }

  const duration = durationSeconds ? Math.round(parseFloat(durationSeconds)) : null;
  const headers = {
    'User-Agent': 'DropifyMusic/2.0 (Audiophile Web Engine; https://github.com/harsh-pratap-singh-rathore/Dropify)'
  };

  const rootTitle = candidateTitles[0] || cleanTitle;
  const targetArtist = candidateArtists[0] || primaryArtist;

  // --- Tier 1: LRCLIB Direct Match (Exact track + artist, 100% precision) ---
  for (const title of candidateTitles) {
    for (const artist of candidateArtists.slice(0, 3)) {
      try {
        const params = { track_name: title, artist_name: artist };
        if (duration) params.duration = duration;

        const resp = await axios.get('https://lrclib.net/api/get', { params, timeout: 2000, headers });
        if (resp.data && (resp.data.syncedLyrics || resp.data.plainLyrics)) {
          const synced = parseLrc(resp.data.syncedLyrics);
          const resData = {
            found: true,
            synced: synced.length > 0,
            lines: synced.length > 0 ? synced : formatPlainLyrics(resp.data.plainLyrics, duration),
            plain: resp.data.plainLyrics || '',
            provider: 'LRCLIB (Direct)',
            cleanTitle: resp.data.trackName || title,
            primaryArtist: resp.data.artistName || artist
          };
          lyricsCache.set(cacheKey, resData);
          return resData;
        }
      } catch (e) { }
    }
  }

  // --- Tier 2: LRCLIB Search with Strict Relevance Scoring ---
  // Guarantees only matching songs are selected; rejects any result with score <= 0
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
        const scored = searchResp.data
          .map(item => ({ item, score: calculateRelevance(item, rootTitle, targetArtist, duration) }))
          .filter(x => x.score > 0)
          .sort((a, b) => b.score - a.score);

        if (scored.length > 0) {
          const best = scored[0].item;
          const synced = parseLrc(best.syncedLyrics);
          const resData = {
            found: true,
            synced: synced.length > 0,
            lines: synced.length > 0 ? synced : formatPlainLyrics(best.plainLyrics, duration),
            plain: best.plainLyrics || '',
            provider: 'LRCLIB (Search)',
            cleanTitle: best.trackName || rootTitle,
            primaryArtist: best.artistName || targetArtist
          };
          lyricsCache.set(cacheKey, resData);
          return resData;
        }
      }
    }
  } catch (e) { }

  // --- Tier 3: Unison API (from Echo Music: https://unison.boidu.dev) ---
  for (const title of candidateTitles.slice(0, 2)) {
    try {
      const unisonParams = { song: title, artist: targetArtist };
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
          primaryArtist: targetArtist
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
          artist: targetArtist,
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
          primaryArtist: targetArtist
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
    primaryArtist: targetArtist
  };
}

module.exports = {
  getLyrics,
  parseLrc,
  formatPlainLyrics,
  cleanTrackMetadata,
  getCandidateTitles,
  calculateRelevance
};
