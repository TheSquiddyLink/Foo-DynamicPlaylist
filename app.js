import { app, BrowserWindow, ipcMain, dialog } from 'electron/main'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'url';
import { CHANNELS } from './website/script/electron.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false
    }
  })

  win.loadFile('website/index.html')
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on(CHANNELS.promptFileInput.send, async (event, arg) => {
    console.log("Prompting file input");
    const result = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [
            { name: 'Playlist', extensions: ['m3u'] },
        ],
    });
    event.reply(CHANNELS.promptFileInput.reply, result.filePaths[0]);
})