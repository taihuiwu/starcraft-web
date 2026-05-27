/**
 * index.js - WebSocket服务器主入口
 * 
 * 使用Node.js内置http模块 + ws库搭建WebSocket服务器
 * 功能：
 *   - 监听端口3001
 *   - 处理WebSocket连接、断开、消息
 *   - 消息路由（根据type字段分发到对应handler）
 *   - 心跳检测（30秒ping/pong）
 *   - 日志记录
 */

import http from 'http';
import { WebSocketServer } from 'ws';
import { NetworkPlayer, PLAYER_STATE_DISCONNECTED, PLAYER_STATE_LEFT } from './NetworkPlayer.js';
import { RoomManager, ROOM_STATE_WAITING } from './RoomManager.js';
import { GameSync, MAX_DISCONNECT_FRAMES } from './GameSync.js';
import { generatePlayerId, generateSeed } from './utils.js';
import {
    // 客户端消息类型
    MSG_CREATE_ROOM, MSG_JOIN_ROOM, MSG_READY, MSG_GAME_COMMAND,
    MSG_CHAT, MSG_LEAVE_ROOM, MSG_PONG, MSG_GET_ROOMS, MSG_RECONNECT, MSG_GET_FRAME,
    // 服务器消息类型
    MSG_ROOM_CREATED, MSG_ROOM_LIST, MSG_PLAYER_JOINED, MSG_PLAYER_LEFT,
    MSG_READY_UPDATE, MSG_GAME_START, MSG_GAME_FRAME, MSG_GAME_SNAPSHOT,
    MSG_GAME_END, MSG_PING, MSG_RECONNECT_OK, MSG_FRAME_INFO, MSG_ERROR,
    // 工具函数
    buildMessage, buildError, parseMessage, isValidClientMessage,
    ERROR_CODES,
} from './Protocol.js';

// ============================================================
// 服务器配置
// ============================================================

const PORT = process.env.PORT || 3001;  // 监听端口，可通过环境变量覆盖
const HEARTBEAT_INTERVAL = 30000;        // 心跳间隔：30秒
const RECONNECT_WINDOW = 30000;          // 断线重连窗口：30秒

// ============================================================
// 全局状态
// ============================================================

/** @type {Map<string, NetworkPlayer>} 所有在线玩家 key=playerId */
const players = new Map();

/** @type {RoomManager} 房间管理器 */
const roomManager = new RoomManager();

/** @type {Map<string, GameSync>} 活跃游戏同步器 key=roomId */
const activeGames = new Map();

/** @type {Map<string, string>} WebSocket实例到玩家ID的映射 key=ws实例引用 → playerId */
const wsToPlayer = new Map();

// ============================================================
// HTTP服务器 + WebSocket服务器
// ============================================================

// 创建HTTP服务器（ws库需要挂载在HTTP服务器上）
const server = http.createServer((req, res) => {
    // 简单的健康检查接口
    if (req.url === '/health') {
        const stats = roomManager.getStats();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'ok',
            uptime: process.uptime(),
            ...stats,
        }));
        return;
    }

    // 默认404
    res.writeHead(404);
    res.end('Not Found');
});

// 创建WebSocket服务器，挂载在HTTP服务器上
const wss = new WebSocketServer({ server });

console.log(`[Server] 正在启动 WebSocket 服务器...`);

// ============================================================
// WebSocket连接处理
// ============================================================

wss.on('connection', (ws, req) => {
    // 生成唯一玩家ID
    const playerId = generatePlayerId();
    // 从查询参数或默认获取玩家名称
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const playerName = url.searchParams.get('name') || `Player_${playerId.slice(2, 8)}`;

    // 创建NetworkPlayer实例
    const player = new NetworkPlayer(playerId, ws, playerName);
    players.set(playerId, player);
    wsToPlayer.set(ws, playerId);

    log('连接', `${playerName} (${playerId}) 已连接, IP: ${req.socket.remoteAddress}`);

    // 发送连接确认（包含分配的玩家ID）
    ws.send(buildMessage('connected', {
        playerId,
        name: playerName,
        heartbeatInterval: HEARTBEAT_INTERVAL,
    }));

    // ============================================================
    // 消息处理
    // ============================================================

    ws.on('message', (data) => {
        const raw = data.toString();
        const msg = parseMessage(raw);

        if (!msg) {
            ws.send(buildError(ERROR_CODES.INVALID_MESSAGE, '消息格式无效'));
            return;
        }

        // 消息路由 - 根据type字段分发到对应处理函数
        try {
            handleMessage(player, msg);
        } catch (err) {
            console.error(`[Server] 消息处理异常: ${player.name}`, err);
            ws.send(buildError(ERROR_CODES.INTERNAL_ERROR, '服务器内部错误'));
        }
    });

    // ============================================================
    // 连接关闭处理
    // ============================================================

    ws.on('close', () => {
        log('断开', `${player.name} (${playerId}) 连接关闭`);
        handleDisconnect(player);
    });

    // ============================================================
    // 连接错误处理
    // ============================================================

    ws.on('error', (err) => {
        console.error(`[Server] WebSocket错误: ${player.name}`, err.message);
    });

    // ============================================================
    // Pong响应处理
    // ============================================================

    ws.on('pong', () => {
        player.isAlive = true;
        player.lastPongTime = Date.now();
    });
});

