/**
 * utils.js - 通用工具函数
 * 
 * 提供ID生成、日志格式化等公共工具方法
 */

import { randomBytes } from 'crypto';

/**
 * 生成6位随机房间ID（大写字母+数字）
 * @returns {string} 6位字符串，例如 "A3XK9B"
 */
export function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = randomBytes(6);
    let id = '';
    for (let i = 0; i < 6; i++) {
        id += chars[bytes[i] % chars.length];
    }
    return id;
}

/**
 * 生成随机玩家ID（用于首次连接时分配）
 * @returns {string} 格式 "p_xxxxxxxx"（32位hex）
 */
export function generatePlayerId() {
    const bytes = randomBytes(16);
    return 'p_' + bytes.toString('hex');
}

/**
 * 生成随机种子（用于游戏初始化，确保所有客户端使用相同随机序列）
 * @returns {number}
 */
export function generateSeed() {
    return Math.floor(Math.random() * 2147483647);
}

/**
 * 格式化时间戳为可读字符串
 * @param {number} ts - 时间戳
 * @returns {string}
 */
export function formatTime(ts = Date.now()) {
    return new Date(ts).toLocaleTimeString('zh-CN', { hour12: false });
}

/**
 * 日志工具 - 带时间戳和标签
 * @param {string} tag - 日志标签
 * @param {string} level - 日志级别
 * @param  {...any} args - 日志内容
 */
export function log(tag, level, ...args) {
    console[level === 'error' ? 'error' : 'log'](
        `[${formatTime()}] [${tag}] [${level.toUpperCase()}]`,
        ...args
    );
}
