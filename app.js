const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
require("v8-compile-cache");

var mainWindow = null;
var additionalWindows = [];

app.on("window-all-closed", function() {
  if (process.platform != "darwin") {
    app.quit();
  }
});

app.on("ready", () => {
  var screen = require("electron").screen;
  var primaryDisplay = screen.getPrimaryDisplay();
  var allDisplays = screen.getAllDisplays();
  var additionalDisplays = allDisplays.filter(display => {
    return display.id !== primaryDisplay.id;
  });

  if (process.argv.length > 1) {
    // Handle Windows screen saver flags
    var params = process.argv[1];
    if (params === "/p" || params === "/S" || params.match(/^\/c/)) {
      app.quit();
      return;
    }
  }

  mainWindow = new BrowserWindow({
    x: primaryDisplay.bounds.x,
    y: primaryDisplay.bounds.y,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true
    }
  });
  mainWindow.loadURL(path.join(__dirname, "src/index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  if (additionalDisplays.length > 0) {
    // For each non-primary display, spawn a BrowserWindow
    additionalDisplays.forEach(display => {
      additionalWindows.push(
        new BrowserWindow({
          x: display.bounds.x,
          y: display.bounds.y,
          show: false,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: true
          }
        })
      );
    });

    // Load blank page for non-primary displays
    additionalWindows.forEach(win => {
      win.loadURL(path.join(__dirname, "src/blank.html"));
    });
  }

  setTimeout(() => {
    mainWindow.setKiosk(true);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.show();

    additionalWindows.forEach(win => {
      win.setKiosk(true);
      win.setAlwaysOnTop(true);
      win.show();
    });
  }, 2000);
});

ipcMain.on("sendQuit", function() {
  app.quit();
});
