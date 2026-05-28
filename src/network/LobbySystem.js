// ═══════════════════════════════════════════
// StarCraft Web - 游戏大厅系统
// 创建/加入/退出房间，玩家列表，游戏设置
// ═══════════════════════════════════════════

import { eventBus } from '../shared/EventBus.js';

// ── 大厅消息类型 ──
/** @enum {string} */
const LOBBY_MSG = {
  // 房间操作
  CREATE_ROOM: 'lobby:create_room',
  JOIN_ROOM: 'lobby:join_room',
  LEAVE_ROOM: 'lobby:leave_room',
  ROOM_CREATED: 'lobby:room_created',
  ROOM_JOINED: 'lobby:room_joined',
  ROOM_LEFT: 'lobby:room_left',
  ROOM_LIST: 'lobby:room_list',
  ROOM_LIST_RESPONSE: 'lobby:room_list_response',

  // 玩家操作
  SET_READY: 'lobby:set_ready',
  PLAYER_READY: 'lobby:player_ready',
  PLAYER_JOINED: 'lobby:player_joined',
  PLAYER_LEFT: 'lobby:player_left',

  // 游戏设置
  UPDATE_SETTINGS: 'lobby:update_settings',
  SETTINGS_UPDATED: 'lobby:settings_updated',

  // 游戏启动
  START_GAME: 'lobby:start_game',
  GAME_STARTING: 'lobby:game_starting',

  // 错误
  ERROR: 'lobby:error',
};

// ── 玩家状态 ──
/** @enum {string} */
const PLAYER_STATUS = {
  WAITING: 'waiting',
  READY: 'ready',
  IN_GAME: 'in_game',
};

/**
 * @typedef {Object} PlayerInfo
 * @property {string} id - 玩家 ID
 * @property {string} name - 玩家名称
 * @property {string} race - 选择的种族
 * @property {number} color - 颜色
 * @property {string} status - 玩家状态
 * @property {boolean} isHost - 是否为房主
 */

/**
 * @typedef {Object} RoomSettings
 * @property {string} mapId - 地图 ID
 * @property {number} maxPlayers - 最大玩家数
 * @property {string} gameMode - 游戏模式
 * @property {boolean} allowObservers - 允许观察者
 * @property {string} difficulty - AI 难度
 */

/**
 * @typedef {Object} Room
 * @property {string} id - 房间 ID
 * @property {string} name - 房间名称
 * @property {string} hostId - 房主 ID
 * @property {PlayerInfo[]} players - 玩家列表
 * @property {RoomSettings} settings - 游戏设置
 * @property {string} state - 房间状态 ('waiting', 'starting', 'in_game')
 * @property {number} createdAt - 创建时间戳
 */

// ═══════════════════════════════════════════
// 游戏大厅系统
// ═══════════════════════════════════════════

/**
 * 游戏大厅系统 - 管理多人联机房间
 *
 * @example
 * const lobby = new LobbySystem(wsClient);
 * lobby.on('room_list', (rooms) => displayRoomList(rooms));
 * const roomId = lobby.createRoom({ name: 'My Room', mapId: 'lost_temple' });
 * lobby.joinRoom(roomId);
 * lobby.setReady(true);
 */
export class LobbySystem {
  /**
   * @param {object} wsClient - WebSocketClient 实例
   * @param {object} [options] - 配置选项
   * @param {string} [options.playerName='Player'] - 玩家名称
   * @param {string} [options.playerId] - 玩家 ID（自动生成如未提供）
   */
  constructor(wsClient, options = {}) {
    /** @type {object} WebSocket 客户端引用 */
    this.wsClient = wsClient;

    /** @type {string} 玩家 ID */
    this.playerId = options.playerId || this._generateId();

    /** @type {string} 玩家名称 */
    this.playerName = options.playerName || `Player_${this.playerId.slice(0, 4)}`;

    // ── 当前房间信息 ──
    /** @type {Room|null} 当前所在的房间 */
    this.currentRoom = null;

    // ── 事件回调 ──
    /** @type {Map<string, Set<Function>>} 事件回调 */
    this.listeners = new Map();

    // ── 房间列表缓存 ──
    /** @type {Room[]} 房间列表 */
    this.roomList = [];

    // ── 玩家默认设置 ──
    /** @type {string} 默认种族 */
    this.defaultRace = options.race || 'terran';
    /** @type {number} 默认颜色 */
    this.defaultColor = options.color || 0x0000ff;

    // ── 请求追踪 ──
    /** @type {Map<string, Function>} 待处理的请求回调 */
    this.pendingRequests = new Map();

    // 注册 WebSocket 消息监听
    this._setupListeners();
  }

