// 番茄钟引擎：管理工作 / 短休息 / 长休息阶段

import { EventEmitter } from 'node:events'
import type { PomodoroConfig, PomodoroPhase, PomodoroState } from '../shared/types'

export class PomodoroEngine extends EventEmitter {
  private cfgRef: () => PomodoroConfig
  private phase: PomodoroPhase = 'stopped'
  private remaining = 0
  private total = 0
  private completed = 0
  private timer: NodeJS.Timeout | null = null

  constructor(getConfig: () => PomodoroConfig) {
    super()
    this.cfgRef = getConfig
  }

  getState(): PomodoroState {
    return {
      phase: this.phase,
      completedPomodoros: this.completed,
      remainingSeconds: this.remaining,
      totalSeconds: this.total
    }
  }

  start(): void {
    if (this.phase === 'stopped') {
      this.enterPhase('work')
    }
    this.runTimer()
  }

  stop(): void {
    this.phase = 'stopped'
    this.remaining = 0
    this.total = 0
    this.clearTimer()
    this.emit('change', this.getState())
  }

  /** 跳过当前阶段，立即进入下一阶段 */
  skip(): void {
    this.advancePhase()
  }

  private runTimer(): void {
    this.clearTimer()
    this.timer = setInterval(() => {
      if (this.phase === 'stopped') return
      this.remaining -= 1
      if (this.remaining <= 0) {
        this.advancePhase()
      } else {
        this.emit('tick', this.getState())
      }
    }, 1000)
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  private advancePhase(): void {
    const cfg = this.cfgRef()
    if (this.phase === 'work') {
      this.completed += 1
      this.emit('pomodoroComplete', this.completed)
      const isLong = this.completed % cfg.pomodorosUntilLongBreak === 0
      this.enterPhase(isLong ? 'longBreak' : 'shortBreak')
    } else {
      this.enterPhase('work')
    }
    this.runTimer()
  }

  private enterPhase(phase: PomodoroPhase): void {
    const cfg = this.cfgRef()
    this.phase = phase
    const minutes =
      phase === 'work'
        ? cfg.workMinutes
        : phase === 'shortBreak'
          ? cfg.shortBreakMinutes
          : phase === 'longBreak'
            ? cfg.longBreakMinutes
            : 0
    this.total = Math.max(1, minutes) * 60
    this.remaining = this.total
    this.emit('phaseChange', this.getState())
  }
}
