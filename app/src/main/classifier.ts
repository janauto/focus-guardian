// 应用分类器：根据黑/白名单关键字判断当前窗口是工作 / 分心 / 中性

import type { AppCategory, Settings } from '../shared/types'

export function classifyApp(appName: string, title: string, settings: Settings): AppCategory {
  const haystack = `${appName} ${title}`.toLowerCase()
  const matches = (kw: string) => kw.trim().length > 0 && haystack.includes(kw.toLowerCase())

  // 黑名单优先级高于白名单（一旦命中分心关键字，立即视作分心）
  if (settings.distractApps.some(matches)) return 'distract'
  if (settings.workApps.some(matches)) return 'work'
  return 'neutral'
}

export function todayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}
