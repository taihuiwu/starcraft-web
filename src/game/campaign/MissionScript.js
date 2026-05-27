// ═══════════════════════════════════════════
// StarCraft Web - 任务脚本系统 (MissionScript)
// 基于时间/事件触发的脚本引擎，支持剧情对话、
// 单位生成、目标更新、条件触发等
// ═══════════════════════════════════════════

import { EVENTS } from '../../shared/Constants.js';
import { eventBus } from '../../shared/EventBus.js';

/**
 * 任务脚本类型定义（参考格式）：
 *
 * { type: 'dialog', speaker: 'Raynor', portrait: 'raynor', text: '...', delay: 0 }
 * { type: 'spawn', unit: 'marine', pos: [10, 20], team: 1, count: 4 }
 * { type: 'objective', text: '消灭所有敌人', condition: 'enemy_eliminated', id: 'obj1' }
 * { type: 'trigger', condition: { type: 'unit_arrived', pos: [50,50], radius: 3 }, then: [...] }
 * { type: 'reinforcement', text: '增援部队到达！', units: [{ type: 'marine', pos: [30,30] }] }
 * { type: 'camera_move', pos: [30, 30], duration: 2 }
 * { type: 'victory_condition', condition: 'all_enemies_dead' }
 * { type: 'timer', duration: 300, then: [...] }
 * { type: 'wait', seconds: 5 }
 * { type: 'remove_units', team: 2, unitType: 'zergling' }
 * { type: 'set_flag', flag: 'bunker_destroyed', value: true }
 * { type: 'conditional', flag: 'bunker_destroyed', then: [...], else: [...] }
 */

export default class MissionScript {
  /**
   * @param {import('../GameManager.js').default} gameManager - 游戏管理器引用
   */
  constructor(gameManager) {
    /** @type {import('../GameManager.js').default} */
    this.gameManager = gameManager;

    /** @type {Array} 当前任务的完整脚本动作列表 */
    this.actions = [];

    /** @type {number} 当前执行到的脚本索引 */
    this.currentIndex = 0;

    /** @type {number} 已经过的游戏时间（秒） */
    this.elapsedTime = 0;

    /** @type {boolean} 脚本是否已完成（所有动作执行完毕或胜利/失败） */
    this.finished = false;

    /** @type {boolean} 脚本是否已暂停（用于对话等需要暂停逻辑的场景） */
    this.paused = false;

    /** @type {Map<string, boolean>} 自定义标记/旗帜，用于条件分支 */
    this.flags = new Map();

    /** @type {Array} 待执行的条件触发器列表 */
    this.triggers = [];

    /** @type {Array} 当前活跃的任务目标 */
    this.objectives = [];

    /** @type {Array} 胜利条件列表 */
    this.victoryConditions = [];

    /** @type {Array} 失败条件列表 */
    this.defeatConditions = [];

    /** @type {Array} 已触发的脚本索引（用于一次性触发器去重） */
    this.triggeredSet = new Set();

    /** @type {Array} 等待队列（用于wait类型的延迟执行） */
    this.waitQueue = [];

    /** @type {Function|null} 对话回调（UI层注入，用于显示对话框） */
    this.onDialog = null;

    /** @type {Function|null} 相机移动回调（UI层注入） */
    this.onCameraMove = null;

    /** @type {Function|null} 目标更新回调（UI层注入） */
    this.onObjectiveUpdate = null;

    /** @type {Function|null} 任务完成回调 */
    this.onMissionComplete = null;

    /** @type {Function|null} 任务失败回调 */
    this.onMissionFail = null;

    // ─── 注册事件监听 ─────────────────────
    this._initEventListeners();
  }

  /**
   * 初始化事件监听器
   * 监听游戏内的关键事件来触发脚本条件检查
   */
  _initEventListeners() {
    // 单位死亡事件 —— 用于检查"消灭所有敌人"等目标
    eventBus.on(EVENTS.UNIT_DIED, (data) => {
      this._onUnitDied(data);
    });

    // 建筑完成事件 —— 用于检查建筑相关目标
    eventBus.on(EVENTS.BUILD_COMPLETE, (data) => {
      this._onBuildingComplete(data);
    });

    // 建筑被毁事件
    eventBus.on(EVENTS.BUILD_CANCELLED, (data) => {
      this._onBuildingDestroyed(data);
    });

    // 资源变化事件 —— 用于检查资源收集目标
    eventBus.on(EVENTS.RESOURCE_CHANGED, (data) => {
      this._onResourceChanged(data);
    });
  }

