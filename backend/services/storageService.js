const fs = require('fs');
const path = require('path');

// Safe determination of data directory (supports read-only serverless environments like Vercel / AWS Lambda)
let DATA_DIR;
try {
  const localDir = path.join(__dirname, '..', 'data');
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    DATA_DIR = path.join('/tmp', 'dropify_data');
  } else {
    DATA_DIR = localDir;
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  DATA_DIR = path.join('/tmp', 'dropify_data');
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_) {}
}

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
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.warn(`Memory-only write for ${fileName}:`, err.message);
    return false;
  }
}

module.exports = {
  // Library (liked songs, playlists)
  getLibrary: () => readJson('library.json', { likedSongs: [], playlists: [], history: [] }),
  saveLibrary: (data) => writeJson('library.json', data),

  // Play stats (trackKey -> { totalPlayTimeMs, skipCount, lastPlayedAtMillis })
  getPlayStats: () => readJson('play_stats.json', {}),
  savePlayStats: (data) => writeJson('play_stats.json', data),

  // Exclusions (trackKeys marked as "Never recommend again")
  getExclusions: () => readJson('exclusions.json', []),
  saveExclusions: (data) => writeJson('exclusions.json', data),

  // User preferences (audio quality, crossfade, EQ settings)
  getPreferences: () => readJson('preferences.json', {
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
  }),
  savePreferences: (data) => writeJson('preferences.json', data),
};
