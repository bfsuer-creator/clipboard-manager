# 历史剪贴板管理器 — CLAUDE.md

## 项目简介
Windows 桌面剪贴板历史管理工具，基于 Electron，支持文字和图片的记录、查看、搜索、置顶、删除。手动启动后系统托盘运行，Ctrl+Shift+V 弹出窗口。

## 文档索引

| 文档 | 路径 | 说明 |
|------|------|------|
| 需求 | [docs/requirements.md](docs/requirements.md) | 功能需求、非功能需求、用户故事 |
| 技术栈 | [docs/tech-stack.md](docs/tech-stack.md) | 技术选型理由、依赖清单 |
| 架构 | [docs/architecture.md](docs/architecture.md) | 模块职责、数据流、IPC 协议 |
| 执行步骤 | [docs/implementation-steps.md](docs/implementation-steps.md) | 分阶段执行计划，含验收标准 |
| 设计规范 | [docs/design-notes.md](docs/design-notes.md) | 配色、尺寸、动效参数 |
| 已知问题 | [docs/known-issues.md](docs/known-issues.md) | Bug、设计缺陷、待优化项 |

## 工作约定

1. **开始开发前**：先读 [docs/implementation-steps.md](docs/implementation-steps.md)，确认当前阶段和待做事项
2. **完成每步后**：在 [docs/implementation-steps.md](docs/implementation-steps.md) 中将该步骤标记为已完成，写验收说明
3. **每次对话结束**：在 `devlog/` 下写入当日日志（`YYYY-MM-DD.md`），包含完成事项、待办、遇到的问题
4. **发现 bug/缺陷**：追加到 [docs/known-issues.md](docs/known-issues.md)
5. **代码修改**：遵循 [docs/architecture.md](docs/architecture.md) 中的模块边界，不跨模块调用
6. **增量开发**：不提前实现下一步内容，保持每步独立可运行
7. **代码变更后**：运行 `npm start` 确认应用能正常启动
8. **使用 Write 工具创建文件**：bash `mkdir` 在 e:/PROJECT 下因权限问题不可用，始终用 Write 工具创建新文件
9. **启动方式**：使用 `node start.js` 启动应用（start.js 自动清除 ELECTRON_RUN_AS_NODE 环境变量）

## 项目结构

```
e:\PROJECT\
├── CLAUDE.md
├── docs/           # 项目标准文档
├── devlog/         # 每日开发日志
├── src/            # 源代码
│   ├── main.js     # Electron 主进程
│   ├── preload.js  # IPC 桥接
│   ├── store.js    # 数据持久化
│   └── renderer/   # UI 层
├── assets/         # 图标等静态资源
├── data/           # 运行时数据 (gitignore)
└── package.json
```
