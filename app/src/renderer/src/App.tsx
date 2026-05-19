import { useEffect, useMemo, useState } from 'react'
import { useUI } from './store'
import { Pet } from './components/Pet'
import { TopBar } from './components/TopBar'
import { TodayPanel } from './components/TodayPanel'
import { PomodoroCard } from './components/PomodoroCard'
import { CurrentApp } from './components/CurrentApp'
import { Notices } from './components/Notices'
import { SettingsPanel } from './components/SettingsPanel'
import { DistractOverlay } from './components/DistractOverlay'

export default function App(): JSX.Element {
  const snapshot = useUI((s) => s.snapshot)
  const setSnapshot = useUI((s) => s.setSnapshot)
  const pushNotice = useUI((s) => s.pushNotice)
  const [tab, setTab] = useState<'home' | 'settings'>('home')

  useEffect(() => {
    let mounted = true
    window.focusApi.getSnapshot().then((s) => {
      if (mounted) setSnapshot(s)
    })
    const offSnap = window.focusApi.onSnapshot((s) => setSnapshot(s))
    const offNotice = window.focusApi.onNotice((n) => pushNotice(n))
    return () => {
      mounted = false
      offSnap()
      offNotice()
    }
  }, [setSnapshot, pushNotice])

  const isRunning = !!snapshot?.sessionStartedAt

  const handleStart = async () => {
    await window.focusApi.startSession()
  }
  const handleStop = async () => {
    await window.focusApi.stopSession()
  }

  const distractIntensity = useMemo(() => {
    if (!snapshot || snapshot.state !== 'distracted') return 0
    const d = snapshot.stateDurationSeconds
    if (d < 5) return 0.15
    if (d < 15) return 0.35
    if (d < 30) return 0.55
    return 0.8
  }, [snapshot])

  if (!snapshot) {
    return (
      <div className="app-loading">
        <div className="loader" />
        <div>Focus Guardian 正在启动...</div>
      </div>
    )
  }

  return (
    <div className="app-root">
      <DistractOverlay intensity={distractIntensity} />
      <TopBar tab={tab} onTabChange={setTab} pet={snapshot.pet} />

      {tab === 'home' ? (
        <main className="app-main">
          <section className="app-grid">
            <div className="card pet-card">
              <Pet
                state={snapshot.state}
                pet={snapshot.pet}
                stateDurationSeconds={snapshot.stateDurationSeconds}
              />
              <div className="cta-row">
                {!isRunning ? (
                  <button className="btn primary" onClick={handleStart}>
                    🎯 开始专注
                  </button>
                ) : (
                  <button className="btn ghost" onClick={handleStop}>
                    停止
                  </button>
                )}
                <button
                  className="btn"
                  onClick={() => window.focusApi.feedPet()}
                  disabled={snapshot.pet.coins < 10}
                  title="消耗 10 金币让公仔开心"
                >
                  🍗 喂食 (10)
                </button>
              </div>
            </div>

            <div className="card">
              <PomodoroCard pomodoro={snapshot.pomodoro} pomodoroCfg={snapshot.settings.pomodoro} />
            </div>

            <div className="card current-card">
              <CurrentApp active={snapshot.active} state={snapshot.state} settings={snapshot.settings} />
            </div>

            <div className="card today-card">
              <TodayPanel stats={snapshot.todayStats} settings={snapshot.settings} />
            </div>
          </section>
        </main>
      ) : (
        <main className="app-main">
          <SettingsPanel settings={snapshot.settings} />
        </main>
      )}

      <Notices />
    </div>
  )
}
