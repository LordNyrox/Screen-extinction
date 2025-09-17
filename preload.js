const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getScreens: () => ipcRenderer.invoke('get-screens'),
  runCommand: (command) => ipcRenderer.invoke('run-command', command),
  saveProfiles: (profiles) => ipcRenderer.invoke('save-profiles', profiles),
  loadProfiles: () => ipcRenderer.invoke('load-profiles'),
});
