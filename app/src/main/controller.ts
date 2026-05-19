// 应用核心控制器：状态机 + 统计 + 公仔成长

import { BrowserWindow, Notification } from 'electron'
import type {
  ActiveWindowInfo,
  AppCategory,
  AppSnapshot,
  DailyStats,
  FocusState,
  PetState,
  Settings
} from '../shared/types'
import { computeLevel, stageForFocusSeconds } from '../shared/leveling'
import { todayKey } from './classifier'
import { AppStore } from './store'
import { PomodoroEngine } from './pomodoro'
import { ActiveWindowWatcher } from './watcher'

export class Controller {
  private store: AppStore
  private watcher: ActiveWindowWatcher
  private pomodoro: PomodoroEngine

  private state: FocusState = 'idle'
  private active: ActiveWindowInfo | null = null
  private sessionStartedAt: number | null = null
  private stateChangedAt: number = Date.now()

  /** 距离上次扣 XP 的累计分心秒数 */
  private distractAccumSec = 0
  private lastDistractNoticeAt = 0
  private snapshotPusher: NodeJS.Timeout | null = null
  private win: BrowserWindow | null = null

  constructor() {
    this.store = new AppStore()
    this.watcher = new ActiveWindowWatcher(() => this.store.getSettings(), 1000)
    this.pomodoro = new PomodoroEngine(() => this.store.getSettings().pomodoro)

    this.watcher.on('window', (info) => this.onWindow(info))
    this.watcher.on('error', (err) => console.error('[watcher]', err))

    this.pomodoro.on('phaseChange', (s) => {
      const cfg = this.store.getSettings().pomodoro
      if (s.phase === 'shortBreak' || s.phase === 'longBreak') {
        this.notify('该休息啦', `进入${s.phase === 'longBreak' ? '长' : '短'}休息时段，公仔陪你放松一下`)
      } else if (s.phase === 'work') {
        this.notify('开始专注', `开始一个 ${cfg.workMinutes} 分钟的番茄钟`)
      }
      this.pushSnapshot()
    })
    this.pomodoro.on('tick', () => this.pushSnapshot())
    this.pomodoro.on('pomodoroComplete', () => {
      const day = this.todayStats()
      day.pomodorosCompleted += 1
      this.store.setDay(day)
      this.awardXp(50, '完成番茄钟')
    })
  }

  attachWindow(win: BrowserWindow): void {
    this.win = win
  }

  /** 启动专注会话 */
  startSession(): void {
    this.watcher.start()
    this.sessionStartedAt = Date.now()
    this.transition('idle')
    if (this.snapshotPusher === null) {
      // 后台周期推送：保证 UI 计时器不漂移
      this.snapshotPusher = setInterval(() => this.tick(), 1000)
    }
    this.checkStreakRollover()
    this.pushSnapshot()
  }

  stopSession(): void {
    this.watcher.stop()
    this.pomodoro.stop()
    this.sessionStartedAt = null
    this.transition('idle')
    if (this.snapshotPusher) {
      clearInterval(this.snapshotPusher)
      this.snapshotPusher = null
    }
    this.pushSnapshot()
  }

  startPomodoro(): void {
    if (!this.sessionStartedAt) this.startSession()
    this.pomodoro.start()
  }

  stopPomodoro(): void {
    this.pomodoro.stop()
  }

  skipPomodoroPhase(): void {
    this.pomodoro.skip()
  }

  updateSettings(patch: Partial<Settings>): Settings {
    const next = { ...this.store.getSettings(), ...patch }
    this.store.setSettings(next)
    this.pushSnapshot()
    return next
  }

  classifyAppManually(appName: string, category: AppCategory): Settings {
    const settings = this.store.getSettings()
    const removeFrom = (arr: string[]) => arr.filter((a) => a.toLowerCase() !== appName.toLowerCase())
    settings.workApps = removeFrom(settings.workApps)
    settings.distractApps = removeFrom(settings.distractApps)
    if (category === 'work') settings.workApps.push(appName)
    if (category === 'distract') settings.distractApps.push(appName)
    this.store.setSettings(settings)
    this.pushSnapshot()
    return settings
  }

  feedPet(): PetState {
    const pet = this.store.getPet()
    const cost = 10
    if (pet.coins >= cost) {
      pet.coins -= cost
      pet.mood = 'happy'
      this.store.setPet(pet)
    }
    this.pushSnapshot()
    return pet
  }

  resetToday(): void {
    this.store.resetDay(todayKey())
    this.pushSnapshot()
  }

  getSnapshot(): AppSnapshot {
    const settings = this.store.getSettings()
    return {
      state: this.state,
      active: this.active,
      pet: this.store.getPet(),
      pomodoro: this.pomodoro.getState(),
      todayStats: this.todayStats(),
      settings,
      sessionStartedAt: this.sessionStartedAt,
      stateDurationSeconds: Math.floor((Date.now() - this.stateChangedAt) / 1000)
    }
  }

  // ----------------- 内部 -----------------

