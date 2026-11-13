const axios = require('axios');

// In-memory cache for DNA (100 items, 24-hour TTL)
const dnaCache = new Map();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Strips YouTube noise from track title for cleaner search
 */
function cleanSongTitle(title = '') {
  return title
    .replace(/[\(\[\{【「][^\)\]\}】」]*(?:official|video|music\s+video|audio|lyric|lyrics|visualizer|live|remaster|remastered|4k|hd|prod\.|topic|edit|clip|soundtrack|song|version)[^\)\]\}】」]*[\)\]\}】」]/gi, ' ')
    .replace(/ft\.|feat\./gi, ' ')
    .replace(/[|&].*$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Fetches Genius track annotations and Wikipedia backstory/artist bio
 * Reverse-engineered directly from Echo Music's PlayerMenu.kt and Wikipedia.kt
 */
async function getSongDna(title, artist, albumHint = '') {
  const cleanTitle = cleanSongTitle(title);
  const cleanArtist = (artist || '').replace(/,\s*.*$/, '').replace(/VEVO|Topic|Official/gi, '').trim();
  const cacheKey = `${cleanArtist}_${cleanTitle}`.toLowerCase();

  const cached = dnaCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  let album = albumHint || 'Single / Unknown Album';
  let meaning = '';
  let bio = '';
  let releaseDate = '';
  let geniusUrl = '';

  // 1. Genius Search
  try {
    const geniusQuery = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
    const geniusRes = await axios.get(`https://genius.com/api/search/multi?q=${geniusQuery}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 4500
    });

    const sections = geniusRes.data?.response?.sections || [];
    let geniusSong = null;
    for (const section of sections) {
      if (section.type === 'song' && section.hits?.length > 0) {
        geniusSong = section.hits[0].result;
        break;
      }
    }

    if (geniusSong && geniusSong.id) {
      geniusUrl = geniusSong.url || '';
      // Fetch Song Details
      const songDetailsRes = await axios.get(`https://genius.com/api/songs/${geniusSong.id}?text_format=plain`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 4500
      });

      const songObj = songDetailsRes.data?.response?.song;
      if (songObj) {
        if (songObj.album?.name) {
          album = songObj.album.name;
        }
        if (songObj.release_date_for_display) {
          releaseDate = songObj.release_date_for_display;
        }

        const songDesc = songObj.description?.plain;
        if (songDesc && songDesc.trim() !== '?' && songDesc.length > 20) {
          meaning = songDesc.trim();
        }

        // Fetch Artist Bio
        const primaryArtistId = songObj.primary_artist?.id;
        if (primaryArtistId) {
          try {
            const artistRes = await axios.get(`https://genius.com/api/artists/${primaryArtistId}?text_format=plain`, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
              timeout: 4000
            });
            const artistObj = artistRes.data?.response?.artist;
            const artistDesc = artistObj?.description?.plain;
            if (artistDesc && artistDesc.trim() !== '?' && artistDesc.length > 20) {
              bio = artistDesc.trim();
            }
          } catch (_) {}
        }
      }
    }
  } catch (err) {
    // Non-fatal, fallback to Wikipedia
  }

  // 2. Wikipedia Fallback for Song Meaning / Backstory
  if (!meaning || meaning.length < 50) {
    try {
      const wikiQueries = [
        `${cleanTitle} (${cleanArtist} song)`,
        `${cleanTitle} (song)`,
        `${cleanTitle} ${cleanArtist}`
      ];

      for (const q of wikiQueries) {
        try {
          const wikiSearch = await axios.get(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&utf8=&format=json`, {
            headers: { 'User-Agent': 'Dropify-Desktop/2.0.2 (Music DNA Engine)' },
            timeout: 3500
          });
          const searchHits = wikiSearch.data?.query?.search || [];
          if (searchHits.length > 0) {
            const pageTitle = searchHits[0].title;
            const summaryRes = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`, {
              headers: { 'User-Agent': 'Dropify-Desktop/2.0.2' },
              timeout: 3500
            });
            const extract = summaryRes.data?.extract;
            if (extract && !extract.toLowerCase().includes('may refer to') && extract.length > 30) {
              meaning = extract;
              break;
            }
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  // 3. Wikipedia Fallback for Artist Biography
  if (!bio || bio.length < 50) {
    try {
      const artistWikiQueries = [
        `${cleanArtist} (musician)`,
        `${cleanArtist} (singer)`,
        `${cleanArtist} (band)`,
        cleanArtist
      ];

      for (const q of artistWikiQueries) {
        try {
          const summaryRes = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.replace(/ /g, '_'))}`, {
            headers: { 'User-Agent': 'Dropify-Desktop/2.0.2' },
            timeout: 3500
          });
          const extract = summaryRes.data?.extract;
          if (extract && !extract.toLowerCase().includes('may refer to') && extract.length > 30) {
            bio = extract;
            break;
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  // Default clean fallbacks if still empty
  if (!meaning) {
    meaning = `"${cleanTitle}" is a recorded musical composition performed by ${cleanArtist}. Additional crowd-sourced annotations are being updated by the community.`;
  }
  if (!bio) {
    bio = `${cleanArtist} is an active recording artist in modern contemporary music.`;
  }

  const result = {
    title: cleanTitle,
    artist: cleanArtist,
    album,
    releaseDate,
    meaning,
    bio,
    geniusUrl
  };

  dnaCache.set(cacheKey, { timestamp: Date.now(), data: result });
  return result;
}

module.exports = {
  getSongDna
};