// ============================================================
// 消息路由函数
// ============================================================

/**
 * 根据消息类型分发到对应的处理函数
 * @param {NetworkPlayer} player - 发送消息的玩家
 * @param {{ type: string, data: object }} msg - 解析后的消息
 */
function handleMessage(player, msg) {
    const { type, data } = msg;

    switch (type) {
        // ---- 房间管理 ----
        case MSG_CREATE_ROOM:
            handleCreateRoom(player, data);
            break;
        case MSG_JOIN_ROOM:
            handleJoinRoom(player, data);
            break;
        case MSG_LEAVE_ROOM:
            handleLeaveRoom(player);
            break;
        case MSG_READY:
            handleReady(player, data);
            break;
        case MSG_GET_ROOMS:
            handleGetRooms(player);
            break;

        // ---- 游戏同步 ----
        case MSG_GAME_COMMAND:
            handleGameCommand(player, data);
            break;

        // ---- 通信 ----
        case MSG_CHAT:
            handleChat(player, data);
            break;

        // ---- 心跳 ----
        case MSG_PONG:
            handlePong(player, data);
            break;

        // ---- 重连 ----
        case MSG_RECONNECT:
            handleReconnect(player, data);
            break;
        case MSG_GET_FRAME:
            handleGetFrame(player);
            break;

        default:
            player.send(MSG_ERROR, {
                code: ERROR_CODES.INVALID_MESSAGE,
                message: `未知消息类型: ${type}`,
            });
    }
}

// ============================================================
// 具体消息处理函数
// ============================================================

/**
 * 处理创建房间
 */
function handleCreateRoom(player, data) {
    // 如果玩家已在房间中，先离开
    if (player.roomId) {
        const oldRoom = roomManager.getRoom(player.roomId);
        if (oldRoom) {
            roomManager.leaveRoom(player.roomId, player.id);
            broadcastToRoom(player.roomId, MSG_PLAYER_LEFT, { playerId: player.id, name: player.name });
        }
        player.roomId = null;
        player.ready = false;
    }

    const { hostName, maxPlayers, mapSize, race } = data;

    // 更新玩家信息
    if (hostName) player.name = hostName;
    if (race) player.race = race;

    // 创建房间
    const { roomId, room } = roomManager.createRoom(
        player.id,
        { maxPlayers, mapSize },
        player.name,
        player.race
    );

    // 更新玩家房间归属
    player.roomId = roomId;

    // 通知房主房间创建成功
    player.send(MSG_ROOM_CREATED, { roomId });
    log('房间', `${player.name} 创建房间 ${roomId}`);
}

/**
 * 处理加入房间
 */
function handleJoinRoom(player, data) {
    const { roomId, playerName, race } = data;

    if (!roomId) {
        player.send(MSG_ERROR, {
            code: ERROR_CODES.INVALID_MESSAGE,
            message: '请提供房间ID',
        });
        return;
    }

    // 更新玩家信息
    if (playerName) player.name = playerName;
    if (race) player.race = race;

    const result = roomManager.joinRoom(roomId, player.id, player.name, player.race);

    if (!result.success) {
        player.send(MSG_ERROR, {
            code: ERROR_CODES.ROOM_FULL,
            message: result.error,
        });
        return;
    }

    // 更新玩家房间归属
    player.roomId = roomId;

    // 通知房间内所有玩家有新人加入
    broadcastToRoom(roomId, MSG_PLAYER_JOINED, {
        playerId: player.id,
        playerName: player.name,
        race: player.race,
    }, player.id);

    // 发送房间信息给新加入的玩家
    const room = result.room;
    player.send('room_info', {
        roomId,
        hostId: room.hostId,
        players: room.getPlayerList(),
        settings: room.settings,
    });

    log('房间', `${player.name} 加入房间 ${roomId}`);
}

