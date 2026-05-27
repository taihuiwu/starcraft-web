/**
 * NetworkPlayer.js - 网络玩家管理
 * 
 * 每个WebSocket连接对应一个NetworkPlayer实例
 * 负责管理：
 *   - 玩家基本信息（ID、名称、种族）
 *   - 连接状态（在线/断线/游戏中）
 *   - 命令缓冲区（收集当前帧的命令）
 *   - 延迟测量（RTT）
 *   - 断线检测和重连处理
 */

import { MSG_PING, buildMessage } from './Protocol.js';

// ============================================================
// 玩家状态枚举
// ============================================================

/** 连接正常 */
export const PLAYER_STATE_CONNECTED = 'connected';
/** 断线中（等待重连） */
export const PLAYER_STATE_DISCONNECTED = 'disconnected';
/** 游戏中 */
export const PLAYER_STATE_IN_GAME = 'in_game';
/** 已退出 */
export const PLAYER_STATE_LEFT = 'left';

// ============================================================
// NetworkPlayer 类
// ============================================================

export class NetworkPlayer {
    /**
     * 创建一个网络玩家实例
     * @param {string} playerId - 唯一玩家ID（使用WebSocket连接ID）
     * @param {WebSocket} ws - WebSocket连接对象
     * @param {string} name - 玩家显示名称
     */
    constructor(playerId, ws, name = 'Player') {
        // ---- 基本信息 ----
        /** @type {string} 玩家唯一ID */
        this.id = playerId;
        /** @type {WebSocket} WebSocket连接引用 */
        this.ws = ws;
        /** @type {string} 玩家显示名称 */
        this.name = name;
        /** @type {string} 选择的种族（terran/protoss/zerg） */
        this.race = 'random';
        /** @type {string} 所在房间ID */
        this.roomId = null;
        /** @type {boolean} 是否已准备 */
        this.ready = false;

        // ---- 状态管理 ----
        /** @type {string} 当前连接状态 */
        this.state = PLAYER_STATE_CONNECTED;
        /** @type {number} 断线时间戳（用于超时踢出） */
        this.disconnectedAt = 0;
        /** @type {number} 断线重连窗口（毫秒），超过此时间未重连则踢出 */
        this.reconnectTimeout = 30000; // 30秒

        // ---- 延迟测量 ----
        /** @type {number} 最近一次RTT测量值（毫秒） */
        this.rtt = 0;
        /** @type {number} 上次ping发送时间戳 */
        this.lastPingTime = 0;
        /** @type {number} ping序号，用于匹配ping/pong */
        this.pingSeq = 0;

        // ---- 命令缓冲区 ----
        /**
         * 当前帧的命令缓冲区
         * 格式: { [frameNumber]: Array<{ playerId, commands: [...] }> }
         */
        this.commandBuffer = {};

        // ---- 连接心跳 ----
        /** @type {boolean} 是否存活（ping/pong检测） */
        this.isAlive = true;
        /** @type {number} 上次收到pong的时间 */
        this.lastPongTime = Date.now();
    }

    // ============================================================
    // 消息发送
    // ============================================================

    /**
     * 向玩家发送消息
     * @param {string} type - 消息类型
     * @param {object} data - 消息数据
     */
    send(type, data) {
        if (this.ws && this.ws.readyState === 1) { // WebSocket.OPEN = 1
            try {
                this.ws.send(buildMessage(type, data));
            } catch (err) {
                console.error(`[NetworkPlayer] 发送消息失败: ${this.name}`, err.message);
            }
        }
    }

    /**
     * 向玩家发送原始JSON字符串
     * @param {string} raw - 已序列化的JSON字符串
     */
    sendRaw(raw) {
        if (this.ws && this.ws.readyState === 1) {
            try {
                this.ws.send(raw);
            } catch (err) {
                console.error(`[NetworkPlayer] 发送原始消息失败: ${this.name}`, err.message);
            }
        }
    }

    // ============================================================
    // 延迟测量
    // ============================================================

