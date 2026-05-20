// Preload：通过 contextBridge 暴露安全的 API 给渲染进程

import { contextBridge, ipcRenderer } from 'electron'
import type { AppCategory, AppSnapshot, FocusAPI, PetState, Settings } from '../shared/types'

const api: FocusAPI = {
  getSnapshot: () => ipcRenderer.invoke('app:getSnapshot') as Promise<AppSnapshot>,
  startSession: () => ipcRenderer.invoke('app:startSession') as Promise<void>,
  stopSession: () => ipcRenderer.invoke('app:stopSession') as Promise<void>,
  startPomodoro: () => ipcRenderer.invoke('app:startPomodoro') as Promise<void>,
  stopPomodoro: () => ipcRenderer.invoke('app:stopPomodoro') as Promise<void>,
  skipPomodoroPhase: () => ipcRenderer.invoke('app:skipPomodoroPhase') as Promise<void>,
  updateSettings: (patch: Partial<Settings>) =>
    ipcRenderer.invoke('app:updateSettings', patch) as Promise<Settings>,
  classifyApp: (name: string, category: AppCategory) =>
    ipcRenderer.invoke('app:classifyApp', name, category) as Promise<Settings>,
  feedPet: () => ipcRenderer.invoke('app:feedPet') as Promise<PetState>,
  resetToday: () => ipcRenderer.invoke('app:resetToday') as Promise<void>,
  showMain: () => ipcRenderer.invoke('app:showMain') as Promise<void>,
  toggleWidget: () => ipcRenderer.invoke('app:toggleWidget') as Promise<void>,
  widgetSetMouseIgnore: (ignore: boolean) =>
    ipcRenderer.invoke('widget:setMouseIgnore', ignore) as Promise<void>,
  widgetResize: (w: number, h: number) =>
    ipcRenderer.invoke('widget:resize', w, h) as Promise<void>,
  widgetBlur: () => ipcRenderer.invoke('widget:blur') as Promise<void>,
  widgetMoveBy: (dx: number, dy: number) =>
    ipcRenderer.invoke('widget:moveBy', dx, dy) as Promise<void>,
  widgetDragEnd: () => ipcRenderer.invoke('widget:dragEnd') as Promise<void>,
  widgetUndock: () => ipcRenderer.invoke('widget:undock') as Promise<void>,
  onDocked(cb) {
    const handler = (_e: unknown, docked: boolean) => cb(docked)
    ipcRenderer.on('widget:docked', handler)
    return () => ipcRenderer.removeListener('widget:docked', handler)
  },
  onSnapshot(cb) {
    const handler = (_e: unknown, s: AppSnapshot) => cb(s)
    ipcRenderer.on('snapshot', handler)
    return () => ipcRenderer.removeListener('snapshot', handler)
  },
  onNotice(cb) {
    const handler = (_e: unknown, n: { kind: string; message: string }) => cb(n)
    ipcRenderer.on('notice', handler)
    return () => ipcRenderer.removeListener('notice', handler)
  }
}

contextBridge.exposeInMainWorld('focusApi', api)