  // ═══════════════════════════════════════════
  // 房间操作
  // ═══════════════════════════════════════════

  /**
   * 创建新房间
   * @param {object} settings - 房间设置
   * @param {string} [settings.name] - 房间名称
   * @param {string} [settings.mapId='lost_temple'] - 地图 ID
   * @param {number} [settings.maxPlayers=8] - 最大玩家数
   * @param {string} [settings.gameMode='1v1'] - 游戏模式
   * @param {string} [settings.race] - 种族
   * @param {number} [settings.color] - 颜色
   * @returns {Promise<Room>} 创建的房间
   */
  createRoom(settings = {}) {
    return new Promise((resolve, reject) => {
      if (this.currentRoom) {
        reject(new Error('Already in a room. Leave first.'));
        return;
      }

      const roomSettings = {
        mapId: settings.mapId || 'lost_temple',
        maxPlayers: settings.maxPlayers || 8,
        gameMode: settings.gameMode || '1v1',
        allowObservers: settings.allowObservers || false,
        difficulty: settings.difficulty || 'normal',
      };

      const race = settings.race || this.defaultRace;
      const color = settings.color || this.defaultColor;

      this.wsClient.send(LOBBY_MSG.CREATE_ROOM, {
        playerId: this.playerId,
        playerName: this.playerName,
        settings: roomSettings,
        race,
        color,
      });

      // 等待服务器响应
      const timeout = setTimeout(() => {
        reject(new Error('Create room timeout'));
      }, 10000);

      const unsub = this.wsClient.on(LOBBY_MSG.ROOM_CREATED, (data) => {
        clearTimeout(timeout);
        unsub();
        if (data.error) {
          reject(new Error(data.error));
          return;
        }
        this.currentRoom = data.room;
        this._emit('room_created', data.room);
        resolve(data.room);
      });
    });
  }

