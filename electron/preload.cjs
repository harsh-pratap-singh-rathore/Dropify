const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onWindowStateChange: (cb) => {
    const subscription = (_, state) => cb(state);
    ipcRenderer.on('window-state-change', subscription);
    return () => ipcRenderer.removeListener('window-state-change', subscription);
  },
  updateDiscordPresence: (trackData) => ipcRenderer.send('update-discord-rpc', trackData),
  updatePlaybackState: (state) => ipcRenderer.send('update-playback-state', state),
  onMediaAction: (cb) => {
    const subscription = (_, action) => cb(action);
    ipcRenderer.on('media-action', subscription);
    return () => ipcRenderer.removeListener('media-action', subscription);
  },
  getServerUrl: () => ipcRenderer.invoke('get-server-url'),
  checkForUpdates: (manual = false) => ipcRenderer.invoke('check-for-updates', manual),
  onUpdateAvailable: (cb) => {
    const subscription = (_, data) => cb(data);
    ipcRenderer.on('update-available', subscription);
    return () => ipcRenderer.removeListener('update-available', subscription);
  },
  openExternal: (url) => ipcRenderer.send('open-external-url', url),
  triggerUpdateAction: (action, downloadUrl) => ipcRenderer.send('trigger-update-action', { action, downloadUrl })
});
