// ═══════════════════════════════════════════
// StarCraft Web - Electron Preload脚本
// 安全地向渲染进程暴露Node.js API
// ═══════════════════════════════════════════

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // 应用信息
  platform: process.platform,
  isElectron: true,

  // 窗口控制
  toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  setWindowSize: (w, h) => ipcRenderer.invoke('set-window-size', w, h),

  // 文件操作
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),

  // 菜单事件监听
  onMenuAction: (callback) => {
    const channels = [
      'menu:new-game', 'menu:continue', 'menu:load', 'menu:save',
      'menu:pause', 'menu:settings', 'menu:graphics', 'menu:hotkeys',
      'menu:tutorial', 'menu:about', 'app:before-quit',
    ];
    for (const ch of channels) {
      ipcRenderer.on(ch, (event, data) => callback(ch, data));
    }
  },

  // 原生对话框
  showMessageBox: (options) => ipcRenderer.invoke('message-box', options),
});
