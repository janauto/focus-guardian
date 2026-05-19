import type { PetState } from '../../../shared/types'

interface Props {
  tab: 'home' | 'settings'
  onTabChange: (t: 'home' | 'settings') => void
  pet: PetState
}

export function TopBar({ tab, onTabChange, pet }: Props): JSX.Element {
  return (
    <header className="topbar">
      <div className="topbar-title">
        <span className="logo">🛡️</span>
        <span>Focus Guardian</span>
        <span className="version">v0.1 MVP</span>
      </div>
      <nav className="topbar-tabs">
        <button className={tab === 'home' ? 'tab active' : 'tab'} onClick={() => onTabChange('home')}>
          主页
        </button>
        <button className={tab === 'settings' ? 'tab active' : 'tab'} onClick={() => onTabChange('settings')}>
          设置
        </button>
      </nav>
      <div className="topbar-info">
        <span>🔥 连续 {pet.streakDays} 天</span>
        <span>💰 {pet.coins}</span>
      </div>
    </header>
  )
}
