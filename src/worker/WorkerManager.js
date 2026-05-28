// ═══════════════════════════════════════════════════════════════
// StarCraft Web - WebWorker 线程池管理器
// Worker 线程池管理 + 任务队列 + 负载均衡 (round-robin)
// ═══════════════════════════════════════════════════════════════

/**
 * WebWorker 线程池管理器
 * 管理一组 Worker 线程，通过 round-robin 负载均衡分配任务，
 * 支持任务队列和结果回调。
 */
export class WorkerManager {
  /**
   * @param {string} workerScript - Worker 脚本路径（相对于 HTML 或完整 URL）
   * @param {number} [poolSize=4] - Worker 线程池大小
   */
  constructor(workerScript, poolSize = 4) {
    /** @type {string} Worker 脚本路径 */
    this._workerScript = workerScript;

    /** @type {number} 线程池大小 */
    this._poolSize = poolSize;

    /**
     * Worker 实例池
     * @type {Array<{ worker: Worker, busy: boolean, taskId: number | null }>}
     */
    this._workers = [];

    /**
     * 任务 ID 自增计数器
     * @type {number}
     */
    this._nextTaskId = 1;

    /**
     * 待处理任务队列
     * @type {Array<{ id: number, type: string, data: any, callback: function, errorCallback: function }>}
     */
    this._taskQueue = [];

    /**
     * 活跃任务映射：taskId → { type, data, callback, errorCallback, workerIndex }
     * @type {Map<number, object>}
     */
    this._activeTasks = new Map();

    /**
     * Round-robin 计数器
     * @type {number}
     */
    this._roundRobinIndex = 0;

    /**
     /** @type {boolean}
      * 是否已销毁
      */
     this._disposed = false;

     /**
      * 最后一次发送给 Worker 的游戏状态（用于 Worker 重启后恢复）
      * @type {{ type: string, data: any } | null}
      */
     this._lastSentState = null;

    // 初始化 Worker 池
    this._initPool();
  }

  /**
   * 初始化 Worker 线程池
   * @private
   */
  _initPool() {
    for (let i = 0; i < this._poolSize; i++) {
      this._createWorker(i);
    }
  }

  /**
   * 创建单个 Worker 并绑定消息/错误处理器
   * @param {number} index - Worker 在池中的索引
   * @private
   */
  _createWorker(index) {
    try {
      const worker = new Worker(this._workerScript, { type: 'module' });
      const workerEntry = { worker, busy: false, taskId: null };

      worker.onmessage = (event) => {
        this._onWorkerMessage(index, event);
      };

      worker.onerror = (error) => {
        this._onWorkerError(index, error);
      };

      this._workers[index] = workerEntry;
    } catch (_e) {
      // Worker 不可用的环境（如 Node.js），创建占位对象
      this._workers[index] = { worker: null, busy: false, taskId: null };
    }
  }

  /**
   * 处理 Worker 返回的消息
   * @param {number} workerIndex
   * @param {MessageEvent} event
   * @private
   */
  _onWorkerMessage(workerIndex, event) {
    const entry = this._workers[workerIndex];
    if (!entry || entry.taskId === null) return;

    const taskId = entry.taskId;
    const task = this._activeTasks.get(taskId);

    if (task) {
      // 调用回调
      if (typeof task.callback === 'function') {
        task.callback(event.data);
      }
      this._activeTasks.delete(taskId);
    }

    // 标记 Worker 空闲
    entry.busy = false;
    entry.taskId = null;

    // 处理队列中的下一个任务
    this._processQueue();
  }

  /**
   * 处理 Worker 错误
   * @param {number} workerIndex
   * @param {ErrorEvent} error
   * @private
   */
  _onWorkerError(workerIndex, error) {
    const entry = this._workers[workerIndex];
    if (!entry || entry.taskId === null) return;

    const taskId = entry.taskId;
    const task = this._activeTasks.get(taskId);

    if (task) {
      if (typeof task.errorCallback === 'function') {
        task.errorCallback(error);
      } else {
        console.error(`[WorkerManager] Worker ${workerIndex} 任务 ${taskId} 失败:`, error);
      }
      this._activeTasks.delete(taskId);
    }

    // 标记 Worker 空闲并尝试重启
    entry.busy = false;
    entry.taskId = null;

    // 销毁出错的 Worker 并创建新的
    try {
      entry.worker.terminate();
    } catch (_e) { /* 忽略 */ }
    this._createWorker(workerIndex);

    // 恢复 Worker 状态：将最后已知的游戏状态发送给新 Worker
    this._restoreState(workerIndex);

    this._processQueue();
  }

