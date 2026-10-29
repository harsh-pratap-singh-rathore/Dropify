const axios = require('axios');

/**
 * High-Performance Bounded LRU Cache with TTL Eviction
 * Guarantees process memory stability and prevents Out-Of-Memory (OOM) fatal crashes
 */
class BoundedLRUCache {
  constructor(maxSize = 500, ttlMs = 4 * 60 * 60 * 1000) {
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
    // Refresh position for LRU recency order
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key, value, customTtlMs = null) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest (first inserted key in Map)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    const ttl = customTtlMs !== null ? customTtlMs : this.ttlMs;
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl
    });
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

const lyricsCache = new BoundedLRUCache(500, 4 * 60 * 60 * 1000);

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

  // 3. Strip bracket tags FIRST
  title = title.replace(
    /[\(\[\{【「][^\)\]\}】」]*(?:official|video|music\s+video|audio|lyric|lyrics|visualizer|live|remaster|remastered|4k|hd|prod\.|topic|edit|clip|from\s+"?|soundtrack|song|version|hindi|punjabi|telugu|tamil|bhojpuri|malayalam|kannada|full\s+song)[^\)\]\}】」]*[\)\]\}】」]/gi,
    ' '
  );

  // 4. Extract pipes
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

  // 5. Handle colon ':'
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

  // 6. Handle 'by Artist'
  const byMatch = title.match(/^(.*?)\s+by\s+(.*?)$/i);
  if (byMatch) {
    title = byMatch[1].trim();
    const byArtist = byMatch[2].trim();
    extraArtists.push(byArtist);
    if (!artist || IS_LABEL_NAME.test(artist) || artist.toLowerCase() === 'unknown artist') {
      artist = byArtist;
    }
  }

  // 7. Handle hyphen ' - '
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
          title = p1;
        } else if (normArtist && p1.toLowerCase().includes(normArtist)) {
          title = p0;
          extraArtists.push(p1);
        } else if (hadPipes) {
          title = p0;
        } else if (!artist || IS_LABEL_NAME.test(artist) || artist.toLowerCase() === 'unknown artist') {
          extraArtists.push(p0);
          artist = p0;
          title = p1;
        } else {
          title = p0;
        }
      }
    }
  }

  // 8. Remove non-Latin characters from title if Latin characters exist
  const hasLatin = /[a-zA-Z]/.test(title);
  if (hasLatin) {
    title = title.replace(/[^\x00-\x7F\s\-'\.,&]/g, ' ');
  }

  // 9. Remove featuring tags
  title = title.replace(/[\(\[]\s*(?:feat\.?|ft\.?|featuring)\s+[^\)\]]+[\)\]]/gi, ' ');
  title = title.replace(/\s+(?:feat\.?|ft\.?|featuring)\s+.*$/i, ' ');

  // 10. Clean up punctuation and whitespace
  title = title.replace(/[\(\)\[\]\{\}\|]/g, ' ').replace(/\s+/g, ' ').trim();
  title = title.replace(/^[\s\-_–—]+|[\s\-_–—]+$/g, '').trim();

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

