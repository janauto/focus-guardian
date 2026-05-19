// Electron 主进程入口

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { Controller } from './controller'
import type { AppCategory, Settings } from '../shared/types'

let controller: Controller | null = null
let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 980,
    height: 720,
    minWidth: 880,
    minHeight: 640,
    title: 'Focus Guardian',
    backgroundColor: '#0f172a',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // electron-vite 提供的 dev server URL；构建后回退到本地 html
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    win.loadURL(devUrl)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function registerIpc(c: Controller): void {
  ipcMain.handle('app:getSnapshot', () => c.getSnapshot())
  ipcMain.handle('app:startSession', () => c.startSession())
  ipcMain.handle('app:stopSession', () => c.stopSession())
  ipcMain.handle('app:startPomodoro', () => c.startPomodoro())
  ipcMain.handle('app:stopPomodoro', () => c.stopPomodoro())
  ipcMain.handle('app:skipPomodoroPhase', () => c.skipPomodoroPhase())
  ipcMain.handle('app:updateSettings', (_e, patch: Partial<Settings>) => c.updateSettings(patch))
  ipcMain.handle('app:classifyApp', (_e, name: string, cat: AppCategory) => c.classifyAppManually(name, cat))
  ipcMain.handle('app:feedPet', () => c.feedPet())
  ipcMain.handle('app:resetToday', () => c.resetToday())
}

app.whenReady().then(() => {
  controller = new Controller()
  registerIpc(controller)

  mainWindow = createWindow()
  controller.attachWindow(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      controller!.attachWindow(mainWindow)
    }
  })
})

app.on('window-all-closed', () => {
  controller?.stopSession()
  if (process.platform !== 'darwin') app.quit()
})
