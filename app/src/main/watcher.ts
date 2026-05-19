// 活动窗口监控器：每秒采样一次前台应用，发出窗口事件

import { EventEmitter } from 'node:events'
import type { ActiveWindowInfo, Settings } from '../shared/types'
import { classifyApp } from './classifier'

// active-win@8 是 ESM 模块，主进程为 CJS，使用动态 import 加载
type ActiveWinFn = () => Promise<{ owner: { name: string }; title: string; url?: string } | undefined>
let activeWinFn: ActiveWinFn | null = null

async function getActiveWin(): Promise<ActiveWinFn> {
  if (activeWinFn) return activeWinFn
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod: any = await import('active-win')
  const fn: ActiveWinFn = mod.default ?? mod.activeWindow ?? mod
  activeWinFn = fn
  return fn
}

export interface WatcherEvents {
  window: (info: ActiveWindowInfo) => void
  error: (err: unknown) => void
}

export class ActiveWindowWatcher extends EventEmitter {
  private timer: NodeJS.Timeout | null = null
  private settingsRef: () => Settings
  private intervalMs: number

  constructor(getSettings: () => Settings, intervalMs = 1000) {
    super()
    this.settingsRef = getSettings
    this.intervalMs = intervalMs
  }

  start(): void {
    if (this.timer) return
    const tick = async () => {
      try {
        const fn = await getActiveWin()
        const w = await fn()
        if (w) {
          const settings = this.settingsRef()
          const info: ActiveWindowInfo = {
            app: w.owner?.name ?? 'Unknown',
            title: w.title ?? '',
            url: w.url,
            category: classifyApp(w.owner?.name ?? '', w.title ?? '', settings),
            timestamp: Date.now()
          }
          this.emit('window', info)
        }
      } catch (err) {
        this.emit('error', err)
      }
    }
    // 立即触发一次
    void tick()
    this.timer = setInterval(tick, this.intervalMs)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