function getCandidateTitles(rawTitle, cleanTitle, extraTitles = []) {
  const list = [];
  if (cleanTitle && cleanTitle.length >= 2) list.push(cleanTitle);

  for (const t of extraTitles) {
    const cleanT = t.replace(/[\(\)\[\]\{\}]/g, '').trim();
    if (cleanT && cleanT.length >= 2 && !list.includes(cleanT)) {
      list.push(cleanT);
    }
  }

  if (cleanTitle && cleanTitle.includes('-')) {
    const beforeDash = cleanTitle.split('-')[0].trim();
    if (beforeDash.length >= 2 && !list.includes(beforeDash)) list.push(beforeDash);
  }

  for (const c of [...list]) {
    const stripped = c
      .replace(/\b(?:Hindi|Tamil|Telugu|Punjabi|Malayalam|Kannada|Bhojpuri|Bengali|Version|Audio|Lyrical|Song|Full Song|Title Track)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (stripped && stripped.length >= 2 && !list.includes(stripped)) list.push(stripped);
  }

  return list;
}

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
 * Multi-Engine Lyrics Resolver (Hardened HTTPS Only)
 */
async function getLyrics(trackName, artistName, durationSeconds = null, videoId = null) {
  const { cleanTitle, cleanArtist, primaryArtist, extraArtists, extraTitles } = cleanTrackMetadata(trackName, artistName);
  const candidateTitles = getCandidateTitles(trackName, cleanTitle, extraTitles);

  const validArtists = [primaryArtist, cleanArtist, ...extraArtists]
    .filter(a => a && a.length > 1 && !IS_LABEL_NAME.test(a));
  const candidateArtists = Array.from(new Set(validArtists));

  const cleanId = (videoId || '').trim();
  const cacheKey = `${cleanId ? cleanId + '_' : ''}${(candidateTitles[0] || cleanTitle).toLowerCase()}_${(candidateArtists[0] || primaryArtist || '').toLowerCase()}`;
  if (lyricsCache.has(cacheKey)) {
    const cached = lyricsCache.get(cacheKey);
    if (cached && cached.found) return cached;
  }

  const duration = durationSeconds ? Math.round(parseFloat(durationSeconds)) : null;
  const headers = {
    'User-Agent': 'DropifyMusic/2.0 (Audiophile Web Engine; https://github.com/harsh-pratap-singh-rathore/Dropify)'
  };

  const rootTitle = candidateTitles[0] || cleanTitle;
  const targetArtist = candidateArtists[0] || primaryArtist;

  // --- Tier 1: LRCLIB Direct Match ---
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

  // --- Tier 3: Unison API ---
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

  // --- Tier 4: Kugou Music Global Synchronized Lyrics Engine (Secured HTTPS) ---
  try {
    const kgQuery = `${rootTitle} ${targetArtist || ''}`.trim();
    const kgSearch = await axios.get('https://lyrics.kugou.com/search', {
      params: {
        ver: 1,
        man: 'yes',
        client: 'pc',
        keyword: kgQuery,
        duration: duration ? duration * 1000 : undefined
      },
      timeout: 2200,
      headers
    });

    if (kgSearch.data?.candidates?.length > 0) {
      const cand = kgSearch.data.candidates[0];
      const kgDownload = await axios.get('https://lyrics.kugou.com/download', {
        params: {
          ver: 1,
          client: 'pc',
          id: cand.id,
          accesskey: cand.accesskey,
          fmt: 'lrc',
          charset: 'utf8'
        },
        timeout: 2200,
        headers
      });

      if (kgDownload.data?.content) {
        const lrcText = Buffer.from(kgDownload.data.content, 'base64').toString('utf8');
        const synced = parseLrc(lrcText);
        if (synced.length > 0) {
          const resData = {
            found: true,
            synced: true,
            lines: synced,
            plain: lrcText,
            provider: 'Kugou Lyrics Engine',
            cleanTitle: cand.song || rootTitle,
            primaryArtist: cand.singer || targetArtist
          };
          lyricsCache.set(cacheKey, resData);
          return resData;
        }
      }
    }
  } catch (e) { }

  // --- Tier 5: YouTube Video Native Synchronized Subtitles (InnerTube TimedText) ---
  if (cleanId) {
    try {
      const subUrl = `https://www.youtube.com/api/timedtext?v=${encodeURIComponent(cleanId)}&lang=en&fmt=json3`;
      const ytSubResp = await axios.get(subUrl, { timeout: 2500, headers });
      if (ytSubResp.data?.events && Array.isArray(ytSubResp.data.events)) {
        const lines = [];
        for (const ev of ytSubResp.data.events) {
          if (ev.segs && Array.isArray(ev.segs) && ev.tStartMs !== undefined) {
            const text = ev.segs.map(s => s.utf8 || '').join('').trim();
            if (text && text !== '\n') {
              lines.push({
                time: Math.round((ev.tStartMs / 1000) * 10) / 10,
                text
              });
            }
          }
        }
        if (lines.length > 4) {
          const resData = {
            found: true,
            synced: true,
            lines,
            plain: lines.map(l => l.text).join('\n'),
            provider: 'YouTube Synchronized Captions',
            cleanTitle: rootTitle,
            primaryArtist: targetArtist
          };
          lyricsCache.set(cacheKey, resData);
          return resData;
        }
      }
    } catch (e) { }
  }

  // --- Tier 6: Lyrics.ovh Global Plain Lyrics Fallback ---
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
  const notFoundResult = {
    found: false,
    synced: false,
    lines: [],
    plain: 'Lyrics currently unavailable for this track.',
    cleanTitle: rootTitle,
    primaryArtist: targetArtist
  };
  // BE-07: Negative cache for 1 hour to prevent 47s latency cascades on repeated requests
  lyricsCache.set(cacheKey, notFoundResult, 60 * 60 * 1000);
  return notFoundResult;
}

module.exports = {
  getLyrics,
  parseLrc,
  formatPlainLyrics,
  cleanTrackMetadata,
  getCandidateTitles,
  calculateRelevance,
  lyricsCache
};
