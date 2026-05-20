// Electron 主进程入口

import { app, BrowserWindow, ipcMain, screen, shell } from 'electron'
import { join } from 'node:path'
import { Controller } from './controller'
import type { AppCategory, Settings } from '../shared/types'

let controller: Controller | null = null
let mainWindow: BrowserWindow | null = null
let widgetWindow: BrowserWindow | null = null

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

function createWidgetWindow(): BrowserWindow {
  const { width: screenW } = screen.getPrimaryDisplay().workAreaSize
  const WIDGET_W = 88 // compact 模式宽度（公仔 72 + padding）
  const WIDGET_H = 88
  const win = new BrowserWindow({
    width: WIDGET_W,
    height: WIDGET_H,
    x: screenW - WIDGET_W - 12,
    y: 80,
    frame: false,
    transparent: true,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: true,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false
    }
  })

  // 确保完全透明（macOS 需要多重保障）
  win.setBackgroundColor('#00000000')
  // 默认穿透鼠标事件，渲染层会通过 IPC 动态切换
  win.setIgnoreMouseEvents(true, { forward: true })
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  win.setAlwaysOnTop(true, 'floating')

  win.on('ready-to-show', () => win.showInactive())

  // ---- 边缘吸附 + 防溢出 ----
  let snapTimer: NodeJS.Timeout | null = null
  win.on('moved', () => {
    if (snapTimer) clearTimeout(snapTimer)
    snapTimer = setTimeout(() => snapToEdge(win), 300)
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    win.loadURL(`${devUrl}#widget`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'widget' })
  }

  return win
}

/** 边缘吸附：如果窗口距屏幕边缘 < 40px，自动贴边（8px 间距） */
function snapToEdge(win: BrowserWindow): void {
  if (win.isDestroyed()) return
  const bounds = win.getBounds()
  const display = screen.getDisplayMatching(bounds)
  const work = display.workArea
  const SNAP_THRESHOLD = 40
  const EDGE_GAP = 8

  let { x, y } = bounds

  // 左边缘
  if (x - work.x < SNAP_THRESHOLD) x = work.x + EDGE_GAP
  // 右边缘
  if (work.x + work.width - (x + bounds.width) < SNAP_THRESHOLD)
    x = work.x + work.width - bounds.width - EDGE_GAP
  // 上边缘
  if (y - work.y < SNAP_THRESHOLD) y = work.y + EDGE_GAP
  // 下边缘
  if (work.y + work.height - (y + bounds.height) < SNAP_THRESHOLD)
    y = work.y + work.height - bounds.height - EDGE_GAP

  // 防溢出：clamp 到屏幕内
  x = Math.max(work.x, Math.min(x, work.x + work.width - bounds.width))
  y = Math.max(work.y, Math.min(y, work.y + work.height - bounds.height))

  if (x !== bounds.x || y !== bounds.y) {
    // 平滑移动（分 5 步缓动）
    animateMove(win, bounds.x, bounds.y, x, y)
  }
}

function animateMove(win: BrowserWindow, fromX: number, fromY: number, toX: number, toY: number): void {
  const STEPS = 6
  const INTERVAL = 16 // ~60fps
  let step = 0
  const timer = setInterval(() => {
    if (win.isDestroyed()) { clearInterval(timer); return }
    step++
    const t = step / STEPS
    // ease-out cubic
    const ease = 1 - Math.pow(1 - t, 3)
    const cx = Math.round(fromX + (toX - fromX) * ease)
    const cy = Math.round(fromY + (toY - fromY) * ease)
    win.setPosition(cx, cy, false)
    if (step >= STEPS) clearInterval(timer)
  }, INTERVAL)
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
  ipcMain.handle('app:showMain', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  ipcMain.handle('app:toggleWidget', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      if (widgetWindow.isVisible()) widgetWindow.hide()
      else widgetWindow.show()
    }
  })
  // 悬浮窗鼠标穿透控制：渲染层检测到鼠标在交互区域时关闭穿透
  ipcMain.handle('widget:setMouseIgnore', (_e, ignore: boolean) => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.setIgnoreMouseEvents(ignore, { forward: true })
    }
  })
  // 悬浮窗尺寸调整（展开/收起时），保持公仔位置不变
  ipcMain.handle('widget:resize', (_e, w: number, h: number) => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      const bounds = widgetWindow.getBounds()
      // 展开时从右侧扩展（公仔在右上角不动）
      const dx = w - bounds.width
      const newX = bounds.x - dx
      widgetWindow.setBounds({ x: newX, y: bounds.y, width: w, height: h }, true)
    }
  })
  // 悬浮窗失焦自动折叠
  ipcMain.handle('widget:blur', () => {
    // 渲染层通知主进程折叠
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      const bounds = widgetWindow.getBounds()
      const COMPACT_W = 88
      const COMPACT_H = 88
      if (bounds.width > COMPACT_W) {
        const dx = bounds.width - COMPACT_W
        widgetWindow.setBounds(
          { x: bounds.x + dx, y: bounds.y, width: COMPACT_W, height: COMPACT_H },
          true
        )
      }
    }
  })
}

app.whenReady().then(() => {
  controller = new Controller()
  registerIpc(controller)

  mainWindow = createWindow()
  widgetWindow = createWidgetWindow()
  controller.attachWindow(mainWindow)
  controller.attachWidget(widgetWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      widgetWindow = createWidgetWindow()
      controller!.attachWindow(mainWindow)
      controller!.attachWidget(widgetWindow)
    }
  })
})

app.on('window-all-closed', () => {
  controller?.stopSession()
  if (process.platform !== 'darwin') app.quit()
})
