import type { DailyStats, Settings } from '../../../shared/types'

interface Props {
  stats: DailyStats
  settings: Settings
}

export function TodayPanel({ stats, settings }: Props): JSX.Element {
  const focusMin = Math.floor(stats.focusSeconds / 60)
  const distractMin = Math.floor(stats.distractSeconds / 60)
  const inactiveMin = Math.floor((stats.inactiveSeconds ?? 0) / 60)
  const awayMin = Math.floor((stats.awaySeconds ?? 0) / 60)
  const goalMin = settings.dailyGoalMinutes
  const goalPct = Math.min(100, Math.round((focusMin / Math.max(1, goalMin)) * 100))

  const topApps = Object.entries(stats.appUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const totalSec = Object.values(stats.appUsage).reduce((a, b) => a + b, 0)

  return (
    <div className="today">
      <div className="today-head">
        <h3>📊 今日统计</h3>
        <button
          className="btn ghost small"
          onClick={() => {
            if (confirm('确认清除今日统计？')) window.focusApi.resetToday()
          }}
        >
          清除
        </button>
      </div>

      <div className="today-grid">
        <div className="metric">
          <div className="metric-num good">{focusMin}m</div>
          <div className="metric-label">真专注</div>
        </div>
        <div className="metric">
          <div className="metric-num warn">{distractMin}m</div>
          <div className="metric-label">分心</div>
        </div>
        <div className="metric">
          <div className="metric-num neutral">{inactiveMin}m</div>
          <div className="metric-label">发呆</div>
        </div>
        <div className="metric">
          <div className="metric-num neutral">{awayMin}m</div>
          <div className="metric-label">离开</div>
        </div>
      </div>

      <div className="today-sub">
        分心 {stats.distractCount} 次 · 完成 {stats.pomodorosCompleted} 个番茄钟
      </div>

      <div className="today-goal">
        <div className="goal-head">
          <span>每日目标 {goalMin}m</span>
          <span>{goalPct}%</span>
        </div>
        <div className="goal-bar">
          <div className="goal-fill" style={{ width: `${goalPct}%` }} />
        </div>
      </div>

      <div className="today-apps">
        <div className="apps-head">应用使用 Top 5</div>
        {topApps.length === 0 ? (
          <div className="hint">还未记录到应用使用数据</div>
        ) : (
          <ul>
            {topApps.map(([app, sec]) => {
              const pct = totalSec > 0 ? Math.round((sec / totalSec) * 100) : 0
              return (
                <li key={app}>
                  <span className="app">{app}</span>
                  <span className="bar">
                    <span className="bar-fill" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="dur">{Math.floor(sec / 60)}m</span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