  /**
   * 加载并初始化任务脚本
   * @param {Array} scriptActions - 脚本动作数组
   */
  load(scriptActions) {
    this.actions = scriptActions || [];
    this.currentIndex = 0;
    this.elapsedTime = 0;
    this.finished = false;
    this.paused = false;
    this.flags.clear();
    this.triggers = [];
    this.objectives = [];
    this.victoryConditions = [];
    this.defeatConditions = [];
    this.triggeredSet.clear();
    this.waitQueue = [];

    console.log(`[MissionScript] 加载脚本，共${this.actions.length}个动作`);
  }

  /**
   * 每帧更新脚本逻辑
   * @param {number} dt - 帧间隔时间（秒）
   */
  update(dt) {
    if (this.finished || this.paused) return;

    this.elapsedTime += dt;

    // ─── 处理等待队列 ─────────────────────
    this._processWaitQueue(dt);

    // ─── 处理定时触发器 ───────────────────
    this._processTimedTriggers();

    // ─── 执行顺序动作 ─────────────────────
    this._processSequentialActions();

    // ─── 检查条件触发器 ───────────────────
    this._processConditionalTriggers();

    // ─── 检查胜利/失败条件 ─────────────────
    this._checkVictoryConditions();
    this._checkDefeatConditions();
  }

  /**
   * 处理等待队列中的延迟动作
   * @param {number} dt - 帧间隔时间
   */
  _processWaitQueue(dt) {
    for (let i = this.waitQueue.length - 1; i >= 0; i--) {
      const entry = this.waitQueue[i];
      entry.remaining -= dt;
      if (entry.remaining <= 0) {
        // 等待结束，执行后续动作
        this._executeActionSequence(entry.thenActions);
        this.waitQueue.splice(i, 1);
      }
    }
  }

  /**
   * 处理定时触发器（time_elapsed类型）
   */
  _processTimedTriggers() {
    for (let i = this.triggers.length - 1; i >= 0; i--) {
      const trigger = this.triggers[i];
      if (trigger.triggered) continue;

      if (trigger.conditionType === 'time_elapsed') {
        if (this.elapsedTime >= trigger.conditionValue) {
          trigger.triggered = true;
          this._executeActionSequence(trigger.thenActions);
          // 移除一次性触发器
          if (!trigger.repeatable) {
            this.triggers.splice(i, 1);
          } else {
            trigger.triggered = false;
          }
        }
      }
    }
  }

  /**
   * 执行顺序脚本动作（从currentIndex开始，遇到wait或dialog则暂停）
   */
  _processSequentialActions() {
    while (this.currentIndex < this.actions.length) {
      const action = this.actions[this.currentIndex];
      this.currentIndex++;

      // 根据动作类型分发处理
      switch (action.type) {
        case 'dialog':
          this._executeDialog(action);
          return; // 对话执行后暂停顺序执行

        case 'spawn':
          this._executeSpawn(action);
          break;

        case 'objective':
          this._executeObjective(action);
          break;

        case 'victory_condition':
          this._addVictoryCondition(action);
          break;

        case 'defeat_condition':
          this._addDefeatCondition(action);
          break;

        case 'trigger':
          this._executeTrigger(action);
          break;

        case 'reinforcement':
          this._executeReinforcement(action);
          break;

        case 'camera_move':
          this._executeCameraMove(action);
          break;

        case 'timer':
          this._executeTimer(action);
          return; // 定时器创建后暂停顺序执行

        case 'wait':
          this._executeWait(action);
          return; // 等待后暂停顺序执行

        case 'set_flag':
          this.flags.set(action.flag, action.value);
          break;

        case 'conditional':
          this._executeConditional(action);
          break;

        case 'remove_units':
          this._executeRemoveUnits(action);
          break;

        case 'set_reinforcements':
          this._executeSetReinforcements(action);
          break;

        case 'log':
          console.log(`[MissionScript] ${action.text || ''}`);
          break;

        default:
          console.warn(`[MissionScript] 未知动作类型: ${action.type}`);
      }
    }
  }

