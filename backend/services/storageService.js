const fs = require('fs');
const path = require('path');

const DEFAULT_TEMPLATES = {
  'library.json': { likedSongs: [], playlists: [], history: [] },
  'play_stats.json': {},
  'exclusions.json': [],
  'downloads.json': { total: 1, android: 1, windows: 0, lastUpdated: Date.now() },
  'preferences.json': {
    audioQuality: 'HIGH',
    crossfadeDuration: 4,
    crossfadeEnabled: true,
    automixEnabled: true,
    stereoWidenerEnabled: true,
    stereoWidth: 1.25,
    equalizerEnabled: true,
    eqBands: [
      { frequency: 32, gain: 2.0 },
      { frequency: 64, gain: 3.0 },
      { frequency: 125, gain: 1.5 },
      { frequency: 250, gain: 0.0 },
      { frequency: 500, gain: -1.0 },
      { frequency: 1000, gain: 0.5 },
      { frequency: 2000, gain: 1.5 },
      { frequency: 4000, gain: 2.5 },
      { frequency: 8000, gain: 3.0 },
      { frequency: 16000, gain: 2.0 }
    ]
  }
};

const localDir = path.join(__dirname, '..', 'data');
let DATA_DIR;

function initStorage(targetDir) {
  try {
    if (targetDir) {
      DATA_DIR = path.resolve(targetDir);
    } else if (process.env.DROPIFY_DATA_DIR) {
      DATA_DIR = path.resolve(process.env.DROPIFY_DATA_DIR);
    } else if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      DATA_DIR = path.join('/tmp', 'dropify_data');
    } else {
      DATA_DIR = localDir;
    }

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Seed default library.json, play_stats.json, preferences.json, and exclusions.json if they do not exist
    const filesToSeed = ['library.json', 'play_stats.json', 'preferences.json', 'exclusions.json', 'downloads.json'];
    for (const fileName of filesToSeed) {
      const targetFilePath = path.join(DATA_DIR, fileName);
      if (!fs.existsSync(targetFilePath)) {
        const sourceTemplatePath = path.join(localDir, fileName);
        if (DATA_DIR !== localDir && fs.existsSync(sourceTemplatePath)) {
          try {
            fs.copyFileSync(sourceTemplatePath, targetFilePath);
          } catch (_) {
            const fallbackContent = DEFAULT_TEMPLATES[fileName] || {};
            fs.writeFileSync(targetFilePath, JSON.stringify(fallbackContent, null, 2), 'utf-8');
          }
        } else {
          const fallbackContent = DEFAULT_TEMPLATES[fileName] || {};
          fs.writeFileSync(targetFilePath, JSON.stringify(fallbackContent, null, 2), 'utf-8');
        }
      }
    }
  } catch (e) {
    console.warn(`[storageService] Data directory initialization fallback:`, e.message);
    DATA_DIR = path.join('/tmp', 'dropify_data');
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (_) {}
  }
}

initStorage();

const getFilePath = (fileName) => path.join(DATA_DIR, fileName);

// In-memory fallback cache to ensure zero crashes on read-only environments
const memoryCache = new Map();

function readJson(fileName, defaultValue = {}) {
  if (memoryCache.has(fileName)) {
    return memoryCache.get(fileName);
  }
  const filePath = getFilePath(fileName);
  try {
    if (!fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      } catch (_) {}
      memoryCache.set(fileName, defaultValue);
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(data);
    memoryCache.set(fileName, parsed);
    return parsed;
  } catch (err) {
    console.warn(`Safe storage fallback for ${fileName}:`, err.message);
    memoryCache.set(fileName, defaultValue);
    return defaultValue;
  }
}

function writeJson(fileName, data) {
  memoryCache.set(fileName, data);
  const filePath = getFilePath(fileName);
  try {
    const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.warn(`Memory-only write for ${fileName}:`, err.message);
    return false;
  }
}

function setDataDir(newDir) {
  memoryCache.clear();
  initStorage(newDir);
  return DATA_DIR;
}

module.exports = {
  // Library (liked songs, playlists)
  getLibrary: () => readJson('library.json', DEFAULT_TEMPLATES['library.json']),
  saveLibrary: (data) => writeJson('library.json', data),

  // Play stats (trackKey -> { totalPlayTimeMs, skipCount, lastPlayedAtMillis })
  getPlayStats: () => readJson('play_stats.json', DEFAULT_TEMPLATES['play_stats.json']),
  savePlayStats: (data) => writeJson('play_stats.json', data),

  // Exclusions (trackKeys marked as "Never recommend again")
  getExclusions: () => readJson('exclusions.json', DEFAULT_TEMPLATES['exclusions.json']),
  saveExclusions: (data) => writeJson('exclusions.json', data),

  // User preferences (audio quality, crossfade, EQ settings)
  getPreferences: () => readJson('preferences.json', DEFAULT_TEMPLATES['preferences.json']),
  savePreferences: (data) => writeJson('preferences.json', data),

  // Downloads counter (total, android, windows)
  getDownloads: () => readJson('downloads.json', DEFAULT_TEMPLATES['downloads.json']),
  saveDownloads: (data) => writeJson('downloads.json', data),

  // Desktop storage path utilities
  getDataDir: () => DATA_DIR,
  setDataDir,
  readJson,
  writeJson
};
