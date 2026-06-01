# 系统架构 & 模块职责

## 进程模型

```
┌────────────────────────────────────────────┐
│                  Main Process               │
│  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │  Tray    │ │GlobalShortcut│ Clipboard   │ │
│  │  托盘管理 │ │ Ctrl+Shift+V│  Polling     │ │
│  └──────────┘ └──────────┘ └─────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │            Store (store.js)             │ │
│  │   JSON读写 │ 图片存取 │ 清理策略 │ 设置  │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │          IPC Handler (main.js)          │ │
│  │  getHistory / pinItem / deleteItem ...  │ │
│  └────────────────────────────────────────┘ │
└──────────────┬─────────────────────────────┘
               │  IPC (contextBridge)
┌──────────────┴─────────────────────────────┐
│              Renderer Process               │
│  ┌────────────────────────────────────────┐ │
│  │   preload.js → 暴露安全 API             │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │   app.js → 渲染、搜索、交互逻辑         │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │   index.html + style.css → UI 层        │ │
│  └────────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

## 模块职责

### main.js — 主进程入口
- 创建并管理 BrowserWindow
- 注册全局快捷键 (Ctrl+Shift+V)
- 创建系统托盘及右键菜单
- 启动剪贴板轮询 (500ms 间隔)
- 注册 IPC handlers
- 管理应用生命周期（窗口关闭 → 隐藏到托盘，托盘退出 → 真正退出）

### store.js — 数据持久化层
- `loadHistory()` — 从 `data/history.json` 加载，返回数组
- `saveHistory(history)` — 将数组写入 `data/history.json`
- `addItem(item)` — 添加新条目（文字存 content，图片存文件 + 记录 imagePath）
- `removeItem(id)` — 删除条目 + 关联图片文件
- `pinItem(id)` — 切换置顶状态
- `getHistory()` — 返回当前全部历史（置顶优先，时间降序）
- `cleanup(retentionDays, maxCount)` — 清理过期 + 超限条目
- `saveImage(buffer)` — 保存图片，返回文件路径
- `loadSettings()` / `saveSettings(settings)` — 读写设置

### preload.js — 安全桥接层
使用 `contextBridge.exposeInMainWorld` 暴露 API：
- `clipboardAPI.getHistory()` → 主进程返回历史列表
- `clipboardAPI.onNewItem(callback)` → 主进程推送新条目
- `clipboardAPI.pinItem(id)` → 切换置顶
- `clipboardAPI.deleteItem(id)` → 删除条目
- `clipboardAPI.copyToClipboard(id)` → 复制到系统剪贴板
- `clipboardAPI.getSettings()` → 读取设置
- `clipboardAPI.saveSettings(settings)` → 保存设置

### renderer/ — 渲染进程 (UI)
- `index.html` — 页面结构
- `style.css` — 淡蓝色主题样式
- `app.js` — 交互逻辑

## 数据流

```
用户 Ctrl+C 复制
    │
    ▼
[主进程] 500ms 轮询检测到剪贴板变化
    │
    ▼
[store.js] addItem() → 写入 history.json + 图片文件
    │
    ▼
[主进程] 通过 IPC 推送新条目给渲染进程
    │
    ▼
[app.js] 收到新条目 → 在列表顶部插入新卡片
```

## 通信协议

IPC 通道命名规范：

| 通道名 | 方向 | 用途 |
|--------|------|------|
| `history:get` | 渲染→主 | 获取全部历史 |
| `history:new-item` | 主→渲染 | 推送新条目 |
| `item:pin` | 渲染→主 | 切换置顶 |
| `item:delete` | 渲染→主 | 删除条目 |
| `clipboard:copy` | 渲染→主 | 复制到剪贴板 |
| `settings:get` | 渲染→主 | 读取设置 |
| `settings:save` | 渲染→主 | 保存设置 |

## 模块边界规则

1. store.js 不依赖 Electron，可独立用 Node 测试
2. preload.js 只做桥接，不包含业务逻辑
3. app.js 不直接访问 Node API，只通过 preload 暴露的 API
4. main.js 负责协调，不直接操作 DOM