/**
 * 处理离开房间
 */
function handleLeaveRoom(player) {
    if (!player.roomId) {
        player.send(MSG_ERROR, {
            code: ERROR_CODES.NOT_IN_ROOM,
            message: '你不在任何房间中',
        });
        return;
    }

    const roomId = player.roomId;
    const result = roomManager.leaveRoom(roomId, player.id);

    player.roomId = null;
    player.ready = false;

    if (!result.roomEmpty) {
        // 通知房间内其他玩家
        broadcastToRoom(roomId, MSG_PLAYER_LEFT, {
            playerId: player.id,
            name: player.name,
            hostChanged: result.hostChanged,
        });
    }

    log('房间', `${player.name} 离开房间 ${roomId}`);
}

/**
 * 处理玩家准备状态
 */
function handleReady(player, data) {
    if (!player.roomId) {
        player.send(MSG_ERROR, {
            code: ERROR_CODES.NOT_IN_ROOM,
            message: '请先加入房间',
        });
        return;
    }

    const room = roomManager.getRoom(player.roomId);
    if (!room) {
        player.send(MSG_ERROR, {
            code: ERROR_CODES.ROOM_NOT_FOUND,
            message: '房间不存在',
        });
        return;
    }

    if (room.state !== ROOM_STATE_WAITING) {
        player.send(MSG_ERROR, {
            code: ERROR_CODES.GAME_IN_PROGRESS,
            message: '游戏已开始，无法切换准备状态',
        });
        return;
    }

    const ready = data.ready !== false; // 默认为true
    player.ready = ready;
    roomManager.setReady(player.roomId, player.id, ready);

    // 通知房间内所有玩家准备状态变化
    broadcastToRoom(player.roomId, MSG_READY_UPDATE, {
        playerId: player.id,
        name: player.name,
        ready,
        allReady: room.allReady(),
    });

    // 如果所有玩家都准备好了，房主可以开始游戏
    // 服务器自动开始（简化实现）
    if (room.allReady()) {
        log('房间', `${player.roomId} 所有玩家已准备，等待房主开始游戏...`);
        // 可以选择自动开始，也可以等待房主发送start_game消息
        // 这里通知房主可以开始了
        const hostPlayer = players.get(room.hostId);
        if (hostPlayer) {
            hostPlayer.send('can_start', { message: '所有玩家已准备，可以开始游戏' });
        }
    }
}

/**
 * 处理获取房间列表
 */
function handleGetRooms(player) {
    const rooms = roomManager.getRoomList();
    player.send(MSG_ROOM_LIST, { rooms });
}

/**
 * 处理游戏命令
 */
function handleGameCommand(player, data) {
    if (!player.roomId) return;

    const sync = activeGames.get(player.roomId);
    if (!sync) return;

    const { frame, commands } = data;
    if (!Array.isArray(commands)) return;

    const result = sync.receiveCommands(player.id, frame, commands);
    if (!result.success) {
        // 帧号过期或无效 - 静默忽略，不报错
    }
}

/**
 * 处理聊天消息
 */
function handleChat(player, data) {
    if (!player.roomId) return;

    const { message } = data;
    if (!message || typeof message !== 'string') return;

    // 限制消息长度
    const truncated = message.slice(0, 200);

    // 广播给房间内所有玩家（包括自己）
    broadcastToRoom(player.roomId, MSG_CHAT, {
        playerId: player.id,
        name: player.name,
        message: truncated,
        timestamp: Date.now(),
    });
}

/**
 * 处理pong心跳响应
 */
function handlePong(player, data) {
    const { seq } = data;
    player.pong(seq || 0);
}

/**
 * 处理断线重连请求
 */
