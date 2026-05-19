import { useState } from 'react'
import type { Settings } from '../../../shared/types'

interface Props {
  settings: Settings
}

export function SettingsPanel({ settings }: Props): JSX.Element {
  const [workInput, setWorkInput] = useState('')
  const [distInput, setDistInput] = useState('')

  const update = (patch: Partial<Settings>) => window.focusApi.updateSettings(patch)

  const addKw = (kind: 'work' | 'distract', kw: string) => {
    if (!kw.trim()) return
    if (kind === 'work') {
      update({ workApps: [...settings.workApps, kw.trim()] })
      setWorkInput('')
    } else {
      update({ distractApps: [...settings.distractApps, kw.trim()] })
      setDistInput('')
    }
  }

  const removeKw = (kind: 'work' | 'distract', kw: string) => {
    if (kind === 'work') update({ workApps: settings.workApps.filter((x) => x !== kw) })
    else update({ distractApps: settings.distractApps.filter((x) => x !== kw) })
  }

  return (
    <div className="settings">
      <div className="card">
        <h3>🍅 番茄钟参数</h3>
        <div className="form-row">
          <label>工作时长（分钟）</label>
          <input
            type="number"
            min={5}
            max={120}
            value={settings.pomodoro.workMinutes}
            onChange={(e) =>
              update({
                pomodoro: { ...settings.pomodoro, workMinutes: Number(e.target.value) || 25 }
              })
            }
          />
        </div>
        <div className="form-row">
          <label>短休息（分钟）</label>
          <input
            type="number"
            min={1}
            max={30}
            value={settings.pomodoro.shortBreakMinutes}
            onChange={(e) =>
              update({
                pomodoro: { ...settings.pomodoro, shortBreakMinutes: Number(e.target.value) || 5 }
              })
            }
          />
        </div>
        <div className="form-row">
          <label>长休息（分钟）</label>
          <input
            type="number"
            min={5}
            max={60}
            value={settings.pomodoro.longBreakMinutes}
            onChange={(e) =>
              update({
                pomodoro: { ...settings.pomodoro, longBreakMinutes: Number(e.target.value) || 15 }
              })
            }
          />
        </div>
        <div className="form-row">
          <label>每 N 个番茄长休息</label>
          <input
            type="number"
            min={2}
            max={8}
            value={settings.pomodoro.pomodorosUntilLongBreak}
            onChange={(e) =>
              update({
                pomodoro: { ...settings.pomodoro, pomodorosUntilLongBreak: Number(e.target.value) || 4 }
              })
            }
          />
        </div>
      </div>

      <div className="card">
        <h3>🎯 专注偏好</h3>
        <div className="form-row">
          <label>每日目标（分钟）</label>
          <input
            type="number"
            min={30}
            max={600}
            value={settings.dailyGoalMinutes}
            onChange={(e) => update({ dailyGoalMinutes: Number(e.target.value) || 120 })}
          />
        </div>
        <div className="form-row">
          <label>分心宽容期（秒）</label>
          <input
            type="number"
            min={0}
            max={300}
            value={settings.distractGraceSeconds}
            onChange={(e) => update({ distractGraceSeconds: Number(e.target.value) || 10 })}
          />
        </div>
        <div className="form-row">
          <label>提醒强度</label>
          <select
            value={settings.reminderLevel}
            onChange={(e) => update({ reminderLevel: e.target.value as Settings['reminderLevel'] })}
          >
            <option value="gentle">温和（4 分钟一次）</option>
            <option value="standard">标准（2 分钟一次）</option>
            <option value="strict">严格（1 分钟一次）</option>
          </select>
        </div>
      </div>

      <div className="card">
        <h3>✓ 工作应用白名单</h3>
        <div className="kw-list">
          {settings.workApps.map((kw) => (
            <span className="kw-chip work" key={kw}>
              {kw}
              <button onClick={() => removeKw('work', kw)}>×</button>
            </span>
          ))}
        </div>
        <div className="form-row">
          <input
            placeholder="添加关键字（应用名包含即匹配）"
            value={workInput}
            onChange={(e) => setWorkInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKw('work', workInput)}
          />
          <button className="btn" onClick={() => addKw('work', workInput)}>
            添加
          </button>
        </div>
      </div>

      <div className="card">
        <h3>✗ 分心应用黑名单</h3>
        <div className="kw-list">
          {settings.distractApps.map((kw) => (
            <span className="kw-chip distract" key={kw}>
              {kw}
              <button onClick={() => removeKw('distract', kw)}>×</button>
            </span>
          ))}
        </div>
        <div className="form-row">
          <input
            placeholder="添加分心关键字（如 微信、B站、Twitter）"
            value={distInput}
            onChange={(e) => setDistInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKw('distract', distInput)}
          />
          <button className="btn danger" onClick={() => addKw('distract', distInput)}>
            添加
          </button>
        </div>
      </div>

      <div className="card hint-card">
        <h3>🔒 隐私说明</h3>
        <p>所有数据本地存储，不上传任何窗口内容。MVP 阶段不启用摄像头监控（Phase 2 规划中）。</p>
      </div>
    </div>
  )
}
