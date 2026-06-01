const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_SETTINGS = { retentionDays: 3, onboardingComplete: false };
const MAX_ITEMS = 200;

let DATA_DIR = path.join(__dirname, '..', 'data');
let HISTORY_FILE = path.join(DATA_DIR, 'history.json');
let IMAGES_DIR = path.join(DATA_DIR, 'images');
let SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function init(dataDir) {
  if (dataDir) {
    DATA_DIR = dataDir;
    HISTORY_FILE = path.join(DATA_DIR, 'history.json');
    IMAGES_DIR = path.join(DATA_DIR, 'images');
    SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// --- History ---

function loadHistory() {
  ensureDir(DATA_DIR);
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveHistory(history) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
}

function getHistory() {
  const history = loadHistory();
  // Pinned first, then by timestamp descending
  return history.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp - a.timestamp;
  });
}

function addItem(item) {
  const history = loadHistory();
  const entry = {
    id: item.id || crypto.randomUUID(),
    type: item.type, // 'text' or 'image'
    content: item.content || null,
    imagePath: item.imagePath || null,
    timestamp: item.timestamp || Date.now(),
    pinned: item.pinned || false
  };
  history.push(entry);
  saveHistory(history);
  return entry;
}

function removeItem(id) {
  const history = loadHistory();
  const index = history.findIndex(item => item.id === id);
  if (index === -1) return null;

  const removed = history[index];

  // Delete associated image file
  if (removed.imagePath) {
    const fullPath = path.join(DATA_DIR, removed.imagePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  history.splice(index, 1);
  saveHistory(history);
  return removed;
}

function pinItem(id) {
  const history = loadHistory();
  const item = history.find(item => item.id === id);
  if (!item) return null;
  item.pinned = !item.pinned;
  saveHistory(history);
  return item;
}

// --- Images ---

function saveImage(buffer) {
  ensureDir(IMAGES_DIR);
  const filename = crypto.randomUUID() + '.png';
  const filePath = path.join(IMAGES_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// --- Cleanup ---

function cleanup(retentionDays, maxCount) {
  const history = loadHistory();
  const now = Date.now();
  const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;

  let cleaned = history.filter(item => {
    if (item.pinned) return true;
    return item.timestamp >= cutoff;
  });

  // Enforce max item limit (remove oldest unpinned)
  const pinned = cleaned.filter(item => item.pinned);
  const unpinned = cleaned.filter(item => !item.pinned);

  if (unpinned.length > maxCount) {
    // Sort oldest first to remove
    unpinned.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = unpinned.splice(0, unpinned.length - maxCount);

    // Delete image files for removed items
    for (const item of toRemove) {
      if (item.imagePath) {
        const fullPath = path.join(DATA_DIR, item.imagePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }
    }
  }

  // Sort final list: pinned first, then by time descending
  cleaned = [...pinned, ...unpinned];
  cleaned.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp - a.timestamp;
  });

  saveHistory(cleaned);
  return {
    total: cleaned.length,
    removed: history.length - cleaned.length
  };
}

// --- Settings ---

function loadSettings() {
  ensureDir(DATA_DIR);
  if (!fs.existsSync(SETTINGS_FILE)) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings(settings) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
}

module.exports = {
  init,
  loadHistory,
  saveHistory,
  getHistory,
  addItem,
  removeItem,
  pinItem,
  saveImage,
  cleanup,
  loadSettings,
  saveSettings,
  MAX_ITEMS
};
