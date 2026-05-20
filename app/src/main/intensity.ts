// 交互强度监控器
//
// 通过 Electron `powerMonitor.getSystemIdleTime()` 拿到"距上次系统输入事件的秒数"，
// 每秒采样一次。维护 60s 滑动窗口，统计"活跃秒"占比作为交互强度评分。
//
// 一个"活跃秒"= 该秒采样到的 idle < activeWindowSeconds（默认 2s）。
// 这背后的直觉：正常工作时键盘/鼠标会持续触发输入；
//   - 若 idle 持续 > inactiveAfterSeconds（默认 60s），人可能在发呆/读屏；
//   - 若 idle 持续 > awayAfterSeconds（默认 180s），人可能离开座位。
//
// 该监控不需要键盘/鼠标 hook 权限，只用系统级 idle 计时，跨 macOS / Windows / Linux 通用。

import { powerMonitor } from 'electron'
import { EventEmitter } from 'node:events'
import type { IntensityConfig, IntensitySnapshot } from '../shared/types'

const WINDOW_SECONDS = 60

export class IntensityMonitor extends EventEmitter {
  private cfgRef: () => IntensityConfig
  /** 60s 滑窗：每个槽位为 0/1，1 表示该秒活跃 */
  private window: number[] = []
  private timer: NodeJS.Timeout | null = null
  private lastIdle = 0

  constructor(getConfig: () => IntensityConfig) {
    super()
    this.cfgRef = getConfig
  }

  start(): void {
    if (this.timer) return
    this.window = []
    this.timer = setInterval(() => this.tick(), 1000)
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.window = []
  }

  getSnapshot(): IntensitySnapshot {
    const cfg = this.cfgRef()
    const idleSeconds = this.lastIdle
    const total = this.window.length
    const active = this.window.reduce((s, v) => s + v, 0)
    const score = total === 0 ? 0 : Math.round((active / total) * 100)
    let level: IntensitySnapshot['level']
    if (idleSeconds >= cfg.awayAfterSeconds) level = 'away'
    else if (idleSeconds >= cfg.inactiveAfterSeconds) level = 'idle'
    else if (score < cfg.lowIntensityThreshold) level = 'low'
    else if (score < 50) level = 'medium'
    else level = 'high'
    return { score, idleSeconds, level }
  }

  private tick(): void {
    const cfg = this.cfgRef()
    if (!cfg.enabled) {
      this.lastIdle = 0
      this.window.push(1)
      this.trim()
      this.emit('tick', this.getSnapshot())
      return
    }
    let idle = 0
    try {
      idle = powerMonitor.getSystemIdleTime()
    } catch (e) {
      // 某些 Linux 环境下不可用；按"未知，视为活跃"处理
      idle = 0
    }
    this.lastIdle = idle
    const isActiveSec = idle < cfg.activeWindowSeconds ? 1 : 0
    this.window.push(isActiveSec)
    this.trim()
    this.emit('tick', this.getSnapshot())
  }

  private trim(): void {
    while (this.window.length > WINDOW_SECONDS) this.window.shift()
  }
}
