import type { PomodoroConfig, PomodoroState } from '../../../shared/types'

interface Props {
  pomodoro: PomodoroState
  pomodoroCfg: PomodoroConfig
}

const PHASE_LABEL: Record<PomodoroState['phase'], string> = {
  work: '专注时段',
  shortBreak: '短休息',
  longBreak: '长休息',
  stopped: '未启动'
}

export function PomodoroCard({ pomodoro, pomodoroCfg }: Props): JSX.Element {
  const totalMin = pomodoroCfg.workMinutes
  const display = formatTime(pomodoro.remainingSeconds || totalMin * 60)
  const isRunning = pomodoro.phase !== 'stopped'
  const pct =
    pomodoro.totalSeconds > 0
      ? Math.round(((pomodoro.totalSeconds - pomodoro.remainingSeconds) / pomodoro.totalSeconds) * 100)
      : 0

  return (
    <div className="pomodoro">
      <div className="pomodoro-header">
        <h3>🍅 番茄钟</h3>
        <span className={`phase-pill phase-${pomodoro.phase}`}>{PHASE_LABEL[pomodoro.phase]}</span>
      </div>
      <div className="pomodoro-time">{display}</div>
      <div className="pomodoro-bar">
        <div className="pomodoro-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="pomodoro-meta">
        已完成 {pomodoro.completedPomodoros} 个番茄
        {pomodoro.completedPomodoros >= pomodoroCfg.pomodorosUntilLongBreak &&
          pomodoro.phase === 'work' && <span> · 下次进入长休息</span>}
      </div>
      <div className="pomodoro-actions">
        {!isRunning ? (
          <button className="btn primary" onClick={() => window.focusApi.startPomodoro()}>
            开始
          </button>
        ) : (
          <>
            <button className="btn" onClick={() => window.focusApi.skipPomodoroPhase()}>
              跳过本阶段
            </button>
            <button className="btn ghost" onClick={() => window.focusApi.stopPomodoro()}>
              停止
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function formatTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${pad(m)}:${pad(s)}`
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}
