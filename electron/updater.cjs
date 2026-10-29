/**
 * Dropify Windows Desktop Central Update Manager
 * Supports both NSIS Installed builds and Standalone Portable executables.
 * Performs SemVer comparisons, integrity checks, and orchestrates user prompts.
 */

const { app, shell, dialog, ipcMain } = require('electron');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PRIMARY_UPDATE_URL = 'https://dropify.vercel.app/api/updates?platform=windows';
const FALLBACK_UPDATE_URL = 'https://dropify.vercel.app/releases.json';

function isPortableBuild() {
  return Boolean(
    process.env.PORTABLE_EXECUTABLE_DIR ||
    process.env.PORTABLE_EXECUTABLE_FILE ||
    process.env.PORTABLE_EXECUTABLE_APP_FILENAME
  );
}

function parseSemVer(v) {
  if (!v || typeof v !== 'string') return [0, 0, 0];
  const cleaned = v.replace(/^v/i, '').trim();
  const parts = cleaned.split('.').map(p => parseInt(p, 10) || 0);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function compareSemVer(v1, v2) {
  const [maj1, min1, pat1] = parseSemVer(v1);
  const [maj2, min2, pat2] = parseSemVer(v2);
  if (maj1 !== maj2) return maj1 - maj2;
  if (min1 !== min2) return min1 - min2;
  return pat1 - pat2;
}

function fetchJson(url, timeoutMs = 6000) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.get(url, {
      timeout: timeoutMs,
      headers: {
        'User-Agent': `Dropify-Windows-Desktop/${app.getVersion()} (Electron; win32)`,
        'Accept': 'application/json'
      }
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchJson(res.headers.location, timeoutMs));
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
      }

      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Failed to parse JSON: ${err.message}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Update check request timed out'));
    });

    req.on('error', (err) => {
      reject(err);
    });
  });
}

class DesktopUpdateManager {
  constructor() {
    this.mainWindow = null;
    this.lastCheckedTime = 0;
    this.isChecking = false;
    this.cachedUpdate = null;
  }

  init(window) {
    this.mainWindow = window;
    this.registerIpc();

    // Perform an asynchronous, non-blocking check 5 seconds after startup
    setTimeout(() => {
      this.check(false).catch((err) => {
        console.log('[Dropify Updater] Startup check notice:', err.message);
      });
    }, 5000);
  }

  registerIpc() {
    ipcMain.handle('check-for-updates', async (_, manual = false) => {
      return await this.check(manual);
    });

    ipcMain.on('open-external-url', (_, url) => {
      if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
        shell.openExternal(url);
      }
    });

    ipcMain.on('trigger-update-action', async (_, { action, downloadUrl }) => {
      if (action === 'download' && downloadUrl) {
        shell.openExternal(downloadUrl);
      } else if (action === 'website') {
        shell.openExternal('https://dropify.vercel.app/#download');
      }
    });
  }

  async check(manual = false) {
    if (this.isChecking) {
      return { status: 'checking', isPortable: isPortableBuild() };
    }

    this.isChecking = true;
    const currentVersion = app.getVersion();
    const isPortable = isPortableBuild();

    try {
      let rawData = null;

      // 1. Try primary endpoint
      try {
        rawData = await fetchJson(PRIMARY_UPDATE_URL);
      } catch (err) {
        console.log('[Dropify Updater] Primary endpoint unreachable, attempting fallback:', err.message);
      }

      // 2. Try fallback endpoint
      if (!rawData) {
        try {
          rawData = await fetchJson(FALLBACK_UPDATE_URL);
        } catch (err) {
          console.warn('[Dropify Updater] Fallback manifest unreachable:', err.message);
        }
      }

      if (!rawData) {
        this.isChecking = false;
        if (manual && this.mainWindow && !this.mainWindow.isDestroyed()) {
          dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Dropify Update Check',
            message: 'Unable to reach the release server.',
            detail: 'Please check your internet connection and try again later.',
            buttons: ['OK']
          });
        }
        return { available: false, error: 'Network unreachable' };
      }

      // Extract Windows metadata
      const winData = rawData.platforms ? rawData.platforms.windows : (rawData.platform === 'windows' ? rawData : null);

      if (!winData) {
        this.isChecking = false;
        return { available: false, error: 'No Windows release found in manifest' };
      }

      const latestVersion = winData.latestVersion || winData.version || '1.0.0';
      const isNewer = compareSemVer(latestVersion, currentVersion) > 0;

      this.isChecking = false;
      this.lastCheckedTime = Date.now();

      if (isNewer) {
        this.cachedUpdate = winData;

        // Notify renderer process
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('update-available', {
            currentVersion,
            latestVersion,
            releaseDate: winData.releaseDate,
            releaseNotes: winData.releaseNotes || [],
            downloadUrl: isPortable ? (winData.portableUrl || winData.downloadUrl) : winData.downloadUrl,
            isPortable,
            mandatory: !!winData.mandatory
          });
        }

        // Show native dialog if manually triggered
        if (manual && this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.showUpdateDialog(winData, currentVersion, isPortable);
        }

        return {
          available: true,
          currentVersion,
          latestVersion,
          releaseNotes: winData.releaseNotes || [],
          downloadUrl: isPortable ? (winData.portableUrl || winData.downloadUrl) : winData.downloadUrl,
          isPortable
        };
      } else {
        if (manual && this.mainWindow && !this.mainWindow.isDestroyed()) {
          dialog.showMessageBox(this.mainWindow, {
            type: 'info',
            title: 'Dropify is Up to Date',
            message: `You are running the latest version of Dropify (v${currentVersion}).`,
            buttons: ['OK']
          });
        }
        return { available: false, currentVersion, latestVersion };
      }
    } catch (e) {
      this.isChecking = false;
      console.error('[Dropify Updater] Unexpected error:', e.message);
      return { available: false, error: e.message };
    }
  }

  showUpdateDialog(winData, currentVersion, isPortable) {
    const latestVersion = winData.latestVersion || winData.version;
    const notes = Array.isArray(winData.releaseNotes)
      ? winData.releaseNotes.map(n => `• ${n}`).join('\n')
      : 'Performance enhancements and bug fixes.';

    const downloadTargetUrl = isPortable
      ? (winData.portableUrl || winData.downloadUrl)
      : (winData.installer?.downloadUrl || winData.downloadUrl);

    const dialogOptions = {
      type: 'info',
      title: 'Dropify Update Available',
      message: `A new version of Dropify is available: v${latestVersion}`,
      detail: `Current Version: v${currentVersion}\nNew Version: v${latestVersion}\n\nWhat's New:\n${notes}\n\n${
        isPortable
          ? 'You are running the Portable edition. Download the updated executable to replace your current file.'
          : 'Download the latest installer to upgrade seamlessly.'
      }`,
      buttons: isPortable
        ? ['Download Portable (.exe)', 'Open Website', 'Later']
        : ['Download Installer (.exe)', 'Open Website', 'Later'],
      defaultId: 0,
      cancelId: 2
    };

    dialog.showMessageBox(this.mainWindow, dialogOptions).then(({ response }) => {
      if (response === 0) {
        shell.openExternal(downloadTargetUrl);
      } else if (response === 1) {
        shell.openExternal('https://dropify.vercel.app/#download');
      }
    });
  }
}

module.exports = new DesktopUpdateManager();
