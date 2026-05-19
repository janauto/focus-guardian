// 持久化层：使用 electron-store（JSON 文件），避免 native 编译

import Store from 'electron-store'
import type { DailyStats, PetState, Settings } from '../shared/types'

interface StoreShape {
  settings: Settings
  pet: PetState
  /** 按日期归档的统计 */
  history: Record<string, DailyStats>
}

const DEFAULT_SETTINGS: Settings = {
  workApps: [
    'Code',
    'Visual Studio Code',
    'Xcode',
    'WebStorm',
    'IntelliJ',
    'PyCharm',
    'Terminal',
    'iTerm',
    'Warp',
    'Notion',
    'Obsidian',
    'Pages',
    'Numbers',
    'Keynote',
    'Figma',
    'Sketch',
    'Mail'
  ],
  distractApps: [
    'WeChat',
    '微信',
    'QQ',
    'Telegram',
    'TikTok',
    '抖音',
    'YouTube',
    'Bilibili',
    'B站',
    'Twitter',
    'Weibo',
    '微博',
    'Instagram',
    'Discord'
  ],
  distractGraceSeconds: 10,
  reminderLevel: 'standard',
  pomodoro: {
    enabled: true,
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    pomodorosUntilLongBreak: 4
  },
  dailyGoalMinutes: 120
}

const DEFAULT_PET: PetState = {
  totalFocusSeconds: 0,
  xp: 0,
  level: 1,
  coins: 0,
  stage: 'egg',
  mood: 'sleepy',
  streakDays: 0,
  lastActiveDate: ''
}

export class AppStore {
  private store: Store<StoreShape>

  constructor() {
    this.store = new Store<StoreShape>({
      name: 'focus-guardian',
      defaults: {
        settings: DEFAULT_SETTINGS,
        pet: DEFAULT_PET,
        history: {}
      }
    })
  }

  getSettings(): Settings {
    return { ...DEFAULT_SETTINGS, ...this.store.get('settings') }
  }

  setSettings(s: Settings): void {
    this.store.set('settings', s)
  }

  getPet(): PetState {
    return { ...DEFAULT_PET, ...this.store.get('pet') }
  }

  setPet(p: PetState): void {
    this.store.set('pet', p)
  }

  getDay(date: string): DailyStats {
    const history = this.store.get('history') as Record<string, DailyStats>
    return (
      history[date] ?? {
        date,
        focusSeconds: 0,
        distractSeconds: 0,
        distractCount: 0,
        pomodorosCompleted: 0,
        appUsage: {}
      }
    )
  }

  setDay(stats: DailyStats): void {
    const history = this.store.get('history') as Record<string, DailyStats>
    history[stats.date] = stats
    this.store.set('history', history)
  }

  resetDay(date: string): void {
    const history = this.store.get('history') as Record<string, DailyStats>
    delete history[date]
    this.store.set('history', history)
  }
}
