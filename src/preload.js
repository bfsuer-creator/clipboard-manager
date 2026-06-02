const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clipboardAPI', {
  // Get full history list
  getHistory: () => ipcRenderer.invoke('history:get'),

  // Listen for new clipboard items pushed from main process
  onNewItem: (callback) => {
    ipcRenderer.on('history:new-item', (_event, item) => callback(item));
  },

  // Listen for window shown event
  onWindowShown: (callback) => {
    ipcRenderer.on('window:shown', () => callback());
  },

  // Toggle pin status
  pinItem: (id) => ipcRenderer.invoke('item:pin', id),

  // Delete an item
  deleteItem: (id) => ipcRenderer.invoke('item:delete', id),

  // Copy item content back to clipboard
  copyToClipboard: (id) => ipcRenderer.invoke('clipboard:copy', id),

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // Update status
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update:status', (_event, info) => callback(info));
  },

  // App lifecycle
  quitApp: () => ipcRenderer.send('app:quit'),
  minimizeApp: () => ipcRenderer.send('app:minimize'),

  // Manual update check
  checkForUpdates: () => ipcRenderer.invoke('update:check')
});