  /**
   * 加入已有房间
   * @param {string} roomId - 房间 ID
   * @param {object} [options] - 加入选项
   * @param {string} [options.race] - 种族
   * @param {number} [options.color] - 颜色
   * @returns {Promise<Room>} 加入的房间
   */
  joinRoom(roomId, options = {}) {
    return new Promise((resolve, reject) => {
      if (this.currentRoom) {
        reject(new Error('Already in a room. Leave first.'));
        return;
      }

      const race = options.race || this.defaultRace;
      const color = options.color || this.defaultColor;

      this.wsClient.send(LOBBY_MSG.JOIN_ROOM, {
        playerId: this.playerId,
        playerName: this.playerName,
        roomId,
        race,
        color,
      });

      const timeout = setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 10000);

      const unsub = this.wsClient.on(LOBBY_MSG.ROOM_JOINED, (data) => {
        clearTimeout(timeout);
        unsub();
        if (data.error) {
          reject(new Error(data.error));
          return;
        }
        this.currentRoom = data.room;
        this._emit('room_joined', data.room);
        resolve(data.room);
      });
    });
  }

  /**
   * 离开当前房间
   * @returns {Promise<void>}
   */
  leaveRoom() {
    return new Promise((resolve) => {
      if (!this.currentRoom) {
        resolve();
        return;
      }

      const roomId = this.currentRoom.id;

      this.wsClient.send(LOBBY_MSG.LEAVE_ROOM, {
        playerId: this.playerId,
        roomId,
      });

      const unsub = this.wsClient.on(LOBBY_MSG.ROOM_LEFT, (data) => {
        unsub();
        this.currentRoom = null;
        this._emit('room_left', data);
        resolve();
      });

      // 本地立即清除
      setTimeout(() => {
        this.currentRoom = null;
        resolve();
      }, 3000);
    });
  }

  /**
   * 获取房间列表
   * @returns {Promise<Room[]>} 房间列表
   */
  getRoomList() {
    return new Promise((resolve) => {
      this.wsClient.send(LOBBY_MSG.ROOM_LIST, {
        playerId: this.playerId,
      });

      const timeout = setTimeout(() => {
        resolve(this.roomList);
      }, 5000);

      const unsub = this.wsClient.on(LOBBY_MSG.ROOM_LIST_RESPONSE, (data) => {
        clearTimeout(timeout);
        unsub();
        this.roomList = data.rooms || [];
        this._emit('room_list', this.roomList);
        resolve(this.roomList);
      });
    });
  }

  // ═══════════════════════════════════════════
  // 玩家操作
  // ═══════════════════════════════════════════

  /**
   * 设置准备状态
   * @param {boolean} ready - 是否准备就绪
   */
  setReady(ready) {
    if (!this.currentRoom) {
      console.warn('[LobbySystem] Not in a room');
      return;
    }

    this.wsClient.send(LOBBY_MSG.SET_READY, {
      playerId: this.playerId,
      roomId: this.currentRoom.id,
      ready,
    });

    // 本地更新
    const me = this._findPlayer(this.currentRoom.players, this.playerId);
    if (me) {
      me.status = ready ? PLAYER_STATUS.READY : PLAYER_STATUS.WAITING;
    }

    this._emit('ready_changed', { playerId: this.playerId, ready });
  }

  /**
   * 更新游戏设置（仅房主可操作）
   * @param {Partial<RoomSettings>} settings - 要更新的设置
   */
  updateSettings(settings) {
    if (!this.currentRoom) {
      console.warn('[LobbySystem] Not in a room');
      return;
    }

    const isHost = this.currentRoom.hostId === this.playerId;
    if (!isHost) {
      console.warn('[LobbySystem] Only host can update settings');
      return;
    }

    this.wsClient.send(LOBBY_MSG.UPDATE_SETTINGS, {
      playerId: this.playerId,
      roomId: this.currentRoom.id,
      settings,
    });

    // 本地更新
    Object.assign(this.currentRoom.settings, settings);
    this._emit('settings_updated', this.currentRoom.settings);
  }

  /**
   * 更新玩家种族
   * @param {string} race - 新种族
   */
  setRace(race) {
    if (!this.currentRoom) return;

    this.wsClient.send(LOBBY_MSG.UPDATE_SETTINGS, {
      playerId: this.playerId,
      roomId: this.currentRoom.id,
      settings: { race },
    });

    const me = this._findPlayer(this.currentRoom.players, this.playerId);
    if (me) {
      me.race = race;
    }
  }

  /**
   * 请求开始游戏（仅房主可操作）
   * 仅当所有玩家都已准备时可开始
   */
  startGame() {
    if (!this.currentRoom) {
      console.warn('[LobbySystem] Not in a room');
      return;
    }

    const isHost = this.currentRoom.hostId === this.playerId;
    if (!isHost) {
      console.warn('[LobbySystem] Only host can start game');
      return;
    }

    // 检查所有玩家是否已准备
    const allReady = this.currentRoom.players.every(
      p => p.status === PLAYER_STATUS.READY || p.isHost
    );

    if (!allReady) {
      this._emit('error', { message: 'Not all players are ready' });
      return;
    }

    this.wsClient.send(LOBBY_MSG.START_GAME, {
      playerId: this.playerId,
      roomId: this.currentRoom.id,
    });
  }

  // ═══════════════════════════════════════════
  // 事件系统
  // ═══════════════════════════════════════════

  /**
   * 注册事件监听器
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * 触发本地事件
   * @private
   * @param {string} event - 事件名
   * @param {*} data - 事件数据
   */
  _emit(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[LobbySystem] Error in listener for "${event}":`, err);
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  // WebSocket 消息处理
  // ═══════════════════════════════════════════

  /**
   * 设置 WebSocket 消息监听
   * @private
   */
  _setupListeners() {
    // 房间列表更新
    this.wsClient.on(LOBBY_MSG.ROOM_LIST_RESPONSE, (data) => {
      this.roomList = data.rooms || [];
      this._emit('room_list', this.roomList);
    });

    // 玩家加入房间
    this.wsClient.on(LOBBY_MSG.PLAYER_JOINED, (data) => {
      if (this.currentRoom && data.roomId === this.currentRoom.id) {
        if (data.player) {
          this.currentRoom.players.push(data.player);
        }
        if (data.room) {
          this.currentRoom = data.room;
        }
        this._emit('player_joined', data);
      }
    });

    // 玩家离开房间
    this.wsClient.on(LOBBY_MSG.PLAYER_LEFT, (data) => {
      if (this.currentRoom && data.roomId === this.currentRoom.id) {
        if (data.playerId && this.currentRoom.players) {
          this.currentRoom.players = this.currentRoom.players.filter(
            p => p.id !== data.playerId
          );
        }
        this._emit('player_left', data);
      }
    });

    // 玩家准备状态变化
    this.wsClient.on(LOBBY_MSG.PLAYER_READY, (data) => {
      if (this.currentRoom && data.roomId === this.currentRoom.id) {
        const player = this._findPlayer(this.currentRoom.players, data.playerId);
        if (player) {
          player.status = data.ready ? PLAYER_STATUS.READY : PLAYER_STATUS.WAITING;
        }
        this._emit('player_ready', data);
      }
    });

    // 设置更新
    this.wsClient.on(LOBBY_MSG.SETTINGS_UPDATED, (data) => {
      if (this.currentRoom && data.roomId === this.currentRoom.id) {
        Object.assign(this.currentRoom.settings, data.settings);
        this._emit('settings_updated', data.settings);
      }
    });

    // 游戏开始
    this.wsClient.on(LOBBY_MSG.GAME_STARTING, (data) => {
      if (this.currentRoom) {
        this.currentRoom.state = 'starting';
      }
      this._emit('game_starting', data);
    });

    // 错误
    this.wsClient.on(LOBBY_MSG.ERROR, (data) => {
      this._emit('error', data);
    });
  }

  // ═══════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════

  /**
   * 在玩家列表中查找指定玩家
   * @private
   * @param {PlayerInfo[]} players
   * @param {string} playerId
   * @returns {PlayerInfo|null}
   */
  _findPlayer(players, playerId) {
    if (!players) return null;
    return players.find(p => p.id === playerId) || null;
  }

  /**
   * 生成唯一 ID
   * @private
   * @returns {string}
   */
  _generateId() {
    return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * 获取当前房间信息
   * @returns {Room|null}
   */
  getRoom() {
    return this.currentRoom;
  }

  /**
   * 获取当前玩家信息
   * @returns {PlayerInfo|null}
   */
  getPlayer() {
    if (!this.currentRoom) return null;
    return this._findPlayer(this.currentRoom.players, this.playerId);
  }

  /**
   * 是否为当前房间的房主
   * @returns {boolean}
   */
  isHost() {
    if (!this.currentRoom) return false;
    return this.currentRoom.hostId === this.playerId;
  }

  /**
   * 所有玩家是否都已准备
   * @returns {boolean}
   */
  allReady() {
    if (!this.currentRoom) return false;
    return this.currentRoom.players.every(
      p => p.status === PLAYER_STATUS.READY || p.isHost
    );
  }

  /**
   * 销毁大厅系统
   */
  destroy() {
    if (this.currentRoom) {
      this.leaveRoom();
    }
    this.listeners.clear();
    this.roomList = [];
  }
}

export { LOBBY_MSG, PLAYER_STATUS };
export default LobbySystem;