function handleReconnect(player, data) {
    const { originalPlayerId, roomId } = data;

    if (!originalPlayerId || !roomId) {
        player.send(MSG_ERROR, {
            code: ERROR_CODES.INVALID_MESSAGE,
            message: '重连需要提供原始玩家ID和房间ID',
        });
        return;
    }

    // 查找原始玩家
    const originalPlayer = players.get(originalPlayerId);

    // 检查原始玩家是否处于断线状态
    if (!originalPlayer || originalPlayer.state !== PLAYER_STATE_DISCONNECTED) {
        player.send(MSG_ERROR, {
            code: ERROR_CODES.NOT_IN_ROOM,
            message: '找不到可重连的断线玩家',
        });
        return;
    }

    // 检查断线是否超时
    if (originalPlayer.isTimedOut()) {
        player.send(MSG_ERROR, {
            code: ERROR_CODES.NOT_IN_ROOM,
            message: '断线超时，无法重连',
        });
        return;
    }

    // 执行重连：更新WebSocket引用
    const oldWs = originalPlayer.ws;
    wsToPlayer.delete(oldWs);
    originalPlayer.markReconnected(player.ws);
    wsToPlayer.set(player.ws, originalPlayerId);

    // 移除当前临时玩家（重连玩家使用原始ID）
    players.delete(player.id);
    wsToPlayer.delete(player.ws);
    wsToPlayer.set(player.ws, originalPlayerId);

    // 通知重连成功
    player.send(MSG_RECONNECT_OK, {
        playerId: originalPlayerId,
        name: originalPlayer.name,
        roomId: originalPlayer.roomId,
    });

    // 如果游戏正在进行，发送快照和帧信息
    const sync = activeGames.get(roomId);
    if (sync) {
        const reconnectInfo = sync.getPlayerReconnectInfo(originalPlayerId);
        if (reconnectInfo.snapshot) {
            player.send(MSG_GAME_SNAPSHOT, {
                state: reconnectInfo.snapshot.state,
                frame: reconnectInfo.snapshot.frame,
            });
        }
        player.send(MSG_FRAME_INFO, {
            currentFrame: reconnectInfo.currentFrame,
        });
    }

    log('重连', `${originalPlayer.name} (${originalPlayerId}) 重连成功`);
}

/**
 * 处理获取当前帧号（用于重连后追赶）
 */
function handleGetFrame(player) {
    if (!player.roomId) return;

    const sync = activeGames.get(player.roomId);
    if (!sync) return;

    const info = sync.getPlayerReconnectInfo(player.id);
    player.send(MSG_FRAME_INFO, {
        currentFrame: info.currentFrame,
    });
}

// ============================================================
// 游戏开始/结束逻辑
// ============================================================

/**
 * 开始游戏（通过HTTP或其他机制触发，也可由房间管理器调用）
 * @param {string} roomId
 */
function startGameForRoom(roomId) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    const result = roomManager.startGame(roomId);
    if (!result.success) {
        console.error(`[Server] 开始游戏失败: ${result.error}`);
        return;
    }

    // 获取参与游戏的玩家列表
    const gamePlayers = room.getPlayerList();
    const playerIds = gamePlayers.map(p => p.id);

    // 创建GameSync实例
    const sync = new GameSync(roomId, gamePlayers);
    activeGames.set(roomId, sync);

    // 注册帧广播回调
    sync.start((frame, frameCommands, missingPlayers) => {
        // 将帧命令广播给房间内所有玩家
        for (const pid of playerIds) {
            const p = players.get(pid);
            if (p && p.state === 'connected') {
                p.send(MSG_GAME_FRAME, {
                    frame,
                    commands: frameCommands,
                });
            }
        }

        // 每隔一定帧数保存快照（由GameSync触发，这里捕获）
        // 实际快照状态需要游戏逻辑层提供
    });

    // 通知所有玩家游戏开始
    const seed = sync.seed;
    const mapConfig = {
        size: room.settings.mapSize,
        fogOfWar: room.settings.fogOfWar,
    };

    broadcastToRoom(roomId, MSG_GAME_START, {
        seed,
        players: gamePlayers.map(p => ({
            id: p.id,
            name: p.name,
            race: p.race,
        })),
        mapConfig,
        tickRate: 60,
    });

    // 更新所有玩家状态
    for (const pid of playerIds) {
        const p = players.get(pid);
        if (p) p.state = 'in_game';
    }

    log('游戏', `游戏开始: ${roomId}, 玩家: ${playerIds.join(', ')}`);
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 向房间内所有玩家广播消息
 * @param {string} roomId - 房间ID
 * @param {string} type - 消息类型
 * @param {object} data - 消息数据
 * @param {string} [excludeId] - 排除的玩家ID（不发送给他）
 */
function broadcastToRoom(roomId, type, data, excludeId = null) {
    const room = roomManager.getRoom(roomId);
    if (!room) return;

    for (const playerEntry of room.players.values()) {
        if (playerEntry.id === excludeId) continue;
        const player = players.get(playerEntry.id);
        if (player && player.state !== PLAYER_STATE_LEFT) {
            player.send(type, data);
        }
    }
}

/**
 * 处理玩家断开连接
 * @param {NetworkPlayer} player
 */
