import { create } from 'zustand'
import type { AppSnapshot } from '../../shared/types'

interface UIState {
  snapshot: AppSnapshot | null
  notices: { id: number; kind: string; message: string }[]
  setSnapshot: (s: AppSnapshot) => void
  pushNotice: (n: { kind: string; message: string }) => void
  dismissNotice: (id: number) => void
}

let noticeId = 0

export const useUI = create<UIState>((set) => ({
  snapshot: null,
  notices: [],
  setSnapshot: (s) => set({ snapshot: s }),
  pushNotice: (n) =>
    set((st) => {
      const id = ++noticeId
      const next = [...st.notices, { id, ...n }].slice(-3)
      // 自动 5 秒后消失
      setTimeout(() => {
        useUI.setState((cur) => ({ notices: cur.notices.filter((x) => x.id !== id) }))
      }, 5000)
      return { notices: next }
    }),
  dismissNotice: (id) => set((st) => ({ notices: st.notices.filter((n) => n.id !== id) }))
}))
