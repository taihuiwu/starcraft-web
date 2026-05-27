/**
 * RoomManager.js - 房间管理
 * 
 * 负责游戏房间的创建、加入、离开、状态管理
 * 支持最多8人对战
 * 房间状态流转：waiting → playing → finished
 */

import { generateRoomId } from './utils.js';

// ============================================================
// 房间状态枚举
// ============================================================

/** 等待玩家加入 */
export const ROOM_STATE_WAITING = 'waiting';
/** 游戏进行中 */
export const ROOM_STATE_PLAYING = 'playing';
/** 游戏已结束 */
export const ROOM_STATE_FINISHED = 'finished';

// ============================================================
// 默认房间设置
// ============================================================

const DEFAULT_SETTINGS = {
    maxPlayers: 2,           // 最大玩家数（默认2人）
    mapSize: 'medium',       // 地图大小: small/medium/large
    gameSpeed: 'normal',     // 游戏速度: slow/normal/fast
    fogOfWar: true,          // 战争迷雾
    sharedControl: false,    // 共享控制（盟友间）
};

// ============================================================
// 房间类
// ============================================================

class Room {
    /**
     * @param {string} roomId - 房间ID
     * @param {string} hostId - 房主玩家ID
     * @param {object} settings - 房间设置
     */
    constructor(roomId, hostId, settings = {}) {
        /** @type {string} 房间唯一ID */
        this.id = roomId;
        /** @type {string} 房主玩家ID */
        this.hostId = hostId;
        /** @type {string} 房间状态 */
        this.state = ROOM_STATE_WAITING;
        /** @type {object} 房间设置 */
        this.settings = { ...DEFAULT_SETTINGS, ...settings };
        /** @type {Map<string, object>} 玩家列表 key=playerId, value={ id, name, race, ready } */
        this.players = new Map();
        /** @type {number} 房间创建时间 */
        this.createdAt = Date.now();
        /** @type {number|null} 游戏开始时间 */
        this.startedAt = null;
        /** @type {number|null} 游戏结束时间 */
        this.endedAt = null;
        /** @type {string|null} 胜利者ID */
        this.winner = null;
    }

    /**
     * 添加玩家到房间
     * @param {string} playerId - 玩家ID
     * @param {string} name - 玩家名称
     * @param {string} race - 选择的种族
     * @returns {boolean} 是否成功
     */
    addPlayer(playerId, name, race = 'random') {
        // 检查房间是否已满
        if (this.players.size >= this.settings.maxPlayers) {
            return false;
        }
        // 检查是否已在房间中
        if (this.players.has(playerId)) {
            return false;
        }
        // 检查房间状态
        if (this.state !== ROOM_STATE_WAITING) {
            return false;
        }
        this.players.set(playerId, {
            id: playerId,
            name,
            race,
            ready: false,
        });
        return true;
    }

    /**
     * 从房间移除玩家
     * @param {string} playerId - 玩家ID
     * @returns {boolean} 是否成功
     */
    removePlayer(playerId) {
        if (!this.players.has(playerId)) {
            return false;
        }
        this.players.delete(playerId);

        // 如果房主离开，转移房主给第一个还在的玩家
        if (playerId === this.hostId && this.players.size > 0) {
            this.hostId = this.players.keys().next().value;
            console.log(`[Room] 房主转移: ${this.id} → ${this.hostId}`);
        }

        return true;
    }

    /**
     * 设置玩家准备状态
     * @param {string} playerId - 玩家ID
     * @param {boolean} ready - 是否准备
     * @returns {boolean} 是否成功
     */
    setReady(playerId, ready) {
        const player = this.players.get(playerId);
        if (!player) return false;
        player.ready = ready;
        return true;
    }

    /**
     * 检查所有玩家是否都已准备（至少2人）
     * @returns {boolean}
     */
    allReady() {
        if (this.players.size < 2) return false; // 至少需要2人
        for (const player of this.players.values()) {
            if (!player.ready) return false;
        }
        return true;
    }

    /**
     * 获取玩家列表（不含敏感信息）
     * @returns {Array}
     */
    getPlayerList() {
        return Array.from(this.players.values());
    }

    /**
     * 房间公开信息（用于列表展示）
     * @returns {object}
     */
    toPublicInfo() {
        return {
            id: this.id,
            hostId: this.hostId,
            state: this.state,
            playerCount: this.players.size,
            maxPlayers: this.settings.maxPlayers,
            players: this.getPlayerList(),
            settings: this.settings,
            createdAt: this.createdAt,
        };
    }
}

// ============================================================
// RoomManager 类
// ============================================================

export class RoomManager {
    constructor() {
        /** @type {Map<string, Room>} 所有房间 key=roomId */
        this.rooms = new Map();
    }

    /**
     * 创建新房间
     * @param {string} hostId - 房主玩家ID
     * @param {object} settings - 房间设置
     * @param {string} hostName - 房主名称
     * @param {string} race - 房主种族
     * @returns {{ roomId: string, room: Room }} 创建结果
     */
    createRoom(hostId, settings = {}, hostName = 'Host', race = 'random') {
        // 生成唯一房间ID
        const roomId = generateRoomId();
        const room = new Room(roomId, hostId, settings);

        // 房主自动加入房间
        room.addPlayer(hostId, hostName, race);

        this.rooms.set(roomId, room);
        console.log(`[RoomManager] 房间创建: ${roomId} by ${hostName}, 设置:`, settings);

        return { roomId, room };
    }

