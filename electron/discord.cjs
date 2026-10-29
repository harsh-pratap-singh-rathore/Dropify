const { Client } = require('@xhayper/discord-rpc');

const CLIENT_ID = process.env.DISCORD_CLIENT_ID || '1205167098492080168';

let client = null;
let isConnected = false;
let isConnecting = false;
let lastTrackData = null;

async function initDiscord() {
  if (isConnected || isConnecting) return;
  isConnecting = true;

  try {
    client = new Client({ clientId: CLIENT_ID });

    client.on('ready', () => {
      isConnected = true;
      isConnecting = false;
      if (lastTrackData) {
        setActivity(lastTrackData).catch(() => {});
      }
    });

    client.on('disconnected', () => {
      isConnected = false;
      isConnecting = false;
    });

    await client.login().catch(() => {
      isConnected = false;
      isConnecting = false;
    });
  } catch (_) {
    isConnected = false;
    isConnecting = false;
  }
}

/**
 * Update Discord Rich Presence
 * @param {Object} options
 * @param {string} options.title
 * @param {string} options.artist
 * @param {string} [options.album]
 * @param {number} [options.duration] in seconds
 * @param {number} [options.currentTime] in seconds
 * @param {boolean} [options.isPlaying]
 * @param {string} [options.coverUrl]
 */
async function setActivity({ title, artist, album, duration, currentTime, isPlaying, coverUrl } = {}) {
  lastTrackData = { title, artist, album, duration, currentTime, isPlaying, coverUrl };

  if (!client || !isConnected) {
    initDiscord().catch(() => {});
    return;
  }

  try {
    if (!title) {
      if (client.user) {
        await client.user.clearActivity();
      }
      return;
    }

    let safeDetails = String(title).trim().slice(0, 128);
    if (safeDetails.length < 2) safeDetails = safeDetails.padEnd(2, ' ');

    let safeState = String(artist || 'Dropify Music').trim().slice(0, 128);
    if (safeState.length < 2) safeState = safeState.padEnd(2, ' ');

    const activity = {
      details: safeDetails,
      state: safeState,
      largeImageKey: coverUrl && coverUrl.startsWith('http') ? coverUrl : 'dropify_logo',
      largeImageText: album ? String(album).slice(0, 128) : safeDetails,
      smallImageKey: isPlaying ? 'play' : 'pause',
      smallImageText: isPlaying ? 'Playing' : 'Paused',
      instance: false
    };

    if (isPlaying && typeof duration === 'number' && duration > 0) {
      const now = Date.now();
      const cur = Math.max(0, currentTime || 0) * 1000;
      const total = duration * 1000;
      activity.startTimestamp = Math.floor(now - cur);
      activity.endTimestamp = Math.floor(now + (total - cur));
    }

    if (client.user) {
      await client.user.setActivity(activity);
    }
  } catch (err) {
    // Discord presence failure is non-fatal
    console.warn('[Discord RPC] setActivity notice:', err.message);
  }
}

async function clearActivity() {
  lastTrackData = null;
  if (client && isConnected && client.user) {
    try {
      await client.user.clearActivity();
    } catch (_) {}
  }
}

module.exports = {
  initDiscord,
  setActivity,
  clearActivity
};
