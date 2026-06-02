const { app, BrowserWindow, Tray, Menu, globalShortcut, clipboard, nativeImage, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const store = require('./store.js');
const { autoUpdater } = require('electron-updater');

// Use userData directory for production, relative path for development
const isPackaged = app.isPackaged;
if (isPackaged) {
  store.init(path.join(app.getPath('userData'), 'data'));
}

app.isQuitting = false;

let mainWindow = null;
let tray = null;
let lastClipboardText = '';
let lastClipboardImageHash = '';

// --- Window ---

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 600,
    resizable: true,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Center window on screen
  mainWindow.once('ready-to-show', () => {
    mainWindow.center();
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function toggleWindow() {
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
    mainWindow.focus();
  } else if (mainWindow.isVisible()) {
    mainWindow.hide();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
  mainWindow.webContents.send('window:shown');
}

// --- Tray ---

function createTray() {
  const iconPath = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开主界面',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('剪贴板历史管理器');
  tray.setContextMenu(contextMenu);
  tray.on('click', toggleWindow);
}

// --- Global Shortcut ---

function registerShortcut() {
  const registered = globalShortcut.register('CommandOrControl+Shift+V', toggleWindow);
  if (!registered) {
    console.warn('Failed to register global shortcut Ctrl+Shift+V');
  }
}

// --- Clipboard Polling ---

function startClipboardPolling() {
  setInterval(() => {
    // Check for image first (clipboard might have both)
    const img = clipboard.readImage();
    if (!img.isEmpty()) {
      const hash = hashBuffer(img.toPNG());
      if (hash !== lastClipboardImageHash) {
        lastClipboardImageHash = hash;
        const imagePath = store.saveImage(img.toPNG());
        const entry = store.addItem({
          type: 'image',
          imagePath: imagePath
        });
        store.cleanup(store.loadSettings().retentionDays, store.MAX_ITEMS);
        sendToRenderer('history:new-item', entry);
        return;
      }
    }

    // Check for text
    const text = clipboard.readText();
    if (text && text !== lastClipboardText) {
      lastClipboardText = text;
      const entry = store.addItem({
        type: 'text',
        content: text
      });
      store.cleanup(store.loadSettings().retentionDays, store.MAX_ITEMS);
      sendToRenderer('history:new-item', entry);
    }
  }, 500);
}

function hashBuffer(buf) {
  const crypto = require('crypto');
  return crypto.createHash('md5').update(buf).digest('hex');
}

function sendToRenderer(channel, data) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
}

// --- IPC Handlers ---

function registerIpcHandlers() {
  ipcMain.handle('history:get', () => store.getHistory());

  ipcMain.handle('item:pin', (_event, id) => store.pinItem(id));

  ipcMain.handle('item:delete', (_event, id) => store.removeItem(id));

  ipcMain.handle('clipboard:copy', (_event, id) => {
    const history = store.loadHistory();
    const item = history.find(h => h.id === id);
    if (!item) return false;

    if (item.type === 'text') {
      clipboard.writeText(item.content);
    } else if (item.type === 'image' && item.imagePath) {
      const img = nativeImage.createFromPath(item.imagePath);
      clipboard.writeImage(img);
    }
    return true;
  });

  ipcMain.handle('settings:get', () => store.loadSettings());

  ipcMain.handle('settings:save', (_event, settings) => {
    store.saveSettings(settings);
    store.cleanup(settings.retentionDays, store.MAX_ITEMS);
    return store.loadSettings();
  });

  ipcMain.on('app:quit', () => {
    app.isQuitting = true;
    app.quit();
  });

  ipcMain.on('app:minimize', () => {
    mainWindow.minimize();
  });
}

// --- Auto Updater ---

function setupAutoUpdater() {
  if (!app.isPackaged) {
    // Skip update check in development
    sendToRenderer('update:status', { status: 'dev-mode' });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', () => {
    sendToRenderer('update:status', { status: 'downloading' });
  });

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('update:status', { status: 'up-to-date' });
  });

  autoUpdater.on('update-downloaded', () => {
    sendToRenderer('update:status', { status: 'downloaded' });
  });

  autoUpdater.on('error', (err) => {
    sendToRenderer('update:status', { status: 'error', message: err.message });
  });

  // Check every 3 hours
  autoUpdater.checkForUpdatesAndNotify();
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 3 * 60 * 60 * 1000);

  // Manual check IPC
  ipcMain.handle('update:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { ok: true, info: result ? result.updateInfo.version : null };
    } catch (err) {
      return { ok: false, message: err.message };
    }
  });
}

// --- Single Instance Lock ---

function ensureDesktopShortcut() {
  try {
    const shortcutPath = path.join(app.getPath('desktop'), '剪贴板历史管理器.lnk');
    if (!fs.existsSync(shortcutPath)) {
      shell.writeShortcutLink(shortcutPath, {
        target: app.getPath('exe'),
        description: '剪贴板历史管理器',
        icon: app.getPath('exe'),
        iconIndex: 0
      });
    }
  } catch (_) {
    // ignore errors creating shortcut
  }
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// --- App Lifecycle ---

app.whenReady().then(() => {
  registerIpcHandlers();
  createTray();
  registerShortcut();
  createWindow();
  startClipboardPolling();
  setupAutoUpdater();
  ensureDesktopShortcut();

  // Initial cleanup on startup
  const settings = store.loadSettings();
  store.cleanup(settings.retentionDays, store.MAX_ITEMS);
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});
