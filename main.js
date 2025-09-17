const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const fs = require('fs');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  const profilesPath = path.join(app.getPath('userData'), 'profiles.json');

  ipcMain.handle('get-screens', () => {
    return screen.getAllDisplays();
  });

  ipcMain.handle('load-profiles', async () => {
    try {
      if (fs.existsSync(profilesPath)) {
        const data = await fs.promises.readFile(profilesPath, 'utf8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error('Failed to load profiles:', error);
      return {};
    }
  });

  ipcMain.handle('save-profiles', async (event, profiles) => {
    try {
      await fs.promises.writeFile(profilesPath, JSON.stringify(profiles, null, 2));
    } catch (error) {
      console.error('Failed to save profiles:', error);
    }
  });

  ipcMain.handle('run-command', async (event, command) => {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });
    });
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
