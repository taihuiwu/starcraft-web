// ═══════════════════════════════════════════
// StarCraft Web - 命令系统 (CommandSystem)
// 处理所有单位命令：移动、攻击、停止、驻守、
// 巡逻、建造、采集等，支持Shift命令队列
// ═══════════════════════════════════════════

import { COMMAND, EVENTS } from '../shared/Constants.js';
import { eventBus } from '../shared/EventBus.js';

export default class CommandSystem {
  /**
   * @param {import('./GameManager.js').default} gameManager
   */
  constructor(gameManager) {
    /** @type {import('./GameManager.js').default} */
    this.gameManager = gameManager;

    /** @type {boolean} 是否按住Shift（命令排队） */
    this.shiftHeld = false;

    // ─── 注册输入事件 ──────────────────
    this._bindEvents();
  }

  /**
   * 绑定键盘事件以检测Shift状态
   */
  _bindEvents() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') this.shiftHeld = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.shiftHeld = false;
    });

    console.log('[CommandSystem] 事件绑定完成');
  }

  // ═══════════════════════════════════════
  // 命令下达（核心接口）
  // ═══════════════════════════════════════

  /**
   * 向一组单位下达命令
   * 如果Shift按下，命令加入队列末尾
   * @param {Array} units - 接收命令的单位数组
   * @param {string} commandType - 命令类型（COMMAND枚举值）
   * @param {Object} target - 命令目标（位置、单位ID、建筑类型等）
   * @returns {boolean} 命令是否成功下达
   */
  issueCommand(units, commandType, target = null) {
    if (!units || units.length === 0) return false;

    for (const unit of units) {
      if (!unit.alive) continue;

      const command = {
        type: commandType,
        target,
        timestamp: Date.now(),
      };

      if (this.shiftHeld) {
        // Shift排队：追加到命令队列末尾
        unit.commandQueue.push(command);
      } else {
        // 普通命令：清空队列，立即执行
        unit.commandQueue = [command];
        unit.currentCommand = command;
      }
    }

    // 通知命令已下达
    eventBus.emit(EVENTS.COMMAND_ISSUED, {
      units: units.map(u => u.id),
      commandType,
      target,
      queued: this.shiftHeld,
    });

    return true;
  }

  // ═══════════════════════════════════════
  // 具体命令类型
  // ═══════════════════════════════════════

  /**
   * 移动命令 - 让单位移动到指定位置
   * @param {Array} units - 单位数组
   * @param {Object} position - 目标位置 {x, y, z}
   * @returns {boolean}
   */
  moveCommand(units, position) {
    return this.issueCommand(units, COMMAND.MOVE, { position: { ...position } });
  }

  /**
   * 攻击命令 - 让单位攻击指定目标或移动到目标位置并攻击
   * @param {Array} units - 单位数组
   * @param {Object|number} target - 攻击目标（单位/建筑对象 或 位置{position}）
   * @returns {boolean}
   */
  attackCommand(units, target) {
    if (typeof target === 'number') {
      // target是单位ID
      return this.issueCommand(units, COMMAND.ATTACK, { targetId: target });
    }
    return this.issueCommand(units, COMMAND.ATTACK, { position: { ...target } });
  }

  /**
   * 攻击移动 - 移动到目标位置，途中遇到敌人自动攻击
   * @param {Array} units
   * @param {Object} position - 目标位置
   * @returns {boolean}
   */
  attackMoveCommand(units, position) {
    return this.issueCommand(units, COMMAND.ATTACK, {
      position: { ...position },
      attackMove: true,
    });
  }

  /**
   * 停止命令 - 立即停止当前所有动作
   * @param {Array} units
   * @returns {boolean}
   */
  stopCommand(units) {
    for (const unit of units) {
      if (!unit.alive) continue;
      unit.commandQueue = [];
      unit.currentCommand = { type: COMMAND.STOP };
      unit.targetPosition = null;
      unit.attackTarget = null;
      unit.velocity = { x: 0, y: 0, z: 0 };
    }
    return true;
  }

  /**
   * 驻守命令 - 单位停留在当前位置，自动攻击进入射程的敌人
   * @param {Array} units
   * @returns {boolean}
   */
  holdCommand(units) {
    for (const unit of units) {
      if (!unit.alive) continue;
      unit.commandQueue = [];
      unit.currentCommand = { type: COMMAND.HOLD };
      unit.targetPosition = { ...unit.position }; // 驻守在当前位置
      unit.attackTarget = null;
    }
    return true;
  }

  /**
   * 巡逻命令 - 在当前位置和目标位置之间来回移动
   * @param {Array} units
   * @param {Object} position - 巡逻目标点
   * @returns {boolean}
   */
  patrolCommand(units, position) {
    for (const unit of units) {
      if (!unit.alive) continue;
      unit.commandQueue = [];
      unit.currentCommand = {
        type: COMMAND.PATROL,
        patrolTarget: { ...position },
        patrolOrigin: { ...unit.position },
        atOrigin: true, // 当前是否在起点
      };
    }
    return true;
  }

  /**
   * 建造命令 - 让工程兵去建造建筑
   * @param {Array} units - 单位数组（应该是工程兵）
   * @param {string} buildingType - 建筑类型ID
   * @param {Object} position - 建筑位置
   * @returns {boolean}
   */
  buildCommand(units, buildingType, position) {
    return this.issueCommand(units, COMMAND.BUILD, {
      buildingType,
      position: { ...position },
    });
  }

  /**
   * 采集命令 - 让工人去采集资源
   * @param {Array} units - 单位数组（应该是工人）
   * @param {Object} resourceTarget - 资源点 { patchId: number, type: 'minerals'|'gas' }
   * @returns {boolean}
   */
  gatherCommand(units, resourceTarget) {
    return this.issueCommand(units, COMMAND.GATHER, resourceTarget);
  }

  /**
   * 返回货运命令 - 满载的工人返回基地卸货
   * @param {Array} units
   * @param {number} baseId - 基地建筑ID
   * @returns {boolean}
   */
  returnCargoCommand(units, baseId) {
    return this.issueCommand(units, COMMAND.RETURN_CARGO, { baseId });
  }

  /**
   * 集结点命令 - 设置建筑的集结点
   * @param {Object} building - 建筑实例
   * @param {Object} position - 集结点位置
   */
  rallyCommand(building, position) {
    building.rallyPoint = { ...position };
  }

  // ═══════════════════════════════════════
  // 命令执行（每tick由GameManager调用）
  // ═══════════════════════════════════════

  /**
   * 更新所有单位的命令执行状态
   * @param {number} delta - tick间隔
   */
  update(delta) {
    const gm = this.gameManager;

    for (const unit of gm.units) {
      if (!unit.alive || !unit.currentCommand) continue;

      const cmd = unit.currentCommand;

      switch (cmd.type) {
        case COMMAND.MOVE:
          this._executeMove(unit, delta);
          break;
        case COMMAND.ATTACK:
          this._executeAttack(unit, delta);
          break;
        case COMMAND.HOLD:
          this._executeHold(unit, delta);
          break;
        case COMMAND.PATROL:
          this._executePatrol(unit, delta);
          break;
        case COMMAND.GATHER:
          this._executeGather(unit, delta);
          break;
        case COMMAND.STOP:
          // 停止不需要持续执行
          break;
        default:
          break;
      }

      // 检查当前命令是否完成
      if (this._isCommandComplete(unit)) {
        this._advanceCommandQueue(unit);
      }
    }
  }

  // ═══════════════════════════════════════
  // 命令执行内部方法
  // ═══════════════════════════════════════

  /**
   * 执行移动命令
   * @param {Object} unit
   * @param {number} delta
  */
  _executeMove(unit, delta) {
    const target = unit.currentCommand.position;
    if (!target) return;

    const dx = target.x - unit.position.x;
    const dz = target.z - unit.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.3) {
      // 到达目标点
      unit.position.x = target.x;
      unit.position.z = target.z;
      unit.velocity = { x: 0, y: 0, z: 0 };
      return;
    }

    // 计算移动方向和速度
    const speed = unit.speed || 2;
    const moveX = (dx / dist) * speed * delta;
    const moveZ = (dz / dist) * speed * delta;

    unit.position.x += moveX;
    unit.position.z += moveZ;
    unit.velocity = { x: moveX / delta, y: 0, z: moveZ / delta };
    unit.facing = Math.atan2(dz, dx);
  }

  /**
   * 执行攻击命令
   * @param {Object} unit
   * @param {number} delta
  */
  _executeAttack(unit, delta) {
    const cmd = unit.currentCommand;
    const gm = this.gameManager;

    // 有明确攻击目标
    if (cmd.targetId) {
      const target = gm.getUnitById(cmd.targetId);
      if (!target || !target.alive) {
        // 目标已死亡，清除命令
        unit.currentCommand = null;
        return;
      }

      // 检查是否在射程内
      const dist = this._distance2D(unit.position, target.position);
      const range = unit.attack ? unit.attack.range : 1;

      if (dist <= range) {
        // 在射程内，停止移动，准备攻击
        unit.velocity = { x: 0, y: 0, z: 0 };
        unit.attackTarget = target.id;
      } else {
        // 不在射程内，朝目标移动
        this._moveTowards(unit, target.position, delta);
      }
    }
    // 攻击移动：朝目标位置移动，途中自动索敌
    else if (cmd.attackMove && cmd.position) {
      // 检查附近是否有敌人
      const nearbyEnemies = gm.getUnitsInRadius(unit.position, (unit.attack?.range || 5) + 2, unit.team === 1 ? 2 : 1);
      if (nearbyEnemies.length > 0) {
        // 发现敌人，锁定最近的
        let closest = nearbyEnemies[0];
        let closestDist = this._distance2D(unit.position, closest.position);
        for (const enemy of nearbyEnemies) {
          const d = this._distance2D(unit.position, enemy.position);
          if (d < closestDist) {
            closestDist = d;
            closest = enemy;
          }
        }
        unit.attackTarget = closest.id;
      } else {
        // 没有敌人，继续移动
        this._moveTowards(unit, cmd.position, delta);
      }
    }
    // 仅移动到位置
    else if (cmd.position) {
      this._moveTowards(unit, cmd.position, delta);
    }
  }

  /**
   * 执行驻守命令（停留在原位，自动攻击射程内敌人）
   * @param {Object} unit
   * @param {number} delta
  */
  _executeHold(unit, delta) {
    const gm = this.gameManager;
    // 搜索附近敌人
    const enemyTeam = unit.team === 1 ? 2 : 1;
    const range = unit.attack ? unit.attack.range : 5;
    const enemies = gm.getUnitsInRadius(unit.position, range, enemyTeam);

    if (enemies.length > 0) {
      let closest = enemies[0];
      let closestDist = this._distance2D(unit.position, closest.position);
      for (const enemy of enemies) {
        const d = this._distance2D(unit.position, enemy.position);
        if (d < closestDist) {
          closestDist = d;
          closest = enemy;
        }
      }
      unit.attackTarget = closest.id;
    }
  }

  /**
   * 执行巡逻命令（在两点之间来回移动）
   * @param {Object} unit
   * @param {number} delta
  */
  _executePatrol(unit, delta) {
    const cmd = unit.currentCommand;
    if (!cmd.patrolTarget || !cmd.patrolOrigin) return;

    // 搜索附近敌人
    const gm = this.gameManager;
    const enemyTeam = unit.team === 1 ? 2 : 1;
    const detectRange = (unit.attack?.range || 5) + 2;
    const enemies = gm.getUnitsInRadius(unit.position, detectRange, enemyTeam);
    if (enemies.length > 0) {
      // 巡逻途中遇到敌人，切换攻击
      let closest = enemies[0];
      let closestDist = this._distance2D(unit.position, closest.position);
      for (const enemy of enemies) {
        const d = this._distance2D(unit.position, enemy.position);
        if (d < closestDist) {
          closestDist = d;
          closest = enemy;
        }
      }
      unit.attackTarget = closest.id;
      return;
    }

    // 在两点间移动
    const target = cmd.atOrigin ? cmd.patrolTarget : cmd.patrolOrigin;
    const dist = this._distance2D(unit.position, target);

    if (dist < 0.5) {
      // 到达目标点，反转方向
      cmd.atOrigin = !cmd.atOrigin;
    } else {
      this._moveTowards(unit, target, delta);
    }
  }

  /**
   * 执行采集命令
   * @param {Object} unit
   * @param {number} delta
  */
  _executeGather(unit, delta) {
    // 采集逻辑需要与ResourceManager配合
    // 这里提供基础框架，完整实现需要工人状态机
    const cmd = unit.currentCommand;
    if (!cmd.patchId && !cmd.type) return;

    // TODO: 完整的采集状态机
    // 状态：移动到矿脉 → 采集 → 携带满 → 返回基地 → 卸货 → 再次移动到矿脉
  }

  // ═══════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════

  /**
   * 朝目标位置移动
   * @param {Object} unit
   * @param {Object} target - {x, y, z}
   * @param {number} delta
  */
  _moveTowards(unit, target, delta) {
    const dx = target.x - unit.position.x;
    const dz = target.z - unit.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.3) return;

    const speed = unit.speed || 2;
    const moveX = (dx / dist) * speed * delta;
    const moveZ = (dz / dist) * speed * delta;

    unit.position.x += moveX;
    unit.position.z += moveZ;
    unit.velocity = { x: moveX / delta, y: 0, z: moveZ / delta };
    unit.facing = Math.atan2(dz, dx);
  }

  /**
   * 计算2D距离
   * @param {Object} a - {x, z}
   * @param {Object} b - {x, z}
   * @returns {number}
   */
  _distance2D(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * 检查当前命令是否已完成
   * @param {Object} unit
   * @returns {boolean}
   */
  _isCommandComplete(unit) {
    const cmd = unit.currentCommand;
    if (!cmd) return true;

    switch (cmd.type) {
      case COMMAND.MOVE:
        return this._distance2D(unit.position, cmd.position) < 0.3;
      case COMMAND.STOP:
        return true;
      case COMMAND.HOLD:
        return false; // 驻守是持续命令
      case COMMAND.ATTACK:
        // 攻击命令在目标死亡时结束
        if (cmd.targetId) {
          const target = this.gameManager.getUnitById(cmd.targetId);
          return !target || !target.alive;
        }
        return false;
      default:
        return false;
    }
  }

  /**
   * 推进命令队列（执行下一个排队命令）
   * @param {Object} unit
   */
  _advanceCommandQueue(unit) {
    // 移除已完成的命令
    unit.commandQueue.shift();

    // 设置下一个命令
    if (unit.commandQueue.length > 0) {
      unit.currentCommand = unit.commandQueue[0];
    } else {
      unit.currentCommand = null;
      unit.attackTarget = null;
      unit.targetPosition = null;
    }

    eventBus.emit(EVENTS.COMMAND_COMPLETED, { unitId: unit.id });
  }
}
