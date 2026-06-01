# 已知问题 & 设计缺陷

> 记录已发现的 bug、设计缺陷、待优化点。每次发现问题时追加到此文件。

## 已知问题

### I1 - ELECTRON_RUN_AS_NODE 环境变量
- **问题**：系统环境变量 `ELECTRON_RUN_AS_NODE=1` 导致 Electron 以 Node.js 模式运行，`require('electron')` 返回路径字符串而非 API 对象
- **影响**：直接运行 `electron .` 或 `npx electron .` 失败
- **方案**：使用 `start.js` 启动器，在 spawn 时删除该环境变量
- **状态**：已修复

### I2 - e:/PROJECT 无写入权限
- **问题**：bash mkdir / touch 等命令在 e:/PROJECT 下返回 Permission denied（目录只有 RX 权限，无 W）
- **影响**：不能使用 bash 创建目录和文件
- **方案**：使用 Write 工具创建文件（自动创建父目录），npm install 以管理员权限运行
- **状态**：已知，已绕过

## 设计缺陷

### D1 - 剪贴板轮询而非事件驱动
- **问题**：500ms 轮询可能遗漏间隔极短的两次复制
- **影响**：极低概率丢失复制内容
- **方案**：Windows 有剪贴板监听 API (`AddClipboardFormatListener`)，但 Electron 未封装，需要原生模块。当前轮询方案对普通用户够用。
- **优先级**：低

### D2 - 图片存储无压缩
- **问题**：每次复制图片都存为原始 PNG，可能占用较大磁盘空间
- **影响**：频繁复制大图时，data/images/ 可能快速增长
- **方案**：后续可加缩略图压缩（resize + quality reduce）
- **优先级**：低

### D3 - 快捷键固定不可自定义
- **问题**：Ctrl+Shift+V 可能与其他软件冲突
- **影响**：冲突时快捷键无效
- **方案**：后续版本在设置中允许自定义快捷键
- **优先级**：中

## 待优化

_（暂无）_
