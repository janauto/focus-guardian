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
  // 窗口宽度始终固定，展开/收起只改高度，避免公仔左右跳动
  const WIDGET_W = 188
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
  // 悬浮窗鼠标穿透控制
  ipcMain.handle('widget:setMouseIgnore', (_e, ignore: boolean) => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.setIgnoreMouseEvents(ignore, { forward: true })
    }
  })
  // 悬浮窗尺寸调整（展开/收起时），保持公仔右上角位置不变
  // 悬浮窗尺寸调整：只改高度，宽度和 x 坐标不动，公仔不跳
  ipcMain.handle('widget:resize', (_e, _w: number, h: number) => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      const bounds = widgetWindow.getBounds()
      widgetWindow.setBounds({ x: bounds.x, y: bounds.y, width: bounds.width, height: h }, true)
    }
  })
  // 悬浮窗失焦自动折叠：只缩高度
  ipcMain.handle('widget:blur', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      const bounds = widgetWindow.getBounds()
      const COMPACT_H = 88
      if (bounds.height > COMPACT_H) {
        widgetWindow.setBounds(
          { x: bounds.x, y: bounds.y, width: bounds.width, height: COMPACT_H },
          true
        )
      }
    }
  })
  // JS 手动拖拽：渲染层发送 delta，主进程移动窗口
  ipcMain.handle('widget:moveBy', (_e, dx: number, dy: number) => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      const [x, y] = widgetWindow.getPosition()
      widgetWindow.setPosition(x + dx, y + dy, false)
    }
  })
  // 拖拽结束：触发吸附检测 + 边缘停靠检测
  ipcMain.handle('widget:dragEnd', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      const bounds = widgetWindow.getBounds()
      const display = screen.getDisplayMatching(bounds)
      const work = display.workArea
      const DOCK_THRESHOLD = 20
      // 检测是否贴右边缘 → 进入 docked 模式
      const distToRight = work.x + work.width - (bounds.x + bounds.width)
      if (distToRight < DOCK_THRESHOLD) {
        // 停靠到右边缘
        const DOCK_W = 12
        const DOCK_H = 120
        const dockX = work.x + work.width - DOCK_W
        const dockY = bounds.y
        widgetWindow.setBounds({ x: dockX, y: dockY, width: DOCK_W, height: DOCK_H }, true)
        widgetWindow.webContents.send('widget:docked', true)
        return
      }
      // 否则正常吸附
      snapToEdge(widgetWindow)
    }
  })
  // 从停靠模式恢复
  ipcMain.handle('widget:undock', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      const bounds = widgetWindow.getBounds()
      const display = screen.getDisplayMatching(bounds)
      const work = display.workArea
      const WIDGET_W = 188
      const COMPACT_H = 88
      const newX = work.x + work.width - WIDGET_W - 8
      widgetWindow.setBounds({ x: newX, y: bounds.y, width: WIDGET_W, height: COMPACT_H }, true)
      widgetWindow.webContents.send('widget:docked', false)
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
