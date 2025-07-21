import path from "node:path";
import {
  app,
  BrowserWindow,
  type BrowserWindowConstructorOptions,
  ipcMain,
  screen,
} from "electron";

process.env.DIST = path.join(__dirname, "../dist");
process.env.PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, "../public");

let win: BrowserWindow | null;
const additionalWindows: BrowserWindow[] = [];
const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;
const devMode = VITE_DEV_SERVER_URL;

const createWindow = () => {
  if (!process.env.PUBLIC) throw new Error("PUBLIC env var is undefined!");

  if (process.argv.length > 1) {
    // Handle Windows screen saver flags
    const params = process.argv[1];
    if (params === "/p" || params === "/S" || params.match(/^\/c/)) {
      app.quit();
      return;
    }
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const allDisplays = screen.getAllDisplays();
  const additionalDisplays = allDisplays.filter((display) => {
    return display.id !== primaryDisplay.id;
  });

  const browserWindowOptions: BrowserWindowConstructorOptions = {
    backgroundColor: "#181a20",
    width: 1280,
    height: 840,
    autoHideMenuBar: !devMode,
    darkTheme: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
    },
  };

  win = new BrowserWindow(browserWindowOptions);

  if (additionalDisplays.length > 0) {
    // For each non-primary display, spawn a BrowserWindow
    additionalDisplays.forEach((display) => {
      additionalWindows.push(
        new BrowserWindow({
          ...browserWindowOptions,
          x: display.bounds.x,
          y: display.bounds.y,
        }),
      );
    });

    // Load another instance of Living Worlds for non-primary displays
    additionalWindows.forEach((additional) => {
      if (VITE_DEV_SERVER_URL) {
        additional.loadURL(VITE_DEV_SERVER_URL);
      } else {
        if (!process.env.DIST) throw new Error("DIST env var is undefined!");
        additional.loadFile(path.join(process.env.DIST, "index.html"));
      }
    });
  }

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    if (!process.env.DIST) throw new Error("DIST env var is undefined!");
    win.loadFile(path.join(process.env.DIST, "index.html"));
  }
};

const register = () => {
  ipcMain.on("sendQuit", async () => {
    app.quit();
  });

  if (devMode) {
    win?.maximize();
  } else {
    win?.setKiosk(true);
  }

  win?.setAlwaysOnTop(true);
  win?.show();

  additionalWindows.forEach((additional) => {
    if (devMode) {
      additional?.maximize();
    } else {
      additional?.setKiosk(true);
    }

    additional.setAlwaysOnTop(true);
    additional.show();
  });
};

app.on("window-all-closed", () => {
  win = null;
  app.quit();
});

app
  .on("ready", createWindow)
  .whenReady()
  .then(register)
  .catch((e) => console.error(e));