  private onWindow(info: ActiveWindowInfo): void {
    this.active = info
    if (!this.sessionStartedAt) return
    const next: FocusState =
      this.pomodoro.getState().phase === 'shortBreak' || this.pomodoro.getState().phase === 'longBreak'
        ? 'break'
        : info.category === 'distract'
          ? 'distracted'
          : 'focused'
    if (next !== this.state) {
      // 进入分心状态：节流通知
      if (next === 'distracted') {
        this.maybeNotifyDistraction(info)
        const day = this.todayStats()
        day.distractCount += 1
        this.store.setDay(day)
      }
      this.transition(next)
    }
  }

  private transition(next: FocusState): void {
    this.state = next
    this.stateChangedAt = Date.now()
    if (next !== 'distracted') this.distractAccumSec = 0
    // 推送
    this.pushSnapshot()
  }

  /** 每秒 tick：累加专注 / 分心时长，扣血或加经验 */
  private tick(): void {
    if (!this.sessionStartedAt) return
    const day = this.todayStats()
    const settings = this.store.getSettings()

    if (this.state === 'focused') {
      day.focusSeconds += 1
      if (this.active?.app) {
        day.appUsage[this.active.app] = (day.appUsage[this.active.app] ?? 0) + 1
      }
      // 每分钟 +1 XP
      if (day.focusSeconds % 60 === 0) this.awardXp(1)
      // 连续 30min 额外奖励 50XP
      if (day.focusSeconds > 0 && day.focusSeconds % 1800 === 0) this.awardXp(50, '连续专注 30 分钟')
      // 累计专注秒数
      const pet = this.store.getPet()
      pet.totalFocusSeconds += 1
      pet.stage = stageForFocusSeconds(pet.totalFocusSeconds)
      pet.mood = pet.mood === 'sick' ? 'worried' : 'happy'
      this.store.setPet(pet)
    } else if (this.state === 'distracted') {
      day.distractSeconds += 1
      this.distractAccumSec += 1
      if (this.active?.app) {
        day.appUsage[this.active.app] = (day.appUsage[this.active.app] ?? 0) + 1
      }
      // 超过宽容期，每 60 秒扣 10XP
      if (
        this.distractAccumSec > settings.distractGraceSeconds &&
        this.distractAccumSec % 60 === 0
      ) {
        this.awardXp(-10, '分心扣经验')
        const pet = this.store.getPet()
        pet.mood = 'sick'
        this.store.setPet(pet)
      }
    }
    this.store.setDay(day)
    this.pushSnapshot()
  }

  private todayStats(): DailyStats {
    return this.store.getDay(todayKey())
  }

  private awardXp(amount: number, reason?: string): void {
    const pet = this.store.getPet()
    pet.xp = Math.max(0, pet.xp + amount)
    if (amount > 0) pet.coins += Math.floor(amount / 5)
    const { level } = computeLevel(pet.xp)
    if (level > pet.level) {
      pet.level = level
      this.notify('升级了', `公仔升到了 Lv.${level}`)
    }
    pet.level = level
    this.store.setPet(pet)
    if (reason && Math.abs(amount) >= 10) {
      this.sendNotice('xp', `${reason} ${amount > 0 ? '+' : ''}${amount} XP`)
    }
  }

  private maybeNotifyDistraction(info: ActiveWindowInfo): void {
    const now = Date.now()
    const settings = this.store.getSettings()
    const cooldown =
      settings.reminderLevel === 'gentle' ? 4 * 60_000 : settings.reminderLevel === 'strict' ? 60_000 : 2 * 60_000
    if (now - this.lastDistractNoticeAt < cooldown) return
    this.lastDistractNoticeAt = now
    this.notify('公仔在担心你', `检测到分心应用：${info.app}，回到工作吧`)
    this.sendNotice('distract', `检测到分心：${info.app}`)
  }

  private notify(title: string, body: string): void {
    try {
      if (Notification.isSupported()) {
        new Notification({ title, body, silent: false }).show()
      }
    } catch (e) {
      console.error('[notify]', e)
    }
  }

  private sendNotice(kind: string, message: string): void {
    this.win?.webContents.send('notice', { kind, message })
  }

  private pushSnapshot(): void {
    if (!this.win || this.win.isDestroyed()) return
    this.win.webContents.send('snapshot', this.getSnapshot())
  }

  /** 跨日：streak 维护 */
  private checkStreakRollover(): void {
    const pet = this.store.getPet()
    const today = todayKey()
    if (pet.lastActiveDate === today) return
    if (pet.lastActiveDate) {
      const last = new Date(pet.lastActiveDate)
      const diff = Math.round((new Date(today).getTime() - last.getTime()) / 86400000)
      if (diff === 1) pet.streakDays += 1
      else if (diff > 1) pet.streakDays = 1
      else pet.streakDays = Math.max(1, pet.streakDays)
    } else {
      pet.streakDays = 1
    }
    pet.lastActiveDate = today
    this.store.setPet(pet)
  }
}
