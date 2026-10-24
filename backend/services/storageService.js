const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const getFilePath = (fileName) => path.join(DATA_DIR, fileName);

function readJson(fileName, defaultValue = {}) {
  const filePath = getFilePath(fileName);
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), 'utf-8');
      return defaultValue;
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`Error reading ${fileName}:`, err.message);
    return defaultValue;
  }
}

function writeJson(fileName, data) {
  const filePath = getFilePath(fileName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${fileName}:`, err.message);
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
