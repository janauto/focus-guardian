import { useEffect, useState } from 'react'
import type { AppSnapshot, FocusState, PetState, IntensitySnapshot } from '../../shared/types'

const STAGE_EMOJI: Record<PetState['stage'], string> = {
  egg: '🥚',
  baby: '🐣',
  teen: '🐥',
  adult: '🐤'
}

const STATE_EMOJI: Record<FocusState, string> = {
  idle: '💤',
  focused: '✨',
  distracted: '😟',
  inactive: '🥱',
  away: '👻',
  break: '😌'
}

const STATE_LABEL: Record<FocusState, string> = {
  idle: '待机',
  focused: '专注中',
  distracted: '分心',
  inactive: '发呆',
  away: '离开',
  break: '休息中'
}

const INTENSITY_COLOR: Record<IntensitySnapshot['level'], string> = {
  high: '#10b981',
  medium: '#6366f1',
  low: '#f59e0b',
  idle: '#f97316',
  away: '#ef4444'
}

export default function Widget(): JSX.Element {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    window.focusApi.getSnapshot().then(setSnapshot)
    const off = window.focusApi.onSnapshot(setSnapshot)
    return off
  }, [])

  if (!snapshot) {
    return (
      <div className="widget-root loading">
        <div className="widget-pet">🛡️</div>
      </div>
    )
  }

  const { state, pet, pomodoro, todayStats, intensity } = snapshot
  const petEmoji = STAGE_EMOJI[pet.stage]
  const stateEmoji = STATE_EMOJI[state]
  const focusMin = Math.floor(todayStats.focusSeconds / 60)
  const pomoRemain = pomodoro.phase !== 'stopped' ? formatTime(pomodoro.remainingSeconds) : null
  const intensityColor = INTENSITY_COLOR[intensity.level]

  const handleClick = () => setExpanded(!expanded)
  const handleOpenMain = () => {
    window.focusApi.showMain()
  }

  return (
    <div className={`widget-root state-${state} ${expanded ? 'expanded' : 'compact'}`}>
      {/* 拖拽区域 */}
      <div className="widget-drag-handle" />

      {/* 公仔主体 */}
      <div className="widget-pet" onClick={handleClick}>
        <span className="pet-char">{petEmoji}</span>
        <span className="pet-state-badge">{stateEmoji}</span>
        {/* 强度环 */}
        <svg className="intensity-ring" viewBox="0 0 100 100">
          <circle
            className="ring-bg"
            cx="50" cy="50" r="44"
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6"
          />
          <circle
            className="ring-fill"
            cx="50" cy="50" r="44"
            fill="none"
            stroke={intensityColor}
            strokeWidth="6"
            strokeDasharray={`${intensity.score * 2.76} 276`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>
      </div>

      {/* 展开面板 */}
      {expanded && (
        <div className="widget-panel">
          <div className="wp-state">
            <span className="wp-label">{STATE_LABEL[state]}</span>
            <span className="wp-duration">{formatDuration(snapshot.stateDurationSeconds)}</span>
          </div>

          {pomoRemain && (
            <div className="wp-pomo">
              <span className="wp-pomo-icon">🍅</span>
              <span className="wp-pomo-time">{pomoRemain}</span>
            </div>
          )}

          <div className="wp-stats">
            <div className="wp-stat">
              <span className="wp-stat-num">{focusMin}m</span>
              <span className="wp-stat-label">专注</span>
            </div>
            <div className="wp-stat">
              <span className="wp-stat-num">Lv.{pet.level}</span>
              <span className="wp-stat-label">{pet.coins}💰</span>
            </div>
          </div>

          <div className="wp-intensity">
            <div className="wp-int-bar">
              <div
                className="wp-int-fill"
                style={{ width: `${intensity.score}%`, background: intensityColor }}
              />
            </div>
            <span className="wp-int-label">活跃 {intensity.score}%</span>
          </div>

          <div className="wp-actions">
            <button className="wp-btn" onClick={handleOpenMain} title="打开主窗口">
              📊
            </button>
            <button
              className="wp-btn"
              onClick={() => window.focusApi.feedPet()}
              disabled={pet.coins < 10}
              title="喂食"
            >
              🍗
            </button>
            {pomodoro.phase === 'stopped' ? (
              <button className="wp-btn" onClick={() => window.focusApi.startPomodoro()} title="开始番茄钟">
                ▶️
              </button>
            ) : (
              <button className="wp-btn" onClick={() => window.focusApi.skipPomodoroPhase()} title="跳过">
                ⏭️
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}m${s > 0 ? ` ${s}s` : ''}`
}
