# 技术选型 & 依赖清单

## 运行时环境

| 项目 | 版本要求 |
|------|---------|
| Node.js | >= 18 LTS |
| npm | >= 9 |
| 操作系统 | Windows 10/11 |

## 技术栈

### 框架：Electron

选择 Electron 而非其他方案的对比：

| 方案 | 剪贴板 | 托盘 | 快捷键 | UI | 打包体积 |
|------|--------|------|--------|----|---------| 
| **Electron** | 原生支持文字+图片 | Tray API | globalShortcut | HTML/CSS | ~180MB |
| C# WPF | 完美 | 完美 | 完美 | XAML | ~50MB |
| Python+PyQt | 受限（图片难处理） | 可用 | 需第三方 | QSS | ~80MB |
| Tauri | 受限（Rust后端） | 可用 | 可用 | HTML/CSS | ~5MB |

**选择 Electron 的理由：**
- 剪贴板 API 成熟，`clipboard.readText()` / `clipboard.readImage()` 开箱即用
- HTML/CSS 实现卡片 UI 直观方便
- 社区成熟，遇到问题容易找到解决方案
- 用户是小白，JS 生态更容易维护

### 核心依赖

```json
{
  "dependencies": {
    "electron": "^33.0.0"
  },
  "devDependencies": {
    "electron-builder": "^25.0.0"
  }
}
```

不引入额外依赖的理由：
- `uuid` → 使用 `crypto.randomUUID()` (Node 18 内置)
- 状态管理 → 数据量小，纯 JS 对象足够
- UI 框架 → 原生 DOM 操作，避免引入 React/Vue 增加复杂度

### 打包工具

`electron-builder` — 输出 Windows NSIS 安装包 (.exe)