    /**
     * 玩家加入房间
     * @param {string} roomId - 房间ID
     * @param {string} playerId - 玩家ID
     * @param {string} name - 玩家名称
     * @param {string} race - 种族选择
     * @returns {{ success: boolean, room?: Room, error?: string }}
     */
    joinRoom(roomId, playerId, name, race = 'random') {
        const room = this.rooms.get(roomId);

        // 房间不存在
        if (!room) {
            return { success: false, error: '房间不存在' };
        }

        // 房间状态不正确
        if (room.state !== ROOM_STATE_WAITING) {
            return { success: false, error: '游戏已经开始，无法加入' };
        }

        // 检查是否已在其他房间中
        if (this.isPlayerInAnyRoom(playerId)) {
            return { success: false, error: '请先离开当前房间' };
        }

        // 尝试加入
        if (!room.addPlayer(playerId, name, race)) {
            return { success: false, error: '房间已满或加入失败' };
        }

        console.log(`[RoomManager] 玩家加入: ${name} → ${roomId}`);
        return { success: true, room };
    }

    /**
     * 玩家离开房间
     * @param {string} roomId - 房间ID
     * @param {string} playerId - 玩家ID
     * @returns {{ success: boolean, roomEmpty: boolean, hostChanged?: boolean }}
     */
    leaveRoom(roomId, playerId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, roomEmpty: false };
        }

        const oldHostId = room.hostId;
        room.removePlayer(playerId);

        console.log(`[RoomManager] 玩家离开: ${playerId} ← ${roomId}`);

        // 如果房间为空，删除房间
        if (room.players.size === 0) {
            this.rooms.delete(roomId);
            console.log(`[RoomManager] 房间已删除: ${roomId}`);
            return { success: true, roomEmpty: true };
        }

        const hostChanged = oldHostId !== room.hostId;
        return { success: true, roomEmpty: false, hostChanged };
    }

    /**
     * 设置玩家准备状态
     * @param {string} roomId - 房间ID
     * @param {string} playerId - 玩家ID
     * @param {boolean} ready - 准备状态
     * @returns {{ success: boolean, allReady: boolean }}
     */
    setReady(roomId, playerId, ready) {
        const room = this.rooms.get(roomId);
        if (!room) return { success: false, allReady: false };

        room.setReady(playerId, ready);
        return { success: true, allReady: room.allReady() };
    }

    /**
     * 尝试开始游戏
     * @param {string} roomId - 房间ID
     * @returns {{ success: boolean, room?: Room, error?: string }}
     */
    startGame(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, error: '房间不存在' };
        }

        if (room.state !== ROOM_STATE_WAITING) {
            return { success: false, error: '游戏已开始或已结束' };
        }

        if (!room.allReady()) {
            return { success: false, error: '不是所有玩家都已准备' };
        }

        // 切换房间状态为游戏中
        room.state = ROOM_STATE_PLAYING;
        room.startedAt = Date.now();

        console.log(`[RoomManager] 游戏开始: ${roomId}, 玩家数: ${room.players.size}`);
        return { success: true, room };
    }

    /**
     * 结束游戏
     * @param {string} roomId - 房间ID
     * @param {string|null} winnerId - 胜利者ID（null表示平局）
     */
    endGame(roomId, winnerId = null) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.state = ROOM_STATE_FINISHED;
        room.endedAt = Date.now();
        room.winner = winnerId;

        console.log(`[RoomManager] 游戏结束: ${roomId}, 胜者: ${winnerId || '平局'}`);
    }

    /**
     * 获取房间
     * @param {string} roomId
     * @returns {Room|undefined}
     */
    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    /**
     * 获取所有房间列表（仅waiting状态）
     * @returns {Array}
     */
    getRoomList() {
        const list = [];
        for (const room of this.rooms.values()) {
            // 只返回等待中的房间供加入
            list.push(room.toPublicInfo());
        }
        return list;
    }

    /**
     * 查找玩家所在的房间
     * @param {string} playerId
     * @returns {Room|undefined}
     */
    getPlayerRoom(playerId) {
        for (const room of this.rooms.values()) {
            if (room.players.has(playerId)) {
                return room;
            }
        }
        return undefined;
    }

    /**
     * 检查玩家是否在任何房间中
     * @param {string} playerId
     * @returns {boolean}
     */
    isPlayerInAnyRoom(playerId) {
        return this.getPlayerRoom(playerId) !== undefined;
    }

    /**
     * 获取统计数据
     * @returns {{ totalRooms: number, waitingRooms: number, playingRooms: number, totalPlayers: number }}
     */
    getStats() {
        let waiting = 0, playing = 0, totalPlayers = 0;
        for (const room of this.rooms.values()) {
            if (room.state === ROOM_STATE_WAITING) waiting++;
            if (room.state === ROOM_STATE_PLAYING) playing++;
            totalPlayers += room.players.size;
        }
        return {
            totalRooms: this.rooms.size,
            waitingRooms: waiting,
            playingRooms: playing,
            totalPlayers,
        };
    }
}
