const electron = require("electron");

const { app, BrowserWindow } = electron;

process.on("uncaughtException", (error) => {
  console.error("Table Pet uncaught exception:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("Table Pet unhandled rejection:", error);
});

if (app) {
  console.log(`Table Pet debug app isReady=${app.isReady()}`);
  app.whenReady().then(() => {
    console.log(`Table Pet debug app ready. windows=${BrowserWindow.getAllWindows().length}`);
    setTimeout(() => {
      console.log(`Table Pet debug after 2s. windows=${BrowserWindow.getAllWindows().length}`);
      for (const [index, win] of BrowserWindow.getAllWindows().entries()) {
        console.log(`Table Pet debug window ${index}: visible=${win.isVisible()} destroyed=${win.isDestroyed()} bounds=${JSON.stringify(win.getBounds())}`);
      }
    }, 2000);
  });
}

if (electron && BrowserWindow && !BrowserWindow.__tablePetDebugPatched) {
  const OriginalBrowserWindow = BrowserWindow;

  function DebugBrowserWindow(options = {}) {
    console.log("Table Pet debug BrowserWindow constructor called.");
    console.log(`Table Pet debug original options=${JSON.stringify({
      width: options.width,
      height: options.height,
      x: options.x,
      y: options.y,
      frame: options.frame,
      transparent: options.transparent,
      skipTaskbar: options.skipTaskbar,
      alwaysOnTop: options.alwaysOnTop
    })}`);

    const debugOptions = {
      ...options,
      width: Math.max(Number(options.width) || 0, 900),
      height: Math.max(Number(options.height) || 0, 700),
      x: 80,
      y: 80,
      frame: true,
      transparent: false,
      hasShadow: true,
      skipTaskbar: false,
      alwaysOnTop: true,
      show: true,
      backgroundColor: "#ffffff"
    };

    const win = new OriginalBrowserWindow(debugOptions);
    const showWindow = () => {
      if (win.isDestroyed()) return;
      win.setBounds({ x: 80, y: 80, width: debugOptions.width, height: debugOptions.height });
      win.setSkipTaskbar(false);
      win.setAlwaysOnTop(true, "screen-saver");
      win.show();
      win.focus();
      console.log(`Table Pet debug forced show. visible=${win.isVisible()} bounds=${JSON.stringify(win.getBounds())}`);
    };

    win.on("closed", () => console.log("Table Pet debug window closed."));
    win.webContents.on("did-fail-load", (_event, code, description, url) => {
      console.error(`Table Pet debug did-fail-load code=${code} description=${description} url=${url}`);
    });
    win.webContents.on("did-finish-load", () => {
      console.log(`Table Pet debug did-finish-load url=${win.webContents.getURL()}`);
    });
    win.webContents.on("dom-ready", () => {
      console.log("Table Pet debug dom-ready.");
    });
    win.webContents.on("console-message", (_event, level, message, line, sourceId) => {
      console.log(`Table Pet renderer console level=${level} ${sourceId}:${line} ${message}`);
    });
    win.webContents.on("render-process-gone", (_event, details) => {
      console.error(`Table Pet debug render-process-gone ${JSON.stringify(details)}`);
    });

    win.once("ready-to-show", showWindow);
    win.webContents.once("did-finish-load", showWindow);
    setTimeout(showWindow, 1000);
    setTimeout(showWindow, 3000);
    return win;
  }

  Object.setPrototypeOf(DebugBrowserWindow, OriginalBrowserWindow);
  DebugBrowserWindow.prototype = OriginalBrowserWindow.prototype;
  DebugBrowserWindow.__tablePetDebugPatched = true;
  electron.BrowserWindow = DebugBrowserWindow;
  console.log("Table Pet debug BrowserWindow patch enabled.");
}
