/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  screen,
  Tray,
  Menu,
  globalShortcut,
  nativeImage,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import { checkAccessibilityPermissions } from 'node-selection';
import watchSelection from './watchSelection';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import ipc from './libs/ipc';

let mouseDownPos = { x: 0, y: 0 }; // 记录鼠标按下的坐标
let isMouseDown = false;
let tray: any = null;

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;
let popWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});
ipc();

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  // require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const RESOURCES_PATH = app.isPackaged
  ? path.join(process.cwd(), '/resources/assets') // ? path.join(process.resourcesPath, 'assets')
  : path.join(process.cwd(), '/assets'); //path.join(__dirname, '../../assets');

const getAssetPath = (...paths: string[]): string => {
  return path.join(RESOURCES_PATH, ...paths);
};

const createPopWindow = async () => {
  if (!(await checkAccessibilityPermissions({ prompt: true }))) {
    console.log('grant accessibility permissions and restart this program');
  }

  if (!popWindow) {
    let xw = screen.getPrimaryDisplay().workAreaSize.width;

    popWindow = new BrowserWindow({
      width: xw * 0.35,
      height: 200,
      y: 5,
      icon: getAssetPath('icon.png'),
      show: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      frame: false,
      movable: true,

      webPreferences: {
        preload: app.isPackaged
          ? path.join(__dirname, 'preload.js')
          : path.join(__dirname, '../../.erb/dll/preload.js'),
      },
    });

    global.popWindowId = popWindow.id;
    popWindow.setPosition(xw * 0.325, 10);
  }

  if (isDebug) {
    // popWindow.webContents.openDevTools();
    popWindow.loadURL(resolveHtmlPath('index.html', { hash: '/pop' }));
  } else {
    popWindow.loadFile(resolveHtmlPath('index.html', null), { hash: '/pop' });
  }
  popWindow.show();

  // popWindow.webContents.on('did-finish-load', () => {
  //   console.log('did-finish-load');
  // });

  // popWindow.on('closed', () => {
  //   popWindow = null;
  // });
};

const createWindow = async () => {
  if (isDebug) {
    // await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    frame: false,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  global.mainWindowId = mainWindow.id;

  if (isDebug) {
    mainWindow.webContents.openDevTools();
    mainWindow.loadURL(resolveHtmlPath('index.html', null));
  } else {
    mainWindow.loadFile(resolveHtmlPath('index.html', null));
  }

  if (!tray) {
    let icon = nativeImage.createFromDataURL(
      'data:image/png;base64,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'
    );
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '打开搜索栏',
        type: 'normal',
        click: () => {
          let popWin = BrowserWindow.fromId(global.popWindowId);
          if (popWin) {
            popWin.show();
          }
        },
      },
      {
        label: '退出',
        type: 'normal',
        click: () => {
          if (app) {
            app.quit();
            process.exit(0);
          }
        },
      },
    ]);

    tray.setContextMenu(contextMenu);

    tray.setToolTip('Earth');

    tray.on('click', () => {
      let xWindow = BrowserWindow.fromId(global.mainWindowId);
      if (xWindow) {
        xWindow.isVisible() ? xWindow.hide() : xWindow.show();
      }
    });
  }

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }

    createPopWindow();
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('did-finish-load');
    watchSelection(mainWindow);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  // new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('before-quit', () => {});

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    globalShortcut.register('Ctrl+Shift+M', () => {
      let xWindow = BrowserWindow.fromId(global.mainWindowId);
      if (xWindow) {
        xWindow.isVisible() ? xWindow.hide() : xWindow.show();
      }
    });

    globalShortcut.register('Ctrl+Shift+F', () => {
      let popWin = BrowserWindow.fromId(global.popWindowId);
      if (popWin) {
        popWin.isVisible() ? popWin.hide() : popWin.show();
      }
    });
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
