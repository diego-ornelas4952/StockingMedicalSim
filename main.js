const { app, BrowserWindow } = require('electron');
const path = require('path');

// Ejecuta el backend (Express y SQLite)
require('./server.js');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Ocultar mientras carga
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // El backend Node Express corre en localhost:3000
  // Le damos un momento para asegurarse de que el servidor esté activo
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.show();
  }, 1500);

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  // En macOS es habitual que las apps sigan abiertas hasta que el usuario hace Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
