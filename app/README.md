# Focus Guardian — Phase 1 MVP

> 专注守护者第一款产品（v0.1 MVP）。基于 PRD 中的 Phase 1 范围实现。

## 已实现功能（对应 PRD 第六章 Phase 1 ）

| PRD 项 | 实现位置 | 状态 |
|---|---|---|
| 桌面应用监控（核心） | `src/main/watcher.ts` + `classifier.ts` | ✅ 每秒采样前台窗口，按黑/白名单分类 |
| 基础公仔系统（1 种公仔） | `src/renderer/.../Pet.tsx` | ✅ 4 个成长阶段（蛋/幼/成长/成熟）+ 5 种情绪 |
| 等级系统（Lv.1-10） | `src/shared/leveling.ts` | ✅ XP 曲线 100+50·(L-1)，称号体系 |
| 分心提醒功能 | `controller.ts` `maybeNotifyDistraction` + `DistractOverlay.tsx` | ✅ 系统通知 + 屏幕边缘扣血特效 |
| 今日统计 | `TodayPanel.tsx` | ✅ 专注/分心时长、应用 Top 5、目标进度 |
| 基础番茄钟 | `src/main/pomodoro.ts` + `PomodoroCard.tsx` | ✅ 工作/短休/长休 三阶段切换 |

## 目录结构

```
app/
├── electron.vite.config.ts   # 构建配置
├── package.json
├── src/
│   ├── shared/               # 主/渲染共享类型与逻辑
│   │   ├── types.ts
│   │   └── leveling.ts
│   ├── main/                 # 主进程（Node 环境）
│   │   ├── index.ts          # Electron 入口
│   │   ├── controller.ts     # 状态机 + 协调器
│   │   ├── watcher.ts        # 活动窗口监控
│   │   ├── pomodoro.ts       # 番茄钟引擎
│   │   ├── classifier.ts     # 应用分类
│   │   └── store.ts          # 持久化（electron-store）
│   ├── preload/              # contextBridge 安全桥接
│   │   ├── index.ts
│   │   └── index.d.ts
│   └── renderer/             # React UI（Chromium 环境）
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── App.tsx
│           ├── store.ts        # Zustand UI store
│           ├── styles.css
│           └── components/
│               ├── Pet.tsx
│               ├── PomodoroCard.tsx
│               ├── TodayPanel.tsx
│               ├── CurrentApp.tsx
│               ├── SettingsPanel.tsx
│               ├── DistractOverlay.tsx
│               ├── Notices.tsx
│               └── TopBar.tsx
```

## 运行

```bash
# 安装依赖（首次会比较慢，需要下载 Electron）
npm install

# 开发模式（热更新）
npm run dev

# 类型检查
npm run typecheck

# 打包 macOS（输出到 release/）
npm run dist:mac
```

## 系统权限提示（macOS）

首次启动时，系统会提示：

1. **辅助功能 / 屏幕录制权限** — 用于读取前台窗口标题（`active-win` 需要）
2. **通知权限** — 用于分心提醒

不开启权限会导致窗口监控读不到 title 字段，但 app 名字仍可识别。

## 数据存储

所有数据保存在本地 `~/Library/Application Support/focus-guardian/focus-guardian.json`，**不上传任何信息**。

## 后续 Roadmap（PRD Phase 2+）

- Phase 2：摄像头注意力检测（MediaPipe 本地模型）
- Phase 3：公仔多阶段动画 / 装扮系统
- Phase 4：行为时间线 + AI 分析（Ollama）
- Phase 5：周/月报告 + 成就系统
