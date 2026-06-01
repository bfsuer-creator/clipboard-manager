// Clipboard Manager — Renderer Logic

const listContainer = document.getElementById('listContainer');
const searchInput = document.getElementById('searchInput');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const retentionSelect = document.getElementById('retentionSelect');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const toast = document.getElementById('toast');
const statusEl = document.getElementById('status');
const filterBtns = document.querySelectorAll('.filter-btn');
const welcomeOverlay = document.getElementById('welcomeOverlay');
const welcomeDismissBtn = document.getElementById('welcomeDismissBtn');

let historyData = [];
let searchQuery = '';
let filterType = 'all';

// --- Init ---

async function init() {
  const settings = await window.clipboardAPI.getSettings();
  retentionSelect.value = settings.retentionDays;

  historyData = await window.clipboardAPI.getHistory();
  render();

  // Welcome overlay for first-time users
  if (!settings.onboardingComplete) {
    welcomeOverlay.style.display = 'flex';
  }

  welcomeDismissBtn.addEventListener('click', async () => {
    welcomeOverlay.style.display = 'none';
    await window.clipboardAPI.saveSettings({ ...settings, onboardingComplete: true });
  });

  // Enable search
  searchInput.disabled = false;
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    render();
  });

  // Filter buttons
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterType = btn.dataset.filter;
      render();
    });
  });

  // Settings
  settingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
  });

  saveSettingsBtn.addEventListener('click', async () => {
    const newSettings = { retentionDays: parseInt(retentionSelect.value) };
    const currentSettings = await window.clipboardAPI.getSettings();
    await window.clipboardAPI.saveSettings({ ...currentSettings, ...newSettings });
    historyData = await window.clipboardAPI.getHistory();
    render();
    settingsPanel.style.display = 'none';
    showToast('设置已保存');
  });

  // Listen for new items
  window.clipboardAPI.onNewItem(async (item) => {
    historyData = await window.clipboardAPI.getHistory();
    render();
  });

  // Refresh on window shown + auto-focus search
  window.clipboardAPI.onWindowShown(async () => {
    historyData = await window.clipboardAPI.getHistory();
    render();
    searchInput.focus();
  });

  // Update status
  window.clipboardAPI.onUpdateStatus((info) => {
    if (info.status === 'downloading') {
      statusEl.textContent = '更新中...';
    } else if (info.status === 'downloaded') {
      statusEl.textContent = '已下载';
      showToast('新版本已就绪，下次启动自动更新');
    }
  });
}

// --- Render ---

function render() {
  let filtered = historyData.filter(item => {
    if (filterType === 'fav' && !item.pinned) return false;
    if (filterType === 'text' && item.type !== 'text') return false;
    if (filterType === 'image' && item.type !== 'image') return false;
    if (!searchQuery) return true;
    if (item.type === 'text') {
      return item.content && item.content.toLowerCase().includes(searchQuery);
    }
    return false;
  });

  if (filtered.length === 0) {
    if (searchQuery) {
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128269;</div><p>无匹配结果</p></div>';
    } else if (filterType === 'text') {
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128221;</div><p>暂无文字记录</p><p class="hint">复制的文字会显示在这里</p></div>';
    } else if (filterType === 'image') {
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128247;</div><p>暂无图片记录</p><p class="hint">截图或复制的图片会显示在这里</p></div>';
    } else {
      listContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">&#128203;</div><p>还没有剪贴板记录</p><p class="hint">试试复制一段文字或截图，内容会自动出现在这里</p><p class="shortcut-info">按 Ctrl+Shift+V 可随时呼出此窗口</p></div>';
    }
    return;
  }

  listContainer.innerHTML = filtered.map(item => renderCard(item)).join('');
  bindCardEvents();
}

function renderCard(item) {
  const time = new Date(item.timestamp).toLocaleString('zh-CN');
  const favorited = item.pinned;

  let bodyHtml = '';
  if (item.type === 'image') {
    const imgPath = 'file:///' + item.imagePath.replace(/\\/g, '/');
    bodyHtml = `<div class="card-image"><img src="${imgPath}" alt="图片" loading="lazy"></div>`;
  } else {
    bodyHtml = `<div class="card-text">${escapeHtml(item.content || '')}</div>`;
  }

  return `
    <div class="card ${favorited ? 'favorited' : ''}" data-id="${item.id}">
      <div class="card-body" data-action="copy">
        ${favorited ? '<span class="fav-badge">已收藏</span>' : ''}
        ${bodyHtml}
      </div>
      <div class="card-footer">
        <span class="card-time">${time}</span>
        <div class="card-actions">
          <button class="btn-fav ${favorited ? 'active' : ''}" data-action="fav" title="收藏">&#11088;</button>
          <button class="btn-delete" data-action="delete" title="删除">&#128465;</button>
        </div>
      </div>
    </div>
  `;
}

function bindCardEvents() {
  listContainer.querySelectorAll('.card-body[data-action="copy"]').forEach(el => {
    el.addEventListener('click', async (e) => {
      const id = el.closest('.card').dataset.id;
      await window.clipboardAPI.copyToClipboard(id);
      showToast('已复制到剪贴板');
    });
  });

  listContainer.querySelectorAll('[data-action="fav"]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = el.closest('.card').dataset.id;
      await window.clipboardAPI.pinItem(id);
      historyData = await window.clipboardAPI.getHistory();
      render();
    });
  });

  listContainer.querySelectorAll('[data-action="delete"]').forEach(el => {
    el.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = el.closest('.card').dataset.id;
      await window.clipboardAPI.deleteItem(id);
      historyData = await window.clipboardAPI.getHistory();
      render();
    });
  });
}

// --- Toast ---

let toastTimer = null;
function showToast(message) {
  toast.textContent = message;
  toast.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.display = 'none';
  }, 1500);
}

// --- Utils ---

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// --- Start ---
document.addEventListener('DOMContentLoaded', init);