    /**
     * 发送心跳ping包并记录时间
     * @returns {number} ping序号
     */
    ping() {
        this.pingSeq++;
        this.lastPingTime = Date.now();
        this.isAlive = false; // 等待pong响应
        this.send(MSG_PING, { seq: this.pingSeq });
        return this.pingSeq;
    }

    /**
     * 收到pong响应时调用，计算RTT
     * @param {number} seq - pong返回的序号
     * @returns {number} 本次RTT（毫秒）
     */
    pong(seq) {
        if (seq === this.pingSeq) {
            this.rtt = Date.now() - this.lastPingTime;
        }
        this.isAlive = true;
        this.lastPongTime = Date.now();
        return this.rtt;
    }

    // ============================================================
    // 命令缓冲区管理
    // ============================================================

    /**
     * 添加命令到当前帧的缓冲区
     * @param {number} frame - 帧号
     * @param {Array} commands - 命令数组
     */
    addCommands(frame, commands) {
        if (!this.commandBuffer[frame]) {
            this.commandBuffer[frame] = [];
        }
        // 将命令数组追加到对应帧号的缓冲区
        this.commandBuffer[frame].push(...commands);
    }

    /**
     * 获取指定帧号的所有命令并清除缓冲
     * @param {number} frame - 帧号
     * @returns {Array} 该帧的所有命令
     */
    getCommands(frame) {
        const cmds = this.commandBuffer[frame] || [];
        delete this.commandBuffer[frame]; // 取出后删除，避免内存泄漏
        return cmds;
    }

    /**
     * 清除指定帧号之前的所有命令（用于快照后清理）
     * @param {number} upToFrame - 清除此帧号及之前的所有命令
     */
    clearOldCommands(upToFrame) {
        for (const frame of Object.keys(this.commandBuffer).map(Number)) {
            if (frame <= upToFrame) {
                delete this.commandBuffer[frame];
            }
        }
    }

    // ============================================================
    // 状态管理
    // ============================================================

    /**
     * 标记为断线
     */
    markDisconnected() {
        this.state = PLAYER_STATE_DISCONNECTED;
        this.disconnectedAt = Date.now();
        console.log(`[NetworkPlayer] 玩家断线: ${this.name} (${this.id})`);
    }

    /**
     * 标记为已重连，更新WebSocket引用
     * @param {WebSocket} newWs - 新的WebSocket连接
     */
    markReconnected(newWs) {
        this.ws = newWs;
        this.state = PLAYER_STATE_CONNECTED;
        this.disconnectedAt = 0;
        this.isAlive = true;
        this.lastPongTime = Date.now();
        console.log(`[NetworkPlayer] 玩家重连: ${this.name} (${this.id})`);
    }

    /**
     * 标记为已退出
     */
    markLeft() {
        this.state = PLAYER_STATE_LEFT;
        this.roomId = null;
        this.ready = false;
        console.log(`[NetworkPlayer] 玩家退出: ${this.name} (${this.id})`);
    }

    /**
     * 检查断线是否超时
     * @returns {boolean} 是否已超时
     */
    isTimedOut() {
        if (this.state !== PLAYER_STATE_DISCONNECTED) return false;
        return Date.now() - this.disconnectedAt > this.reconnectTimeout;
    }

    /**
     * 重置准备状态
     */
    resetReady() {
        this.ready = false;
    }

    // ============================================================
    // 序列化（用于快照和房间信息）
    // ============================================================

    /**
     * 获取玩家公开信息（不含WebSocket引用等内部数据）
     * @returns {object}
     */
    toInfo() {
        return {
            id: this.id,
            name: this.name,
            race: this.race,
            ready: this.ready,
            state: this.state,
            rtt: this.rtt,
            roomId: this.roomId,
        };
    }

    /**
     * 获取简要信息（用于游戏开始广播）
     * @returns {object}
     */
    toGameInfo() {
        return {
            id: this.id,
            name: this.name,
            race: this.race,
            rtt: this.rtt,
        };
    }
}
