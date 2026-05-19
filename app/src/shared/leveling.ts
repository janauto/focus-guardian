// 等级与公仔成长曲线（MVP：Lv.1-10，按 PRD 设计）

import type { PetState } from './types'

const LEVEL_TITLES: Array<[number, string]> = [
  [1, '新手学徒'],
  [6, '专注学徒'],
  [11, '自律达人'],
  [21, '专注大师'],
  [31, '意志宗师']
]

/** 升到下一级所需 XP（递增曲线） */
export function xpToNextLevel(level: number): number {
  // Lv.1 -> 100xp，每级 +50xp
  return 100 + (level - 1) * 50
}

export function titleForLevel(level: number): string {
  let title = LEVEL_TITLES[0][1]
  for (const [min, t] of LEVEL_TITLES) {
    if (level >= min) title = t
  }
  return title
}

/** 给定累计 XP 反推等级 */
export function computeLevel(totalXp: number): { level: number; xpInLevel: number; xpForLevel: number } {
  let level = 1
  let remaining = totalXp
  while (remaining >= xpToNextLevel(level)) {
    remaining -= xpToNextLevel(level)
    level += 1
  }
  return { level, xpInLevel: remaining, xpForLevel: xpToNextLevel(level) }
}

/** 公仔成长阶段 */
export function stageForFocusSeconds(seconds: number): PetState['stage'] {
  const hours = seconds / 3600
  if (hours < 1) return 'egg'
  if (hours < 10) return 'baby'
  if (hours < 50) return 'teen'
  return 'adult'
}

export function nextStageHours(stage: PetState['stage']): number | null {
  switch (stage) {
    case 'egg':
      return 1
    case 'baby':
      return 10
    case 'teen':
      return 50
    case 'adult':
      return null
  }
}
