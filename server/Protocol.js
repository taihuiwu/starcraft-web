/**
 * Protocol.js - 通信协议定义
 * 
 * 定义客户端与服务器之间的所有消息格式（JSON）
 * 使用ES Module导出消息类型常量和验证/构造工具函数
 * 
 * 消息格式统一为: { type: string, data: object }
 */

// ============================================================
// 客户端 → 服务器 消息类型
// ============================================================

/** 创建房间 */
export const MSG_CREATE_ROOM = 'create_room';
/** 加入房间 */
export const MSG_JOIN_ROOM = 'join_room';
/** 玩家准备状态 */
export const MSG_READY = 'ready';
/** 游戏命令（每帧发送） */
export const MSG_GAME_COMMAND = 'game_command';
/** 聊天消息 */
export const MSG_CHAT = 'chat';
/** 离开房间 */
export const MSG_LEAVE_ROOM = 'leave_room';
/** 心跳 pong 响应 */
export const MSG_PONG = 'pong';
/** 请求房间列表 */
export const MSG_GET_ROOMS = 'get_rooms';
/** 断线重连 */
export const MSG_RECONNECT = 'reconnect';
/** 查询当前帧号（用于重连后追赶） */
export const MSG_GET_FRAME = 'get_frame';

// ============================================================
// 服务器 → 客户端 消息类型
// ============================================================

/** 房间创建成功 */
export const MSG_ROOM_CREATED = 'room_created';
/** 房间列表 */
export const MSG_ROOM_LIST = 'room_list';
/** 新玩家加入通知 */
export const MSG_PLAYER_JOINED = 'player_joined';
/** 玩家离开通知 */
export const MSG_PLAYER_LEFT = 'player_left';
/** 玩家准备状态更新 */
export const MSG_READY_UPDATE = 'ready_update';
/** 游戏开始 */
export const MSG_GAME_START = 'game_start';
/** 游戏帧命令（Lockstep同步广播） */
export const MSG_GAME_FRAME = 'game_frame';
/** 游戏状态快照（断线恢复用） */
export const MSG_GAME_SNAPSHOT = 'game_snapshot';
/** 游戏结束 */
export const MSG_GAME_END = 'game_end';
/** 心跳 ping */
export const MSG_PING = 'ping';
/** 重连成功 */
export const MSG_RECONNECT_OK = 'reconnect_ok';
/** 当前帧号（重连追赶用） */
export const MSG_FRAME_INFO = 'frame_info';
/** 错误信息 */
export const MSG_ERROR = 'error';

// ============================================================
// 错误码定义
// ============================================================

export const ERROR_CODES = {
    INVALID_MESSAGE: 'INVALID_MESSAGE',       // 消息格式无效
    ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',         // 房间不存在
    ROOM_FULL: 'ROOM_FULL',                   // 房间已满
    ROOM_NOT_WAITING: 'ROOM_NOT_WAITING',     // 房间不在等待状态
    ALREADY_IN_ROOM: 'ALREADY_IN_ROOM',       // 玩家已在房间中
    NOT_IN_ROOM: 'NOT_IN_ROOM',               // 玩家不在任何房间
    NOT_HOST: 'NOT_HOST',                     // 非房主操作
    NOT_ALL_READY: 'NOT_ALL_READY',           // 不是所有玩家都已准备
    INVALID_FRAME: 'INVALID_FRAME',           // 帧号无效
    GAME_IN_PROGRESS: 'GAME_IN_PROGRESS',     // 游戏已开始
    INTERNAL_ERROR: 'INTERNAL_ERROR',         // 服务器内部错误
};

// ============================================================
// 工具函数 - 构造消息
// ============================================================

/**
 * 构造一条标准消息
 * @param {string} type - 消息类型
 * @param {object} data - 消息数据
 * @returns {string} JSON字符串，可直接通过WebSocket发送
 */
export function buildMessage(type, data = {}) {
    return JSON.stringify({ type, data });
}

/**
 * 构造错误消息
 * @param {string} code - 错误码
 * @param {string} message - 错误描述
 * @returns {string} JSON字符串
 */
export function buildError(code, message) {
    return buildMessage(MSG_ERROR, { code, message });
}

/**
 * 解析接收到的WebSocket消息
 * @param {string} raw - 原始字符串
 * @returns {{ type: string, data: object } | null} 解析后的消息对象，失败返回null
 */
export function parseMessage(raw) {
    try {
        const msg = JSON.parse(raw);
        if (msg && typeof msg.type === 'string') {
            return { type: msg.type, data: msg.data || {} };
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * 验证消息类型是否合法
 * @param {string} type - 消息类型
 * @returns {boolean}
 */
export function isValidClientMessage(type) {
    const validTypes = [
        MSG_CREATE_ROOM,
        MSG_JOIN_ROOM,
        MSG_READY,
        MSG_GAME_COMMAND,
        MSG_CHAT,
        MSG_LEAVE_ROOM,
        MSG_PONG,
        MSG_GET_ROOMS,
        MSG_RECONNECT,
        MSG_GET_FRAME,
    ];
    return validTypes.includes(type);
}
