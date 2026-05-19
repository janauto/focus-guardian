import type { FocusState, PetState } from '../../../shared/types'
import { computeLevel, nextStageHours, titleForLevel } from '../../../shared/leveling'

interface Props {
  state: FocusState
  pet: PetState
  stateDurationSeconds: number
}

const STAGE_LABEL: Record<PetState['stage'], string> = {
  egg: '蛋期',
  baby: '幼体期',
  teen: '成长期',
  adult: '成熟期'
}

const MOOD_LABEL: Record<PetState['mood'], string> = {
  sleepy: '睡梦中',
  happy: '开心',
  worried: '担忧',
  sick: '不太舒服',
  expecting: '期待中'
}

/** 公仔本体：根据成长阶段 + 当前状态用 emoji + CSS 表达 */
function PetSprite(props: { stage: PetState['stage']; state: FocusState; mood: PetState['mood'] }): JSX.Element {
  const { stage, state, mood } = props
  // 简化版：用 emoji 表达，后续可换成 Lottie/SVG
  const base =
    stage === 'egg' ? '🥚' : stage === 'baby' ? '🐣' : stage === 'teen' ? '🐥' : '🐤'
  const overlay =
    state === 'distracted'
      ? '😟'
      : state === 'focused'
        ? '✨'
        : state === 'break'
          ? '😌'
          : mood === 'sick'
            ? '🤒'
            : mood === 'happy'
              ? '😊'
              : '💤'

  return (
    <div className={`pet-sprite state-${state} mood-${mood}`}>
      <div className="pet-base">{base}</div>
      <div className="pet-overlay">{overlay}</div>
      <div className="pet-shadow" />
    </div>
  )
}

export function Pet({ state, pet, stateDurationSeconds }: Props): JSX.Element {
  const { level, xpInLevel, xpForLevel } = computeLevel(pet.xp)
  const title = titleForLevel(level)
  const xpPct = Math.min(100, Math.round((xpInLevel / xpForLevel) * 100))

  const nextStage = nextStageHours(pet.stage)
  const focusHours = pet.totalFocusSeconds / 3600

  const stateText =
    state === 'focused'
      ? `专注中 · ${formatDuration(stateDurationSeconds)}`
      : state === 'distracted'
        ? `分心警告 · ${formatDuration(stateDurationSeconds)}`
        : state === 'break'
          ? '正在休息'
          : '尚未开始'

  return (
    <div className="pet">
      <PetSprite stage={pet.stage} state={state} mood={pet.mood} />

      <div className="pet-meta">
        <div className="pet-title">
          <span className="pet-stage">{STAGE_LABEL[pet.stage]}</span>
          <span className="pet-mood">{MOOD_LABEL[pet.mood]}</span>
        </div>
        <div className="pet-state">{stateText}</div>
        <div className="level-row">
          <span className="level-badge">Lv.{level}</span>
          <span className="level-title">{title}</span>
        </div>
        <div className="xp-bar" aria-label="经验进度">
          <div className="xp-fill" style={{ width: `${xpPct}%` }} />
          <span className="xp-text">
            {xpInLevel} / {xpForLevel} XP
          </span>
        </div>
        {nextStage !== null && (
          <div className="stage-hint">
            距离下一阶段还需 {Math.max(0, nextStage - focusHours).toFixed(1)} 小时专注
          </div>
        )}
      </div>
    </div>
  )
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}