function handleDisconnect(player) {
    // 标记玩家断线
    player.markDisconnected();

    // 如果玩家在房间中
    if (player.roomId) {
        const room = roomManager.getRoom(player.roomId);

        // 如果游戏未开始，直接踢出
        if (!room || room.state === ROOM_STATE_WAITING) {
            const result = roomManager.leaveRoom(player.roomId, player.id);
            player.roomId = null;
            player.ready = false;

            if (!result.roomEmpty) {
                broadcastToRoom(
                    player.roomId || '',
                    MSG_PLAYER_LEFT,
                    { playerId: player.id, name: player.name, disconnected: true }
                );
            }
            return;
        }

        // 游戏进行中标记断线（等待重连）
        const sync = activeGames.get(player.roomId);
        if (sync) {
            sync.markPlayerDisconnected(player.id);
        }

        broadcastToRoom(player.roomId, MSG_PLAYER_LEFT, {
            playerId: player.id,
            name: player.name,
            disconnected: true,
            reconnectWindow: RECONNECT_WINDOW,
        });
    }

    // 从WebSocket映射中移除
    wsToPlayer.delete(player.ws);
}

/**
 * 格式化日志时间
 */
function logTime() {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false });
}

/**
 * 带标签的日志输出
 */
function log(tag, ...args) {
    console.log(`[${logTime()}] [${tag}]`, ...args);
}

// ============================================================
// 心跳检测定时器
// ============================================================

const heartbeatTimer = setInterval(() => {
    wss.clients.forEach((ws) => {
        const pid = wsToPlayer.get(ws);
        const player = pid ? players.get(pid) : null;

        if (!player) return;

        // 如果上次pong已经超时（超过心跳间隔的1.5倍），则认为已断线
        if (!player.isAlive && Date.now() - player.lastPongTime > HEARTBEAT_INTERVAL * 1.5) {
            log('心跳', `${player.name} (${player.id}) 心跳超时，强制断开`);
            ws.terminate();
            return;
        }

        // 发送心跳ping
        player.isAlive = false;
        ws.ping();
    });
}, HEARTBEAT_INTERVAL);

// 当WebSocket服务器关闭时清除心跳定时器
wss.on('close', () => {
    clearInterval(heartbeatTimer);
});

// ============================================================
// 断线超时检测
// ============================================================

const reconnectCheckTimer = setInterval(() => {
    for (const [id, player] of players) {
        if (player.state === PLAYER_STATE_DISCONNECTED && player.isTimedOut()) {
            log('超时', `${player.name} (${id}) 重连超时，踢出`);

            // 如果在房间中，从房间移除
            if (player.roomId) {
                roomManager.leaveRoom(player.roomId, player.id);
                broadcastToRoom(player.roomId, MSG_PLAYER_LEFT, {
                    playerId: player.id,
                    name: player.name,
                    timedOut: true,
                });
                player.roomId = null;
            }

            player.markLeft();
            players.delete(id);
        }
    }
}, 10000); // 每10秒检查一次

// ============================================================
// 启动服务器
// ============================================================

server.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║     ⚔️  星际争霸 Web - 联机服务器  ⚔️       ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log(`║  HTTP:  http://localhost:${PORT}              ║`);
    console.log(`║  WS:    ws://localhost:${PORT}                ║`);
    console.log(`║  健康:  http://localhost:${PORT}/health       ║`);
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  同步模型: Lockstep (SC1原版)                ║');
    console.log(`║  帧率: 60fps | 心跳: ${HEARTBEAT_INTERVAL/1000}s              ║`);
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
});

// ============================================================
// 优雅退出
// ============================================================

process.on('SIGINT', () => {
    console.log('\n[Server] 收到 SIGINT 信号，正在关闭...');

    // 通知所有在线玩家服务器关闭
    for (const player of players.values()) {
        player.send('server_shutdown', { message: '服务器正在关闭' });
        if (player.ws) player.ws.close();
    }

    // 停止所有游戏同步
    for (const sync of activeGames.values()) {
        sync.stop();
    }

    // 关闭WebSocket服务器
    wss.close(() => {
        console.log('[Server] WebSocket服务器已关闭');
        server.close(() => {
            console.log('[Server] HTTP服务器已关闭');
            process.exit(0);
        });
    });

    // 强制退出兜底（5秒后）
    setTimeout(() => {
        console.log('[Server] 强制退出');
        process.exit(1);
    }, 5000);
});

// 导出供外部使用（如测试或脚本调用）
export { server, wss, roomManager, activeGames, players, startGameForRoom };
