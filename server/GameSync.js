/**
 * GameSync.js - 游戏状态同步（Lockstep模型）
 * 
 * 实现星际争霸1原版使用的Lockstep同步机制：
 *   1. 每个玩家在本地执行游戏逻辑，产生命令
 *   2. 玩家将本帧的命令发送到服务器
 *   3. 服务器收集所有在线玩家的命令（超时则用空命令填充断线玩家）
 *   4. 服务器广播统一的命令帧给所有玩家
 *   5. 所有客户端在收到命令帧后，以相同顺序执行，保证一致性
 * 
 * 同时提供定期快照机制，支持断线重连恢复
 */

import { generateSeed } from './utils.js';

// ============================================================
// 同步参数常量
// ============================================================

/** 帧超时（毫秒）：超过此时间未收到所有玩家命令，则使用空命令推进 */
export const FRAME_TIMEOUT = 200; // 200ms

/** 帧率（每秒帧数）：每16.67ms一帧，约60fps逻辑帧 */
export const TICK_RATE = 60;

/** 快照间隔（帧数）：每N帧保存一次完整状态快照 */
export const SNAPSHOT_INTERVAL = 600; // 每10秒（60帧/秒 × 10秒）

/** 最大断线容忍帧数：超过此帧数未重连则判负 */
export const MAX_DISCONNECT_FRAMES = 300; // 5分钟

// ============================================================
// GameSync 类
// ============================================================

export class GameSync {
    /**
     * @param {string} roomId - 所属房间ID
     * @param {Array} players - 参与游戏的玩家信息数组 [{ id, name, race }]
     */
    constructor(roomId, players) {
        /** @type {string} 房间ID */
        this.roomId = roomId;

        /** @type {Array<string>} 所有参与游戏的玩家ID列表（固定顺序，确定初始位置） */
        this.playerIds = players.map(p => p.id);

        /** @type {Map<string, { name: string, race: string }>} 玩家信息映射 */
        this.playerInfo = new Map();
        for (const p of players) {
            this.playerInfo.set(p.id, { name: p.name, race: p.race });
        }

        // ---- 帧同步状态 ----
        /** @type {number} 当前正在处理的帧号 */
        this.currentFrame = 0;
        /** @type {boolean} 同步是否已启动 */
        this.running = false;
        /** @type {NodeJS.Timeout|null} 帧驱动定时器 */
        this.tickTimer = null;

        // ---- 命令收集 ----
        /**
         * 每帧收集到的命令
         * 格式: { [frameNumber]: { [playerId]: Array<command> } }
         */
        this.frameCommands = {};

        /**
         * 已经发送了命令的玩家集合（当前帧）
         * @type {Set<string>}
         */
        this.playersWithCommands = new Set();

        // ---- 游戏状态快照 ----
        /**
         * 历史快照数组（用于断线重连恢复）
         * 格式: [{ frame, state }]
         */
        this.snapshots = [];

        // ---- 随机种子（确保所有客户端使用相同的随机序列） ----
        /** @type {number} */
        this.seed = generateSeed();

        // ---- 统计 ----
        /** @type {number} 已广播的帧总数 */
        this.framesBroadcast = 0;
        /** @type {number} 因超时跳过的帧数 */
        this.timeoutFrames = 0;
        /** @type {number} 游戏开始时间 */
        this.startTime = 0;
    }

    // ============================================================
    // 生命周期管理
    // ============================================================

    /**
     * 启动帧同步循环
     * @param {function} onFrame - 每帧广播回调 (frame, commands) => void
     */
    start(onFrame) {
        if (this.running) return;
        this.running = true;
        this.startTime = Date.now();
        this.onFrame = onFrame;

        const frameInterval = 1000 / TICK_RATE; // 每帧间隔（毫秒）
        console.log(`[GameSync] 同步启动: roomId=${this.roomId}, seed=${this.seed}, ` +
                    `帧率=${TICK_RATE}fps, 帧间隔=${frameInterval.toFixed(1)}ms`);

        // 使用setInterval驱动帧循环
        this.tickTimer = setInterval(() => {
            this.tick();
        }, frameInterval);
    }

    /**
     * 停止帧同步
     */
    stop() {
        if (this.tickTimer) {
            clearInterval(this.tickTimer);
            this.tickTimer = null;
        }
        this.running = false;
        console.log(`[GameSync] 同步停止: 共广播 ${this.framesBroadcast} 帧, ` +
                    `超时帧 ${this.timeoutFrames}`);
    }

    // ============================================================
    // 核心帧驱动逻辑
    // ============================================================

    /**
     * 每帧执行一次（由定时器驱动）
     * 
     * Lockstep逻辑：
     *   1. 检查当前帧是否所有玩家都发送了命令
     *   2. 如果是，或者已超时，则将命令帧广播给所有玩家
     *   3. 推进到下一帧
     */
    tick() {
        if (!this.running) return;

        const frame = this.currentFrame;
        const allPlayers = this.playerIds;

        // 检查哪些玩家在本帧发送了命令
        const submitted = this.playersWithCommands;

        // 判断是否所有玩家都已提交命令
        const allSubmitted = allPlayers.every(id => submitted.has(id));

        if (!allSubmitted) {
            // 某些玩家未提交命令 - 检查是否超时
            // 在实际Lockstep中，通常会给一些缓冲时间
            // 这里简化处理：如果已有部分命令但未全部到齐，继续等待下一帧检查
            // 但如果已经是下一帧（超时），则用空命令填充
            // 注意：这里不做等待，直接用已有的命令推进
        }

        // 收集当前帧的所有命令
        const frameCmds = {};
        const missingPlayers = [];

        for (const pid of allPlayers) {
            if (this.frameCommands[frame] && this.frameCommands[frame][pid]) {
                frameCmds[pid] = this.frameCommands[frame][pid];
            } else {
                // 未提交命令的玩家 - 使用空命令
                frameCmds[pid] = [];
                missingPlayers.push(pid);
            }
        }

        // 记录超时统计
        if (missingPlayers.length > 0) {
            this.timeoutFrames++;
        }

        // 广播命令帧给所有回调
        if (this.onFrame) {
            this.onFrame(frame, frameCmds, missingPlayers);
        }

        // 清理当前帧数据
        delete this.frameCommands[frame];
        this.playersWithCommands.clear();

        // 推进帧号
        this.currentFrame++;
        this.framesBroadcast++;

        // 定期保存快照
        if (this.currentFrame % SNAPSHOT_INTERVAL === 0) {
            // 快照由外部调用 saveSnapshot() 提供实际状态
            console.log(`[GameSync] 第 ${this.currentFrame} 帧 - 触发快照点`);
        }
    }

