const { app, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let tray = null;
let isQuitting = false;
let currentTrack = null;
let isPlaying = false;

function getIsQuitting() {
  return isQuitting;
}

function setIsQuitting(val) {
  isQuitting = val;
}

// Fallback 16x16 purple circle PNG (Base64) in case file icon is missing
const FALLBACK_ICON_DATAURL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAEKADAAQAAAABAAAAEAAAAAA0YuksAAAAXklEQVQ4T2NkoBAwUqifYQAD/1kYGRmR+AwMDHMYGBjOMDAwPMFhGkYNYBghm3vFGBgYvmHTj6IZm5/BhhBsAC4nkQ1BFcdpAgMDw1UUA4hyN8yB5BhkZ2bipgEB6qIWC9B+d8AAAAAElFTkSuQmCC';

function getTrayIcon() {
  const assetIco = path.join(__dirname, 'assets', 'icon.ico');
  const assetPng = path.join(__dirname, 'assets', 'tray-icon.png');
  const publicSvg = path.join(__dirname, '../frontend/public/favicon.svg');

  if (fs.existsSync(assetIco)) {
    return nativeImage.createFromPath(assetIco);
  }
  if (fs.existsSync(assetPng)) {
    return nativeImage.createFromPath(assetPng);
  }
  if (fs.existsSync(publicSvg)) {
    const img = nativeImage.createFromPath(publicSvg);
    if (!img.isEmpty()) return img.resize({ width: 16, height: 16 });
  }

  return nativeImage.createFromDataURL(FALLBACK_ICON_DATAURL);
}

function updateContextMenu(mainWindow) {
  if (!tray) return;

  const trackLabel = currentTrack && currentTrack.title
    ? `${currentTrack.title} — ${currentTrack.artist || 'Unknown Artist'}`
    : 'Dropify DSP • Idle';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: trackLabel.length > 40 ? trackLabel.slice(0, 37) + '...' : trackLabel,
      enabled: false
    },
    { type: 'separator' },
    {
      label: isPlaying ? 'Pause' : 'Play',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('media-action', 'play-pause');
        }
      }
    },
    {
      label: 'Next Track',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('media-action', 'next-track');
        }
      }
    },
    {
      label: 'Previous Track',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('media-action', 'prev-track');
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Open Dropify',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Check for Updates...',
      click: () => {
        const desktopUpdater = require('./updater.cjs');
        desktopUpdater.check(true);
      }
    },
    { type: 'separator' },
    {
      label: 'Quit Dropify',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
}

function setupTray(mainWindow) {
  const icon = getTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('Dropify - Audiophile Music Player');

  updateContextMenu(mainWindow);

  // Single click: toggle show/restore window
  tray.on('click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  tray.on('double-click', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  // Listen to window close event: intercept with event.preventDefault() to hide to tray unless isQuitting === true
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      return false;
    }
  });

  return tray;
}

function updateTrayPlaybackState(mainWindow, state = {}) {
  if (state.isPlaying !== undefined) {
    isPlaying = !!state.isPlaying;
  }
  if (state.currentSong !== undefined) {
    currentTrack = state.currentSong;
  }
  updateContextMenu(mainWindow);
}

module.exports = {
  setupTray,
  updateTrayPlaybackState,
  getIsQuitting,
  setIsQuitting
};
