const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  powerSaveBlocker,
  nativeImage,
  utilityProcess
} = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

const { setupTray, updateTrayPlaybackState, setIsQuitting } = require('./tray.cjs');
const { initDiscord, setActivity, clearActivity } = require('./discord.cjs');
const desktopUpdater = require('./updater.cjs');

// Chromium switches before app is ready for uninterrupted audiophile background playback
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// Force Single Instance Lock
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

let mainWindow = null;
let backendProcess = null;
let powerBlockerId = null;
let currentPlaybackState = { isPlaying: false, currentSong: null, currentTime: 0, duration: 0 };
const BACKEND_PORT = 5001;
const SERVER_URL = `http://127.0.0.1:${BACKEND_PORT}`;

// Helper: Check if an HTTP server is reachable
function isPortReachable(port, host = '127.0.0.1', timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.get({ host, port, path: '/api/preferences', timeout: timeoutMs }, (res) => {
      resolve(true);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Helper: Wait for server to become healthy
async function waitForServer(port, maxWaitMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const alive = await isPortReachable(port);
    if (alive) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

// PowerSaveBlocker helper
function setPowerSuspension(shouldPrevent) {
  try {
    if (shouldPrevent) {
      if (powerBlockerId === null || !powerSaveBlocker.isStarted(powerBlockerId)) {
        powerBlockerId = powerSaveBlocker.start('prevent-app-suspension');
      }
    } else {
      if (powerBlockerId !== null && powerSaveBlocker.isStarted(powerBlockerId)) {
        powerSaveBlocker.stop(powerBlockerId);
        powerBlockerId = null;
      }
    }
  } catch (err) {
    console.warn('[PowerSaveBlocker] Notice:', err.message);
  }
}

// Windows Taskbar Thumbar Buttons
function getThumbarIcon(name) {
  const assetPath = path.join(__dirname, 'assets', `${name}.svg`);
  if (fs.existsSync(assetPath)) {
    const img = nativeImage.createFromPath(assetPath);
    if (!img.isEmpty()) return img.resize({ width: 20, height: 20 });
  }
  return nativeImage.createEmpty();
}

function updateThumbarButtons(isPlaying) {
  if (process.platform !== 'win32' || !mainWindow || mainWindow.isDestroyed()) return;

  try {
    const prevIcon = getThumbarIcon('prev');
    const playPauseIcon = isPlaying ? getThumbarIcon('pause') : getThumbarIcon('play');
    const nextIcon = getThumbarIcon('next');

    mainWindow.setThumbarButtons([
      {
        tooltip: 'Previous Track',
        icon: prevIcon,
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('media-action', 'prev-track');
          }
        }
      },
      {
        tooltip: isPlaying ? 'Pause' : 'Play',
        icon: playPauseIcon,
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('media-action', 'play-pause');
          }
        }
      },
      {
        tooltip: 'Next Track',
        icon: nextIcon,
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('media-action', 'next-track');
          }
        }
      }
    ]);
  } catch (e) {
    console.warn('[Thumbar] Notice:', e.message);
  }
}

// Global Media Keys
function registerGlobalMediaShortcuts() {
  try {
    globalShortcut.register('MediaPlayPause', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-action', 'play-pause');
      }
    });

    globalShortcut.register('MediaNextTrack', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-action', 'next-track');
      }
    });

    globalShortcut.register('MediaPreviousTrack', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('media-action', 'prev-track');
      }
    });
  } catch (err) {
    console.warn('[Global Shortcuts] Media keys registration notice:', err.message);
  }
}

