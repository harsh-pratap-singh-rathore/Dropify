/**
 * Dropify Offline Storage Engine
 * Reverse-engineered from Echo Music's ExoDownloadService / DownloadUtil:
 * - Stores downloaded track audio blobs, cover art, and lyrics in IndexedDB
 * - Manages offline library persistence with zero network requirements
 * - Provides offline status checks and local blob playback URLs
 */

const DB_NAME = 'dropify_offline_db';
const DB_VERSION = 1;
const STORE_TRACKS = 'tracks';

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_TRACKS)) {
        const store = db.createObjectStore(STORE_TRACKS, { keyPath: 'id' });
        store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
        store.createIndex('title', 'title', { unique: false });
        store.createIndex('artist', 'artist', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves a track, audio blob, and lyrics to offline storage
 */
export async function saveDownloadedSong(song, audioBlob, lyricsData = null) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TRACKS, 'readwrite');
    const store = tx.objectStore(STORE_TRACKS);

    const record = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      thumbnail: song.thumbnail,
      thumbnailHigh: song.thumbnailHigh || song.thumbnail,
      duration: song.duration,
      durationFormatted: song.durationFormatted,
      audioBlob,
      audioMime: audioBlob.type || 'audio/webm',
      size: audioBlob.size,
      lyrics: lyricsData || null,
      downloadedAt: Date.now()
    };

    const req = store.put(record);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Returns all downloaded tracks metadata (excluding big blob for quick rendering)
 */
export async function getDownloadedSongs() {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TRACKS, 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = (req.result || []).map((item) => ({
          id: item.id,
          title: item.title,
          artist: item.artist,
          thumbnail: item.thumbnail,
          thumbnailHigh: item.thumbnailHigh,
          duration: item.duration,
          durationFormatted: item.durationFormatted,
          size: item.size,
          hasLyrics: !!item.lyrics,
          downloadedAt: item.downloadedAt
        }));
        // Sort newest first
        list.sort((a, b) => b.downloadedAt - a.downloadedAt);
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (_) {
    return [];
  }
}

/**
 * Gets offline audio blob URL for playback
 */
export async function getDownloadedSongAudioUrl(songId) {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TRACKS, 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.get(songId);

      req.onsuccess = () => {
        const item = req.result;
        if (item && item.audioBlob) {
          const blobUrl = URL.createObjectURL(item.audioBlob);
          resolve({ url: blobUrl, lyrics: item.lyrics });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (_) {
    return null;
  }
}

/**
 * Checks if a specific song is already saved offline
 */
export async function isSongDownloaded(songId) {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_TRACKS, 'readonly');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.count(songId);

      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => resolve(false);
    });
  } catch (_) {
    return false;
  }
}

/**
 * Removes a downloaded song from storage
 */
export async function deleteDownloadedSong(songId) {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_TRACKS, 'readwrite');
      const store = tx.objectStore(STORE_TRACKS);
      const req = store.delete(songId);

      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    return false;
  }
}

/**
 * Returns estimated offline storage usage in MB
 */
export async function getOfflineStorageUsage() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { usage } = await navigator.storage.estimate();
      return Math.round((usage || 0) / (1024 * 1024));
    }
  } catch (_) {}
  return 0;
}
