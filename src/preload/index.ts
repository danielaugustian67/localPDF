import { contextBridge, ipcRenderer } from 'electron'

export interface ElectronAPI {
  openFileDialog: (options?: { multi?: boolean }) => Promise<{ canceled: boolean; filePaths: string[] }>
  saveFileDialog: (defaultName: string) => Promise<{ canceled: boolean; filePath?: string }>
  readFile: (filePath: string) => Promise<{ success: boolean; data?: Uint8Array; error?: string }>
  writeFile: (filePath: string, data: Uint8Array) => Promise<{ success: boolean; error?: string }>
  getPlatform: () => Promise<string>
}

const api: ElectronAPI = {
  openFileDialog: (options) => ipcRenderer.invoke('dialog:openFiles', options),
  saveFileDialog: (defaultName) => ipcRenderer.invoke('dialog:saveFile', defaultName),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, data) => ipcRenderer.invoke('fs:writeFile', filePath, data),
  getPlatform: () => ipcRenderer.invoke('app:getPlatform')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = api
}
