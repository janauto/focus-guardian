import type { ActiveWindowInfo, FocusState, Settings } from '../../../shared/types'

interface Props {
  active: ActiveWindowInfo | null
  state: FocusState
  settings: Settings
}

const CATEGORY_LABEL = {
  work: { text: '工作应用', color: '#10b981' },
  distract: { text: '分心应用', color: '#ef4444' },
  neutral: { text: '中性应用', color: '#94a3b8' }
}

export function CurrentApp({ active, state, settings }: Props): JSX.Element {
  if (!active) {
    return (
      <div className="current-app empty">
        <h3>📍 当前应用</h3>
        <p className="hint">点击「开始专注」启动监控，每秒采样一次活动窗口。</p>
      </div>
    )
  }
  const meta = CATEGORY_LABEL[active.category]
  const isInWork = settings.workApps.some((k) => active.app.toLowerCase().includes(k.toLowerCase()))
  const isInDist = settings.distractApps.some((k) => active.app.toLowerCase().includes(k.toLowerCase()))

  return (
    <div className={`current-app cat-${active.category} state-${state}`}>
      <h3>📍 当前应用</h3>
      <div className="app-row">
        <div className="app-name">
          {active.app}
          <span className="cat-pill" style={{ background: meta.color }}>
            {meta.text}
          </span>
        </div>
        <div className="app-title" title={active.title}>
          {active.title || '—'}
        </div>
      </div>
      {!isInWork && !isInDist && (
        <div className="quick-actions">
          <span>加入名单：</span>
          <button className="btn small" onClick={() => window.focusApi.classifyApp(active.app, 'work')}>
            ✓ 工作
          </button>
          <button className="btn small danger" onClick={() => window.focusApi.classifyApp(active.app, 'distract')}>
            ✗ 分心
          </button>
        </div>
      )}
      {isInWork && (
        <div className="quick-actions">
          已加入工作白名单
          <button className="btn small ghost" onClick={() => window.focusApi.classifyApp(active.app, 'neutral')}>
            移除
          </button>
        </div>
      )}
      {isInDist && (
        <div className="quick-actions">
          已加入分心黑名单
          <button className="btn small ghost" onClick={() => window.focusApi.classifyApp(active.app, 'neutral')}>
            移除
          </button>
        </div>
      )}
    </div>
  )
}
