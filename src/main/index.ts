import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import fs from 'fs/promises'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    minWidth: 950,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    title: 'LocalPDF',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    if (is.dev) {
      mainWindow.webContents.openDevTools({ mode: 'detach' })
    }
  })

  // Tangkap seluruh console log dari renderer ke stdout terminal
  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer log ${level}] ${message} (${sourceId}:${line})`)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// Setup IPC handlers
function setupIpcHandlers(): void {
  // Native Open Dialog
  ipcMain.handle('dialog:openFiles', async (_event, options?: { multi?: boolean }) => {
    const properties: ('openFile' | 'multiSelections')[] = ['openFile']
    if (options?.multi !== false) {
      properties.push('multiSelections')
    }

    const result = await dialog.showOpenDialog({
      title: 'Pilih Dokumen PDF',
      filters: [{ name: 'Dokumen PDF', extensions: ['pdf'] }],
      properties
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, filePaths: [] }
    }

    return { canceled: false, filePaths: result.filePaths }
  })

  // Native Save Dialog
  ipcMain.handle('dialog:saveFile', async (_event, defaultName: string) => {
    const result = await dialog.showSaveDialog({
      title: 'Simpan Dokumen PDF',
      defaultPath: defaultName || 'dokumen-gabungan.pdf',
      filters: [{ name: 'Dokumen PDF', extensions: ['pdf'] }]
    })

    if (result.canceled || !result.filePath) {
      return { canceled: true, filePath: undefined }
    }

    return { canceled: false, filePath: result.filePath }
  })

  // File I/O: Read File as Buffer (Uint8Array)
  ipcMain.handle('fs:readFile', async (_event, filePath: string) => {
    try {
      const buffer = await fs.readFile(filePath)
      const uint8 = new Uint8Array(buffer.length)
      uint8.set(buffer)
      return { success: true, data: uint8 }
    } catch (err: any) {
      console.error('Error reading file:', err)
      return { success: false, error: err.message }
    }
  })

  // File I/O: Write File
  ipcMain.handle('fs:writeFile', async (_event, filePath: string, data: Uint8Array) => {
    try {
      await fs.writeFile(filePath, Buffer.from(data))
      return { success: true }
    } catch (err: any) {
      console.error('Error writing file:', err)
      return { success: false, error: err.message }
    }
  })

  // Platform info
  ipcMain.handle('app:getPlatform', () => {
    return process.platform
  })
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.localpdf.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  setupIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
