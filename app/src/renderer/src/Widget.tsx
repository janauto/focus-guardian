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

const COMPACT_W = 88
const COMPACT_H = 88
const EXPANDED_W = 200
const EXPANDED_H = 320

export default function Widget(): JSX.Element {
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [docked, setDocked] = useState(false)
  const [gripVisible, setGripVisible] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const ignoreRef = useRef(true)
  const draggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    window.focusApi.getSnapshot().then(setSnapshot)
    const offSnap = window.focusApi.onSnapshot(setSnapshot)
    const offDock = window.focusApi.onDocked(setDocked)
    return () => { offSnap(); offDock() }
  }, [])

  // ---- 鼠标穿透逻辑 ----
  const setIgnore = useCallback((ignore: boolean) => {
    if (ignore !== ignoreRef.current) {
      ignoreRef.current = ignore
      window.focusApi.widgetSetMouseIgnore(ignore)
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const onEnter = () => setIgnore(false)
    const onLeave = () => {
      if (!expanded && !draggingRef.current) setIgnore(true)
    }
    root.addEventListener('mouseenter', onEnter)
    root.addEventListener('mouseleave', onLeave)
    return () => {
      root.removeEventListener('mouseenter', onEnter)
      root.removeEventListener('mouseleave', onLeave)
    }
  }, [setIgnore, expanded])

  // ---- 窗口失焦自动折叠 ----
  useEffect(() => {
    const onBlur = () => {
      if (expanded) {
        setExpanded(false)
        window.focusApi.widgetBlur()
        setTimeout(() => setIgnore(true), 150)
      }
    }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [expanded, setIgnore])

  // ---- JS 手动拖拽（替代 -webkit-app-region: drag） ----
  const onDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    draggingRef.current = true
    dragStartRef.current = { x: e.screenX, y: e.screenY }
    setIgnore(false)

    const onMove = (ev: MouseEvent) => {
      const dx = ev.screenX - dragStartRef.current.x
      const dy = ev.screenY - dragStartRef.current.y
      dragStartRef.current = { x: ev.screenX, y: ev.screenY }
      window.focusApi.widgetMoveBy(dx, dy)
    }
    const onUp = () => {
      draggingRef.current = false
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      window.focusApi.widgetDragEnd()
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [setIgnore])

  // 展开/收起
  const toggleExpand = useCallback(() => {
    if (docked) {
      // 从停靠模式恢复
      window.focusApi.widgetUndock()
      return
    }
    const next = !expanded
    setExpanded(next)
    if (next) {
      window.focusApi.widgetResize(EXPANDED_W, EXPANDED_H)
      setIgnore(false)
    } else {
      window.focusApi.widgetResize(COMPACT_W, COMPACT_H)
      setTimeout(() => setIgnore(true), 150)
    }
  }, [expanded, docked, setIgnore])

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

  // 番茄钟进度百分比
  const pomoPct = pomodoro.totalSeconds > 0
    ? Math.round(((pomodoro.totalSeconds - pomodoro.remainingSeconds) / pomodoro.totalSeconds) * 100)
    : 0

  // ========== 停靠模式：只显示一条竖向进度条 ==========
  if (docked) {
    return (
      <div
        className="widget-root docked"
        ref={rootRef}
        onClick={toggleExpand}
      >
        <div className="dock-bar">
          <div className="dock-fill" style={{ height: `${pomoPct}%`, background: intensityColor }} />
        </div>
        <div className="dock-time">{pomoRemain || `${focusMin}m`}</div>
      </div>
    )
  }

  // ========== 正常模式 ==========
  return (
    <div
      className={`widget-root state-${state} ${expanded ? 'expanded' : 'compact'}`}
      ref={rootRef}
    >
      {/* 公仔主体 */}
      <div
        className="widget-pet-container"
        onMouseEnter={() => setGripVisible(true)}
        onMouseLeave={() => { if (!draggingRef.current) setGripVisible(false) }}
      >
        <div className="widget-pet-body" onClick={toggleExpand}>
          <span className="pet-char">{petEmoji}</span>
          <span className="pet-state-badge">{stateEmoji}</span>
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

        {/* 拖拽手柄：JS 拖拽，不用 -webkit-app-region */}
        <div
          className={`widget-drag-grip ${gripVisible ? 'visible' : ''}`}
          onMouseDown={onDragStart}
          title="拖动我"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <circle cx="2.5" cy="2.5" r="1.2" fill="currentColor" />
            <circle cx="6" cy="2.5" r="1.2" fill="currentColor" />
            <circle cx="9.5" cy="2.5" r="1.2" fill="currentColor" />
            <circle cx="2.5" cy="6" r="1.2" fill="currentColor" />
            <circle cx="6" cy="6" r="1.2" fill="currentColor" />
            <circle cx="9.5" cy="6" r="1.2" fill="currentColor" />
            <circle cx="2.5" cy="9.5" r="1.2" fill="currentColor" />
            <circle cx="6" cy="9.5" r="1.2" fill="currentColor" />
            <circle cx="9.5" cy="9.5" r="1.2" fill="currentColor" />
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