    // ============================================================
    // 命令接收
    // ============================================================

    /**
     * 接收玩家提交的命令
     * @param {string} playerId - 玩家ID
     * @param {number} frame - 帧号
     * @param {Array} commands - 命令数组
     * @returns {{ success: boolean, error?: string }}
     */
    receiveCommands(playerId, frame, commands) {
        // 验证帧号：只接受当前帧或未来一帧的命令（允许微小延迟）
        if (frame < this.currentFrame) {
            return { success: false, error: `过期命令: 帧${frame} < 当前帧${this.currentFrame}` };
        }

        // 限制未来帧号不能太远（防止作弊）
        if (frame > this.currentFrame + 2) {
            return { success: false, error: `未来帧命令不允许超过2帧: ${frame} > ${this.currentFrame + 2}` };
        }

        // 初始化帧命令存储
        if (!this.frameCommands[frame]) {
            this.frameCommands[frame] = {};
        }

        // 记录命令（如果已存在则合并）
        if (!this.frameCommands[frame][playerId]) {
            this.frameCommands[frame][playerId] = [];
        }
        this.frameCommands[frame][playerId].push(...commands);

        // 标记该玩家已提交
        this.playersWithCommands.add(playerId);

        return { success: true };
    }

    // ============================================================
    // 断线处理
    // ============================================================

    /**
     * 标记玩家断线（断线玩家的命令用空命令填充）
     * @param {string} playerId
     */
    markPlayerDisconnected(playerId) {
        console.log(`[GameSync] 玩家断线标记: ${playerId} at frame ${this.currentFrame}`);
        // 断线玩家后续帧将自动使用空命令
    }

    /**
     * 玩家重连 - 返回最近的快照信息供客户端追赶
     * @param {string} playerId
     * @returns {{ snapshot: object|null, currentFrame: number }}
     */
    getPlayerReconnectInfo(playerId) {
        return {
            snapshot: this.snapshots.length > 0
                ? this.snapshots[this.snapshots.length - 1]
                : null,
            currentFrame: this.currentFrame,
            missedFrames: this.getMissedFrames(playerId),
        };
    }

    /**
     * 获取指定玩家错过的帧命令（用于重连追赶）
     * @param {string} playerId
     * @returns {Array<{ frame: number, commands: object }>}
     */
    getMissedFrames(playerId) {
        // 返回最近一定数量的帧命令
        // 实际实现中可从缓冲区获取
        return []; // 简化实现：依赖快照恢复
    }

    // ============================================================
    // 快照管理
    // ============================================================

    /**
     * 保存游戏状态快照
     * @param {object} state - 完整游戏状态
     */
    saveSnapshot(state) {
        const snapshot = {
            frame: this.currentFrame,
            timestamp: Date.now(),
            state,
        };
        this.snapshots.push(snapshot);

        // 只保留最近的快照（避免内存无限增长）
        const MAX_SNAPSHOTS = 10;
        if (this.snapshots.length > MAX_SNAPSHOTS) {
            this.snapshots.shift();
        }

        console.log(`[GameSync] 快照保存: 帧${this.currentFrame}`);
    }

    /**
     * 获取最近一次快照
     * @returns {object|null}
     */
    getLatestSnapshot() {
        if (this.snapshots.length === 0) return null;
        return this.snapshots[this.snapshots.length - 1];
    }

    // ============================================================
    // 玩家管理
    // ============================================================

    /**
     * 从游戏中移除一个玩家（处理游戏中掉线/投降）
     * @param {string} playerId
     * @returns {boolean} 是否还有玩家存活
     */
    removePlayer(playerId) {
        const idx = this.playerIds.indexOf(playerId);
        if (idx !== -1) {
            this.playerIds.splice(idx, 1);
            this.markPlayerDisconnected(playerId);
        }

        // 如果只剩一个玩家，该玩家获胜
        const alive = this.playerIds.filter(id => {
            // 排除已断线的玩家（简化判断）
            return true; // 实际项目中应检查NetworkPlayer的state
        });

        return alive.length > 1;
    }

    // ============================================================
    // 统计信息
    // ============================================================

    /**
     * 获取同步统计信息
     * @returns {object}
     */
    getStats() {
        return {
            roomId: this.roomId,
            currentFrame: this.currentFrame,
            framesBroadcast: this.framesBroadcast,
            timeoutFrames: this.timeoutFrames,
            playerCount: this.playerIds.length,
            snapshotCount: this.snapshots.length,
            seed: this.seed,
            elapsed: this.startTime ? Date.now() - this.startTime : 0,
            tickRate: TICK_RATE,
        };
    }
}
