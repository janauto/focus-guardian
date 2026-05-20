import type { IntensitySnapshot } from '../../../shared/types'

interface Props {
  intensity: IntensitySnapshot
}

const LEVEL_TEXT: Record<IntensitySnapshot['level'], string> = {
  high: '活跃',
  medium: '普通',
  low: '低',
  idle: '发呆',
  away: '离开'
}

const LEVEL_COLOR: Record<IntensitySnapshot['level'], string> = {
  high: '#10b981',
  medium: '#6366f1',
  low: '#f59e0b',
  idle: '#f97316',
  away: '#ef4444'
}

/** 交互强度仪表：60 秒滑窗内的活跃秒占比 + idle 时间 */
export function IntensityMeter({ intensity }: Props): JSX.Element {
  const color = LEVEL_COLOR[intensity.level]
  const text = LEVEL_TEXT[intensity.level]
  const idle = intensity.idleSeconds
  const idleText =
    idle < 60 ? `${idle}s` : `${Math.floor(idle / 60)}m ${idle % 60}s`

  return (
    <div className="intensity-meter">
      <div className="im-header">
        <span className="im-title">活跃度</span>
        <span className="im-pill" style={{ background: color }}>
          {text}
        </span>
      </div>
      <div className="im-bar">
        <div
          className="im-fill"
          style={{ width: `${intensity.score}%`, background: color }}
        />
      </div>
      <div className="im-meta">
        <span>{intensity.score}/100 · 60s 内活跃秒占比</span>
        <span title="距上次键鼠操作">空闲 {idleText}</span>
      </div>
    </div>
  )
}
