// ═══════════════════════════════════════════
// StarCraft Web - Electron主进程
// 打包为Win/Mac/Linux桌面应用
// ═══════════════════════════════════════════

import { app, BrowserWindow, Menu, globalShortcut, ipcMain, screen, protocol } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const isDev = !app.isPackaged;
let mainWindow = null;

/**
 * 创建主窗口
 */
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: Math.min(1920, width),
    height: Math.min(1080, height),
    minWidth: 1280,
    minHeight: 720,
    title: 'StarCraft Web - 3D星际争霸',
    icon: join(__dirname, 'public', 'icon.png'),
    backgroundColor: '#000000',
    show: false, // 等ready-to-show再显示，避免白屏闪烁
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: join(__dirname, 'electron', 'preload.mjs'),
    },
  });

  // 加载应用
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(join(__dirname, 'dist', 'index.html'));
  }

  // 准备好再显示
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 窗口关闭处理
  mainWindow.on('close', (e) => {
    // 可以在这里弹出"确认退出"对话框
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * 应用菜单（可选，提供原生体验）
 */
function createMenu() {
  const template = [
    {
      label: '游戏',
      submenu: [
        { label: '新游戏', accelerator: 'CmdOrCtrl+N', click: () => sendToRenderer('menu:new-game') },
        { label: '继续游戏', accelerator: 'CmdOrCtrl+C', click: () => sendToRenderer('menu:continue') },
        { label: '加载存档', accelerator: 'CmdOrCtrl+O', click: () => sendToRenderer('menu:load') },
        { label: '保存存档', accelerator: 'CmdOrCtrl+S', click: () => sendToRenderer('menu:save') },
        { type: 'separator' },
        { label: '暂停', accelerator: 'Escape', click: () => sendToRenderer('menu:pause') },
        { type: 'separator' },
        { role: 'quit', label: '退出' },
      ],
    },
    {
      label: '设置',
      submenu: [
        { label: '音量设置', click: () => sendToRenderer('menu:settings') },
        { label: '画质设置', click: () => sendToRenderer('menu:graphics') },
        { label: '快捷键设置', click: () => sendToRenderer('menu:hotkeys') },
      ],
    },
    {
      label: '帮助',
      submenu: [
        { label: '操作指南', click: () => sendToRenderer('menu:tutorial') },
        { label: '关于', click: () => sendToRenderer('menu:about') },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/**
 * 向渲染进程发送消息
 */
function sendToRenderer(channel, data) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(channel, data);
  }
}

// ═══════ IPC通信 ═══════

// 渲染进程请求：全屏切换
ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});

// 渲染进程请求：窗口大小
ipcMain.handle('set-window-size', (event, w, h) => {
  if (mainWindow) {
    mainWindow.setSize(w, h);
  }
});

// 渲染进程请求：保存文件对话框
ipcMain.handle('save-file-dialog', async (event, options) => {
  const { dialog } = await import('electron');
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options.title || '保存文件',
    defaultPath: options.defaultPath || 'save.json',
    filters: options.filters || [{ name: 'JSON', extensions: ['json'] }],
  });
  return result;
});

// 渲染进程请求：打开文件对话框
ipcMain.handle('open-file-dialog', async (event, options) => {
  const { dialog } = await import('electron');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options.title || '打开文件',
    filters: options.filters || [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  return result;
});

// ═══════ 应用生命周期 ═══════

app.whenReady().then(() => {
  createWindow();
  createMenu();

  // macOS: 点击dock图标重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用退出前清理
app.on('before-quit', () => {
  sendToRenderer('app:before-quit');
});

console.log(`[StarCraft Web] Electron v${app.getVersion()} | Dev: ${isDev}`);
