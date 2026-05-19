// 跨进程共享类型定义

export type FocusState = 'idle' | 'focused' | 'distracted' | 'break'

export type AppCategory = 'work' | 'distract' | 'neutral'

export interface AppRule {
  /** 用于匹配的应用名（不区分大小写，子串匹配） */
  name: string
  category: AppCategory
}

export interface ActiveWindowInfo {
  app: string
  title: string
  url?: string
  category: AppCategory
  timestamp: number
}

export interface PomodoroConfig {
  enabled: boolean
  workMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  pomodorosUntilLongBreak: number
}

export type PomodoroPhase = 'work' | 'shortBreak' | 'longBreak' | 'stopped'

export interface PomodoroState {
  phase: PomodoroPhase
  /** 已完成的工作番茄数（用于决定何时进入长休息） */
  completedPomodoros: number
  /** 当前阶段剩余秒数 */
  remainingSeconds: number
  /** 当前阶段总秒数 */
  totalSeconds: number
}

export interface Settings {
  /** 工作应用白名单关键字 */
  workApps: string[]
  /** 分心应用黑名单关键字 */
  distractApps: string[]
  /** 分心多少秒后扣经验 */
  distractGraceSeconds: number
  /** 提醒强度：温和/标准/严格 */
  reminderLevel: 'gentle' | 'standard' | 'strict'
  pomodoro: PomodoroConfig
  /** 每日专注目标（分钟） */
  dailyGoalMinutes: number
}

export interface DailyStats {
  /** YYYY-MM-DD */
  date: string
  focusSeconds: number
  distractSeconds: number
  distractCount: number
  pomodorosCompleted: number
  appUsage: Record<string, number>
}

export interface PetState {
  /** 累计专注秒数（用于成长） */
  totalFocusSeconds: number
  /** 经验值 */
  xp: number
  /** 等级 */
  level: number
  /** 金币 */
  coins: number
  /** 成长阶段 */
  stage: 'egg' | 'baby' | 'teen' | 'adult'
  /** 公仔当前情绪 */
  mood: 'sleepy' | 'happy' | 'worried' | 'sick' | 'expecting'
  /** 连续打卡天数 */
  streakDays: number
  /** 最后一次记录日期 */
  lastActiveDate: string
}

export interface AppSnapshot {
  state: FocusState
  active: ActiveWindowInfo | null
  pet: PetState
  pomodoro: PomodoroState
  todayStats: DailyStats
  settings: Settings
  /** 当前会话本次专注开始的时间戳；null 表示未在专注 */
  sessionStartedAt: number | null
  /** 距离开始/上次切换状态过去的秒数 */
  stateDurationSeconds: number
}

/** 渲染层主动调用的 API（preload 暴露） */
export interface FocusAPI {
  getSnapshot(): Promise<AppSnapshot>
  startSession(): Promise<void>
  stopSession(): Promise<void>
  startPomodoro(): Promise<void>
  stopPomodoro(): Promise<void>
  skipPomodoroPhase(): Promise<void>
  updateSettings(patch: Partial<Settings>): Promise<Settings>
  classifyApp(appName: string, category: AppCategory): Promise<Settings>
  feedPet(): Promise<PetState>
  resetToday(): Promise<void>
  onSnapshot(cb: (s: AppSnapshot) => void): () => void
  onNotice(cb: (n: { kind: string; message: string }) => void): () => void
}