// Spawn backend via utilityProcess.fork()
async function startBackendProcess() {
  const isDev = !app.isPackaged;
  let backendPath = path.join(__dirname, '../backend/server.js');

  // Handle asar unpacked paths if packaged
  if (!fs.existsSync(backendPath)) {
    const unpacked = backendPath.replace('app.asar', 'app.asar.unpacked');
    if (fs.existsSync(unpacked)) {
      backendPath = unpacked;
    }
  }

  // Determine user data directory for persistent data
  const dataDir = isDev
    ? path.join(__dirname, '../backend/data')
    : path.join(app.getPath('userData'), 'data');

  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch (_) {}
  }

  // Determine frontend dist path for static serving
  let frontendDistDir;
  if (!isDev) {
    const unpackedFrontend = path.join(process.resourcesPath, 'app.asar.unpacked', 'frontend', 'dist');
    if (fs.existsSync(unpackedFrontend)) {
      frontendDistDir = unpackedFrontend;
    } else {
      frontendDistDir = path.join(__dirname, '../frontend/dist').replace('app.asar', 'app.asar.unpacked');
    }
  } else {
    frontendDistDir = path.join(__dirname, '../frontend/dist');
  }

  // In development, check if backend is already running on port 5001
  if (isDev) {
    const isAlreadyRunning = await isPortReachable(BACKEND_PORT);
    if (isAlreadyRunning) {
      console.log(`[Dropify Electron] Dev backend already running on port ${BACKEND_PORT}`);
      return;
    }
  }

  if (!fs.existsSync(backendPath)) {
    console.warn(`[Dropify Electron] Backend entry not found at: ${backendPath}`);
    return;
  }

  console.log(`[Dropify Electron] Spawning backend utility process from: ${backendPath}`);
  backendProcess = utilityProcess.fork(backendPath, [], {
    env: {
      ...process.env,
      PORT: String(BACKEND_PORT),
      DROPIFY_DATA_DIR: dataDir,
      FRONTEND_DIST: frontendDistDir,
      SERVE_STATIC: isDev ? 'false' : 'true',
      NODE_ENV: isDev ? 'development' : 'production'
    },
    stdio: 'inherit'
  });

  backendProcess.on('exit', (code) => {
    console.log(`[Dropify Backend] Exited with code: ${code}`);
  });

  await waitForServer(BACKEND_PORT);
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundMaterial: 'mica',
    transparent: false,
    backgroundColor: '#00000000',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: '#ffffff',
      height: 38
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      backgroundThrottling: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Track window state changes for UI
  mainWindow.on('maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-state-change', { isMaximized: true });
    }
  });

  mainWindow.on('unmaximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window-state-change', { isMaximized: false });
    }
  });

  // Setup System Tray
  setupTray(mainWindow);

  // Initialize taskbar thumbar
  mainWindow.once('ready-to-show', () => {
    updateThumbarButtons(false);
    mainWindow.show();
  });

  return mainWindow;
}

// Setup IPC Handlers
function setupIpcHandlers() {
  ipcMain.on('window-minimize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.on('window-maximize', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('window-close', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  ipcMain.handle('window-is-maximized', () => {
    return mainWindow && !mainWindow.isDestroyed() ? mainWindow.isMaximized() : false;
  });

  ipcMain.handle('get-server-url', () => {
    return SERVER_URL;
  });

  ipcMain.on('update-discord-rpc', (_, trackData) => {
    setActivity(trackData).catch(() => {});
  });

  ipcMain.on('update-playback-state', (_, state = {}) => {
    currentPlaybackState = { ...currentPlaybackState, ...state };

    // Update tray menu
    updateTrayPlaybackState(mainWindow, currentPlaybackState);

    // Update Windows taskbar thumbar buttons
    updateThumbarButtons(!!currentPlaybackState.isPlaying);

    // Keep app awake during active playback
    setPowerSuspension(!!currentPlaybackState.isPlaying);

    // Sync Discord RPC
    if (currentPlaybackState.currentSong) {
      setActivity({
        title: currentPlaybackState.currentSong.title,
        artist: currentPlaybackState.currentSong.artist,
        album: currentPlaybackState.currentSong.album,
        duration: currentPlaybackState.duration,
        currentTime: currentPlaybackState.currentTime,
        isPlaying: !!currentPlaybackState.isPlaying,
        coverUrl: currentPlaybackState.currentSong.thumbnailHigh || currentPlaybackState.currentSong.thumbnail
      }).catch(() => {});
    } else if (!currentPlaybackState.isPlaying) {
      clearActivity().catch(() => {});
    }
  });
}

// App lifecycle
app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  setupIpcHandlers();
  registerGlobalMediaShortcuts();
  initDiscord().catch(() => {});

  // Start backend utility process
  await startBackendProcess();

  // Create UI Window
  createMainWindow();

  // Initialize Desktop Auto-Updater
  desktopUpdater.init(mainWindow);

  // Determine load URL
  const isDev = !app.isPackaged;
  let devViteActive = false;

  if (isDev) {
    // Check if Vite dev server is running on localhost:3000
    devViteActive = await isPortReachable(3000, 'localhost', 500);
  }

  if (devViteActive) {
    console.log('[Dropify Electron] Connecting to Vite Dev Server at http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
  } else {
    console.log(`[Dropify Electron] Connecting to local server at ${SERVER_URL}`);
    mainWindow.loadURL(SERVER_URL);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });
});

app.on('will-quit', () => {
  setIsQuitting(true);
  globalShortcut.unregisterAll();
  setPowerSuspension(false);
  clearActivity().catch(() => {});

  if (backendProcess) {
    try {
      backendProcess.kill();
    } catch (_) {}
    backendProcess = null;
  }
});