  /**
   * 执行一个任务
   * @param {string} task - 任务类型标识
   * @param {any} data - 任务数据（将通过 postMessage 传递）
   * @returns {Promise<any>} 任务结果的 Promise
   */
  execute(task, data) {
    return new Promise((resolve, reject) => {
      if (this._disposed) {
        reject(new Error('[WorkerManager] WorkerManager 已销毁'));
        return;
      }

      const taskId = this._nextTaskId++;
      const taskEntry = {
        id: taskId,
        type: task,
        data,
        callback: resolve,
        errorCallback: reject,
      };

      // 尝试立即分配给空闲 Worker
      if (!this._assignTask(taskEntry)) {
        // 无空闲 Worker，放入队列
        this._taskQueue.push(taskEntry);
      }
    });
  }

  /**
   * 尝试将任务分配给一个空闲 Worker（round-robin）
   * @param {object} taskEntry - 任务条目
   * @returns {boolean} 是否成功分配
   * @private
   */
  _assignTask(taskEntry) {
    // 使用 round-robin 查找空闲 Worker
    for (let i = 0; i < this._poolSize; i++) {
      const idx = (this._roundRobinIndex + i) % this._poolSize;
      const entry = this._workers[idx];

      if (!entry.busy && entry.worker) {
        entry.busy = true;
        entry.taskId = taskEntry.id;

        this._activeTasks.set(taskEntry.id, {
          ...taskEntry,
          workerIndex: idx,
        });

        // 记录最后一次发送的状态（用于 Worker 重启恢复）
        this._lastSentState = { type: taskEntry.type, data: taskEntry.data };

        // 发送消息给 Worker
        entry.worker.postMessage({
          type: taskEntry.type,
          data: taskEntry.data,
          taskId: taskEntry.id,
        });

        this._roundRobinIndex = (idx + 1) % this._poolSize;
        return true;
      }
    }
    return false;
  }

  /**
   * 处理待处理任务队列
   * @private
   */
  _processQueue() {
    while (this._taskQueue.length > 0) {
      const nextTask = this._taskQueue[0];
      if (this._assignTask(nextTask)) {
        this._taskQueue.shift();
      } else {
        break; // 没有空闲 Worker，等待
      }
    }
  }

  /**
   * 销毁所有 Worker 并清空队列
   */
  dispose() {
    this._disposed = true;

    // 销毁所有 Worker
    for (let i = 0; i < this._workers.length; i++) {
      const entry = this._workers[i];
      if (entry && entry.worker) {
        try {
          entry.worker.terminate();
        } catch (_e) { /* 忽略 */ }
      }
    }

    // 拒绝所有待处理任务
    for (const task of this._taskQueue) {
      if (typeof task.errorCallback === 'function') {
        task.errorCallback(new Error('[WorkerManager] WorkerManager 已销毁'));
      }
    }

    // 拒绝所有活跃任务
    for (const [, task] of this._activeTasks) {
      if (typeof task.errorCallback === 'function') {
        task.errorCallback(new Error('[WorkerManager] WorkerManager 已销毁'));
      }
    }

    this._workers.length = 0;
    this._taskQueue.length = 0;
    this._activeTasks.clear();
  }

  /**
   * 获取线程池大小
   * @returns {number}
   */
  getPoolSize() {
    return this._poolSize;
  }

  /**
   * 获取当前待处理任务数（队列中 + 活跃中）
   * @returns {number}
   */
  getPendingTasks() {
    return this._taskQueue.length + this._activeTasks.size;
  }

  /**
   * 获取队列中等待的任务数
   * @returns {number}
   */
  getQueuedTasks() {
    return this._taskQueue.length;
  }

  /**
   * 获取当前空闲 Worker 数
   * @returns {number}
   */
  getAvailableWorkers() {
    let count = 0;
    for (const entry of this._workers) {
      if (entry && !entry.busy) count++;
    }
    return count;
  }

  /**
   * 将最后已知的游戏状态恢复到指定 Worker（Worker 重启后调用）
   * @param {number} workerIndex - 新重启的 Worker 索引
   * @private
   */
  _restoreState(workerIndex) {
    if (!this._lastSentState) return;

    const entry = this._workers[workerIndex];
    if (!entry || !entry.worker) return;

    try {
      entry.worker.postMessage({
        type: 'restore_state',
        data: this._lastSentState.data,
        taskId: -1, // 恢复消息不占用任务 ID
      });
    } catch (_e) { /* Worker 不可用时忽略 */ }
  }
}

export default WorkerManager;
