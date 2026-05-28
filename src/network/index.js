// ═══════════════════════════════════════════
// StarCraft Web - 网络模块统一导出
// ═══════════════════════════════════════════

export { WebSocketClient, ConnectionState, getEnvironment } from './WebSocketClient.js';
export { LobbySystem, LOBBY_MSG, PLAYER_STATUS } from './LobbySystem.js';
export { SyncManager, SYNC_MSG, SYNC_CONFIG, SnapshotCompressor } from './SyncManager.js';