  /**
   * 处理条件触发器（需要在每帧检查的trigger）
   */
  _processConditionalTriggers() {
    for (let i = this.triggers.length - 1; i >= 0; i--) {
      const trigger = this.triggers[i];
      if (trigger.triggered && !trigger.repeatable) continue;
      if (trigger.conditionType === 'time_elapsed') continue; // 已在定时触发器中处理

      // 检查条件是否满足
      if (this._checkCondition(trigger.condition)) {
        if (!trigger.repeatable) {
          trigger.triggered = true;
        }
        this._executeActionSequence(trigger.thenActions);
        if (!trigger.repeatable) {
          this.triggers.splice(i, 1);
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 动作执行器
  // ═══════════════════════════════════════

  /**
   * 执行对话动作 —— 暂停脚本并显示对话
   * @param {Object} action - { type:'dialog', speaker, portrait, text }
   */
  _executeDialog(action) {
    if (this.onDialog) {
      this.onDialog({
        speaker: action.speaker || '???',
        portrait: action.portrait || 'unknown',
        text: action.text || '',
        onComplete: () => {
          // 对话完成后的回调：如果有then动作则执行
          if (action.then) {
            this._executeActionSequence(action.then);
          }
        },
      });
    }
    // 发射对话事件，UI层可以监听
    eventBus.emit('mission:dialog', {
      speaker: action.speaker,
      portrait: action.portrait,
      text: action.text,
    });
  }

  /**
   * 执行生成单位动作
   * @param {Object} action - { type:'spawn', unit, pos, team, count, facing }
   */
  _executeSpawn(action) {
    const gm = this.gameManager;
    // 从种族数据获取单位定义
    const unitDef = gm._getUnitDef?.(action.unit) || this._resolveUnitDef(action.unit, action.race);
    if (!unitDef) {
      console.warn(`[MissionScript] 找不到单位定义: ${action.unit}`);
      return;
    }

    const count = action.count || 1;
    const pos = action.pos || [0, 0];
    const team = action.team || 1;

    for (let i = 0; i < count; i++) {
      // 在指定位置附近随机偏移，避免单位重叠
      const offsetX = pos[0] + (Math.random() - 0.5) * count * 0.5;
      const offsetZ = pos[1] + (Math.random() - 0.5) * count * 0.5;
      const unit = gm.spawnUnit(unitDef, { x: offsetX, y: 0, z: offsetZ }, team);
      if (action.facing !== undefined) {
        unit.facing = action.facing;
      }
    }

    console.log(`[MissionScript] 生成${count}个${action.unit} (队伍${team})`);
  }

  /**
   * 执行目标设置动作
   * @param {Object} action - { type:'objective', text, condition, id, optional }
   */
  _executeObjective(action) {
    const objective = {
      id: action.id || `obj_${Date.now()}`,
      text: action.text || '',
      condition: action.condition || null,
      conditionParams: action.conditionParams || {},
      optional: action.optional || false,    // 是否可选目标
      completed: false,
      startTime: this.elapsedTime,
    };

    this.objectives.push(objective);

    // 通知UI更新目标显示
    if (this.onObjectiveUpdate) {
      this.onObjectiveUpdate(this.objectives);
    }

    eventBus.emit('mission:objective_added', { objective });
    console.log(`[MissionScript] 新增目标: ${objective.text}`);
  }

  /**
   * 添加胜利条件
   * @param {Object} action - { type:'victory_condition', condition, params }
   */
  _addVictoryCondition(action) {
    this.victoryConditions.push({
      condition: action.condition,
      params: action.params || {},
    });
  }

  /**
   * 添加失败条件
   * @param {Object} action - { type:'defeat_condition', condition, params }
   */
  _addDefeatCondition(action) {
    this.defeatConditions.push({
      condition: action.condition,
      params: action.params || {},
    });
  }

  /**
   * 注册条件触发器
   * @param {Object} action - { type:'trigger', condition, then, repeatable }
   */
  _executeTrigger(action) {
    this.triggers.push({
      condition: action.condition,
      thenActions: action.then || [],
      triggered: false,
      repeatable: action.repeatable || false,
      conditionType: action.condition?.type,
      conditionValue: action.condition?.value,
    });
  }

  /**
   * 执行增援部队动作
   * @param {Object} action - { type:'reinforcement', text, units, delay }
   */
  _executeReinforcement(action) {
    // 显示增援提示
    if (action.text) {
      eventBus.emit('mission:reinforcement', { text: action.text });
    }

    // 生成增援单位
    if (action.units && Array.isArray(action.units)) {
      for (const unitInfo of action.units) {
        const unitDef = this._resolveUnitDef(unitInfo.type, unitInfo.race);
        if (unitDef) {
          this.gameManager.spawnUnit(
            unitDef,
            { x: unitInfo.pos[0], y: 0, z: unitInfo.pos[1] },
            unitInfo.team || 1
          );
        }
      }
    }
  }

  /**
   * 执行相机移动动作
   * @param {Object} action - { type:'camera_move', pos, duration }
   */
  _executeCameraMove(action) {
    if (this.onCameraMove) {
      this.onCameraMove({
        pos: action.pos || [0, 0],
        duration: action.duration || 2,
      });
    }
    eventBus.emit(EVENTS.CAMERA_MOVE, {
      x: action.pos?.[0] || 0,
      z: action.pos?.[1] || 0,
      duration: action.duration || 2,
    });
  }

  /**
   * 执行定时器动作 —— 在指定时间后执行后续动作
   * @param {Object} action - { type:'timer', duration, then }
   */
  _executeTimer(action) {
    if (action.then && action.then.length > 0) {
      this.triggers.push({
        conditionType: 'time_elapsed',
        conditionValue: this.elapsedTime + (action.duration || 0),
        thenActions: action.then,
        triggered: false,
        repeatable: false,
      });
    }
  }

  /**
   * 执行等待动作
   * @param {Object} action - { type:'wait', seconds, then }
   */
  _executeWait(action) {
    this.waitQueue.push({
      remaining: action.seconds || 1,
      thenActions: action.then || [],
    });
  }

  /**
   * 执行条件分支动作
   * @param {Object} action - { type:'conditional', flag, then, else }
   */
  _executeConditional(action) {
    const flagValue = this.flags.get(action.flag);
    if (flagValue) {
      this._executeActionSequence(action.then || []);
    } else {
      this._executeActionSequence(action.else || []);
    }
  }

  /**
   * 执行移除单位动作
   * @param {Object} action - { type:'remove_units', team, unitType, all }
   */
  _executeRemoveUnits(action) {
    const gm = this.gameManager;
    const toRemove = gm.units.filter((u) => {
      if (!u.alive) return false;
      if (action.team !== undefined && u.team !== action.team) return false;
      if (action.unitType && u.type !== action.unitType) return false;
      return true;
    });

    for (const unit of toRemove) {
      unit.alive = false;
      unit.hp = 0;
    }

    console.log(`[MissionScript] 移除了${toRemove.length}个单位`);
  }

  /**
   * 执行批量增援设置
   * @param {Object} action - { type:'set_reinforcements', units }
   */
  _executeSetReinforcements(action) {
    if (action.units) {
      this.flags.set('reinforcements', action.units);
    }
  }

  /**
   * 执行一组动作序列
   * @param {Array} actions - 动作数组
   */
  _executeActionSequence(actions) {
    if (!actions || !Array.isArray(actions)) return;

    // 保存当前索引，执行完恢复
    const savedIndex = this.currentIndex;
    const savedActions = this.actions;

    this.actions = actions;
    this.currentIndex = 0;

    this._processSequentialActions();

    // 恢复原始状态
    this.actions = savedActions;
    this.currentIndex = savedIndex;
  }

  // ═══════════════════════════════════════
  // 条件检查器
  // ═══════════════════════════════════════

  /**
   * 通用条件检查入口
   * @param {Object} condition - 条件描述
   * @returns {boolean} 条件是否满足
   */
  _checkCondition(condition) {
    if (!condition) return false;

    switch (condition.type) {
      case 'unit_arrived':
        return this._checkUnitArrived(condition);
      case 'enemy_eliminated':
        return this._checkEnemyEliminated(condition);
      case 'building_destroyed':
        return this._checkBuildingDestroyed(condition);
      case 'building_completed':
        return this._checkBuildingCompleted(condition);
      case 'time_elapsed':
        return this._checkTimeElapsed(condition);
      case 'resource_collected':
        return this._checkResourceCollected(condition);
      case 'unit_count':
        return this._checkUnitCount(condition);
      case 'flag_set':
        return this.flags.get(condition.flag) === (condition.value !== undefined ? condition.value : true);
      default:
        return false;
    }
  }

  /**
   * 检查：是否有指定队伍的单位到达目标位置附近
   * @param {Object} condition - { type:'unit_arrived', pos:[x,z], radius, team }
   * @returns {boolean}
   */
  _checkUnitArrived(condition) {
    const pos = { x: condition.pos[0], y: 0, z: condition.pos[1] };
    const radius = condition.radius || 3;
    const team = condition.team || 1;

    const units = this.gameManager.getUnitsInRadius(pos, radius, team);
    return units.length > 0;
  }

  /**
   * 检查：指定队伍的敌人是否已被全部消灭
   * @param {Object} condition - { type:'enemy_eliminated', enemyTeam }
   * @returns {boolean}
   */
  _checkEnemyEliminated(condition) {
    const enemyTeam = condition.enemyTeam || 2;
    const aliveEnemies = this.gameManager.units.filter(
      (u) => u.alive && u.team === enemyTeam
    );
    return aliveEnemies.length === 0;
  }

  /**
   * 检查：指定建筑是否被摧毁
   * @param {Object} condition - { type:'building_destroyed', buildingType, team }
   * @returns {boolean}
   */
  _checkBuildingDestroyed(condition) {
    const team = condition.team || 2;
    const buildings = this.gameManager.buildings.filter(
      (b) => b.alive && b.team === team && (!condition.buildingType || b.type === condition.buildingType)
    );
    return buildings.length === 0;
  }

  /**
   * 检查：指定建筑是否建造完成
   * @param {Object} condition - { type:'building_completed', buildingType, team }
   * @returns {boolean}
   */
  _checkBuildingCompleted(condition) {
    const team = condition.team || 1;
    const buildings = this.gameManager.buildings.filter(
      (b) =>
        b.alive &&
        b.team === team &&
        b.isComplete &&
        (!condition.buildingType || b.type === condition.buildingType)
    );
    return buildings.length > 0;
  }

  /**
   * 检查：游戏时间是否达到指定值
   * @param {Object} condition - { type:'time_elapsed', seconds }
   * @returns {boolean}
   */
  _checkTimeElapsed(condition) {
    return this.elapsedTime >= (condition.seconds || 0);
  }

  /**
   * 检查：资源是否达到指定数量
   * @param {Object} condition - { type:'resource_collected', resource, amount }
   * @returns {boolean}
   */
  _checkResourceCollected(condition) {
    const rm = this.gameManager.resourceManager;
    const resource = condition.resource || 'minerals';
    const amount = condition.amount || 0;

    const current = rm.getResource?.(condition.team || 1, resource) ||
                    rm.resources?.[condition.team || 1]?.[resource] || 0;
    return current >= amount;
  }

  /**
   * 检查：指定队伍的某种单位数量是否达到要求
   * @param {Object} condition - { type:'unit_count', unitType, team, minCount }
   * @returns {boolean}
   */
  _checkUnitCount(condition) {
    const team = condition.team || 1;
    const count = this.gameManager.units.filter(
      (u) => u.alive && u.team === team && (!condition.unitType || u.type === condition.unitType)
    ).length;
    return count >= (condition.minCount || 0);
  }

  // ═══════════════════════════════════════
  // 事件处理
  // ═══════════════════════════════════════

  /**
   * 单位死亡事件处理
   * @param {Object} data - { unit, killer }
   */
  _onUnitDied(data) {
    // 检查"敌人全灭"类目标
    this._updateObjectivesOnEvent('enemy_eliminated');

    // 检查单位计数类目标
    this._updateObjectivesOnEvent('unit_count');
  }

  /**
   * 建筑完成事件处理
   */
  _onBuildingComplete(data) {
    this._updateObjectivesOnEvent('building_completed');
  }

  /**
   * 建筑被毁事件处理
   */
  _onBuildingDestroyed(data) {
    this._updateObjectivesOnEvent('building_destroyed');
  }

  /**
   * 资源变化事件处理
   */
  _onResourceChanged(data) {
    this._updateObjectivesOnEvent('resource_collected');
  }

  /**
   * 事件发生后更新目标状态
   * @param {string} eventType - 事件类型
   */
  _updateObjectivesOnEvent(eventType) {
    for (const obj of this.objectives) {
      if (obj.completed) continue;
      if (obj.condition === eventType) {
        if (this._checkCondition({ type: obj.condition, ...obj.conditionParams })) {
          obj.completed = true;
          eventBus.emit('mission:objective_completed', { objective: obj });
          console.log(`[MissionScript] 目标完成: ${obj.text}`);

          if (this.onObjectiveUpdate) {
            this.onObjectiveUpdate(this.objectives);
          }
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 胜利/失败条件检查
  // ═══════════════════════════════════════

  /**
   * 检查胜利条件
   */
  _checkVictoryConditions() {
    if (this.victoryConditions.length === 0) return;

    for (const vc of this.victoryConditions) {
      if (this._checkCondition({ type: vc.condition, ...vc.params })) {
        this.finished = true;
        console.log('[MissionScript] ✅ 胜利条件满足！');
        eventBus.emit('mission:victory', {});
        if (this.onMissionComplete) {
          this.onMissionComplete();
        }
        return;
      }
    }
  }

  /**
   * 检查失败条件
   */
  _checkDefeatConditions() {
    if (this.defeatConditions.length === 0) return;

    for (const dc of this.defeatConditions) {
      if (this._checkCondition({ type: dc.condition, ...dc.params })) {
        this.finished = true;
        console.log('[MissionScript] ❌ 失败条件触发！');
        eventBus.emit('mission:defeat', {});
        if (this.onMissionFail) {
          this.onMissionFail();
        }
        return;
      }
    }
  }

  // ═══════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════

  /**
   * 通过单位ID和种族解析单位定义
   * @param {string} unitId - 单位ID（如'marine'）
   * @param {string} race - 种族
   * @returns {Object|null} 单位定义
   */
  _resolveUnitDef(unitId, race) {
    // 尝试从GameManager获取单位定义
    const gm = this.gameManager;
    if (gm._raceData) {
      const raceUnits = gm._raceData.units;
      if (raceUnits && raceUnits[unitId]) {
        return raceUnits[unitId];
      }
    }

    // 回退：返回基础模板（实际项目中应从完整数据中获取）
    return {
      id: unitId,
      name: unitId,
      race: race || 'terran',
      hp: 40,
      shield: 0,
      armor: 0,
      attack: null,
      speed: 2,
      cost: { minerals: 50, gas: 0, supply: 1 },
    };
  }

  /**
   * 设置标记（供外部调用）
   * @param {string} flag - 标记名
   * @param {*} value - 标记值
   */
  setFlag(flag, value = true) {
    this.flags.set(flag, value);
  }

  /**
   * 获取标记值
   * @param {string} flag - 标记名
   * @returns {*}
   */
  getFlag(flag) {
    return this.flags.get(flag);
  }

  /**
   * 继续脚本执行（对话完成后调用）
   */
  continue() {
    this.paused = false;
  }

  /**
   * 重置脚本系统
   */
  reset() {
    this.actions = [];
    this.currentIndex = 0;
    this.elapsedTime = 0;
    this.finished = false;
    this.paused = false;
    this.flags.clear();
    this.triggers = [];
    this.objectives = [];
    this.victoryConditions = [];
    this.defeatConditions = [];
    this.triggeredSet.clear();
    this.waitQueue = [];
  }
}
