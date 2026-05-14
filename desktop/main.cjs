const { app, BrowserWindow, shell, dialog } = require('electron')

const APP_URL = process.env.DESKTOP_APP_URL || 'https://leftover-manager-2026-qgq8lw6fv-stas-projects2.vercel.app'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: 'Учет остатков материалов',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  mainWindow.loadURL(APP_URL)

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-fail-load', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'error',
      title: 'Нет подключения',
      message: 'Не удалось открыть облачное приложение.',
      detail: 'Проверьте интернет и доступность ссылки Vercel.',
    })
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
