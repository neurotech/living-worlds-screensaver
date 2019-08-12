const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

var mainWindow = null;

app.on("window-all-closed", function() {
  if (process.platform != "darwin") {
    app.quit();
  }
});

app.on("ready", () => {
  var screen = require("electron").screen;
  var primaryDisplay = screen.getPrimaryDisplay();
  var displays = screen.getAllDisplays();
  console.log(displays);

  if (process.argv.length > 1) {
    // Handle Windows screen saver flags
    var params = process.argv[1];
    if (params === "/p" || params === "/S" || params.match(/^\/c/)) {
      app.quit();
      return;
    }
  }

  mainWindow = new BrowserWindow({
    show: false,
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: true }
  });
  mainWindow.loadURL(path.join(__dirname, "src/index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  setTimeout(() => {
    mainWindow.setKiosk(true);
    mainWindow.setAlwaysOnTop(true);
    mainWindow.show();
  }, 2000);
});

ipcMain.on("sendQuit", function() {
  app.quit();
});
