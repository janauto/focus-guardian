import { useCallback, useEffect, useRef, useState } from 'react'
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

// 窗口尺寸常量
const COMPACT_W = 88
const COMPACT_H = 88
const EXPANDED_W = 200
const EXPANDED_H = 320

export default function Widget(): JSX.Element {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null)
  const [expanded, setExpanded] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const ignoreRef = useRef(true) // 当前是否穿透

  useEffect(() => {
    window.focusApi.getSnapshot().then(setSnapshot)
    const off = window.focusApi.onSnapshot(setSnapshot)
    return off
  }, [])

  // ---- 鼠标穿透逻辑 ----
  // 默认穿透，鼠标进入交互区域时关闭穿透，离开时恢复
  const setIgnore = useCallback((ignore: boolean) => {
    if (ignore !== ignoreRef.current) {
      ignoreRef.current = ignore
      window.focusApi.widgetSetMouseIgnore(ignore)
    }
  }, [])

  useEffect(() => {
    // 监听 document 级别的 mouseenter/mouseleave
    // forward:true 会让 Electron 把 mousemove 转发给渲染层
    const onEnter = () => setIgnore(false)
    const onLeave = () => {
      if (!expanded) setIgnore(true)
    }
    const root = rootRef.current
    if (root) {
      root.addEventListener('mouseenter', onEnter)
      root.addEventListener('mouseleave', onLeave)
    }
    return () => {
      if (root) {
        root.removeEventListener('mouseenter', onEnter)
        root.removeEventListener('mouseleave', onLeave)
      }
    }
  }, [setIgnore, expanded])

  // 展开/收起时调整窗口大小
  const toggleExpand = useCallback(() => {
    const next = !expanded
    setExpanded(next)
    if (next) {
      window.focusApi.widgetResize(EXPANDED_W, EXPANDED_H)
      setIgnore(false)
    } else {
      window.focusApi.widgetResize(COMPACT_W, COMPACT_H)
      // 收起后延迟恢复穿透
      setTimeout(() => setIgnore(true), 100)
    }
  }, [expanded, setIgnore])

  if (!snapshot) {
    return (
      <div className="widget-root loading" ref={rootRef}>
        <div className="widget-pet-body">🛡️</div>
      </div>
    )
  }

  const { state, pet, pomodoro, todayStats, intensity } = snapshot
  const petEmoji = STAGE_EMOJI[pet.stage]
  const stateEmoji = STATE_EMOJI[state]
  const focusMin = Math.floor(todayStats.focusSeconds / 60)
  const pomoRemain = pomodoro.phase !== 'stopped' ? formatTime(pomodoro.remainingSeconds) : null
  const intensityColor = INTENSITY_COLOR[intensity.level]

  return (
    <div
      className={`widget-root state-${state} ${expanded ? 'expanded' : 'compact'}`}
      ref={rootRef}
    >
      {/* 公仔主体 */}
      <div className="widget-pet-container">
        <div className="widget-pet-body" onClick={toggleExpand}>
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

        {/* 拖拽手柄：左下角小图标 */}
        <div className="widget-drag-grip" title="拖动我">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="3" cy="3" r="1.5" fill="rgba(255,255,255,0.5)" />
            <circle cx="7" cy="3" r="1.5" fill="rgba(255,255,255,0.5)" />
            <circle cx="3" cy="7" r="1.5" fill="rgba(255,255,255,0.5)" />
            <circle cx="7" cy="7" r="1.5" fill="rgba(255,255,255,0.5)" />
            <circle cx="3" cy="11" r="1.5" fill="rgba(255,255,255,0.3)" />
            <circle cx="7" cy="11" r="1.5" fill="rgba(255,255,255,0.3)" />
          </svg>
        </div>
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
            <button className="wp-btn" onClick={() => window.focusApi.showMain()} title="打开主窗口">
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
