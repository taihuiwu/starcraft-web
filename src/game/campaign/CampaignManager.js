// ═══════════════════════════════════════════
// StarCraft Web - 战役管理器 (CampaignManager)
// 管理战役加载、任务流程、奖励解锁、
// 任务进度跟踪与剧情事件触发
// ═══════════════════════════════════════════

import { EVENTS, RACE } from '../../shared/Constants.js';
import { eventBus } from '../../shared/EventBus.js';
import MissionScript from './MissionScript.js';

// 导入三族战役数据
import { TERRAN_CAMPAIGN } from './TerranCampaign.js';
import { ZERG_CAMPAIGN } from './ZergCampaign.js';
import { PROTOSS_CAMPAIGN } from './ProtossCampaign.js';

/**
 * 战役ID到数据的映射表
 */
const CAMPAIGN_DATA = {
  terran: TERRAN_CAMPAIGN,
  zerg: ZERG_CAMPAIGN,
  protoss: PROTOSS_CAMPAIGN,
};

/**
 * 战役进度存储的localStorage键名
 */
const STORAGE_KEY = 'starcraft_campaign_progress';

export default class CampaignManager {
  /**
   * @param {import('../GameManager.js').default} gameManager - 游戏管理器引用
   */
  constructor(gameManager) {
    /** @type {import('../GameManager.js').default} */
    this.gameManager = gameManager;

    /** @type {Object|null} 当前加载的战役数据 */
    this.currentCampaign = null;

    /** @type {Object|null} 当前任务数据 */
    this.currentMission = null;

    /** @type {string|null} 当前战役ID（如'terran', 'zerg', 'protoss'） */
    this.currentCampaignId = null;

    /** @type {string|null} 当前任务ID */
    this.currentMissionId = null;

    /** @type {MissionScript} 任务脚本引擎 */
    this.script = new MissionScript(gameManager);

    /** @type {boolean} 任务是否正在进行中 */
    this.missionActive = false;

    /** @type {number} 任务已经过时间（秒） */
    this.missionElapsedTime = 0;

    /** @type {number} 任务评分（根据完成时间、损失等计算） */
    this.missionScore = 0;

    /** @type {Map<string, Object>} 所有战役的进度数据 */
    this.progress = new Map();

    /** @type {Array<string>} 已解锁的兵种列表（任务奖励） */
    this.unlockedUnits = [];

    /** @type {Array<string>} 已解锁的科技列表（任务奖励） */
    this.unlockedTechs = [];

    /** @type {Map<string, boolean>} 任务完成状态 */
    this.completedMissions = new Map();

    /** @type {Map<string, Object>} 任务评分记录 { missionId: { score, stars, time } } */
    this.missionScores = new Map();

    // ─── 注册脚本回调 ────────────────────
    this._initScriptCallbacks();

    // ─── 注册游戏事件 ────────────────────
    this._initEventListeners();

    // ─── 加载进度 ─────────────────────────
    this._loadProgress();
  }

  /**
   * 初始化脚本引擎回调
   */
  _initScriptCallbacks() {
    // 对话回调 —— 显示对话框
    this.script.onDialog = (dialogData) => {
      this._showDialog(dialogData);
    };

    // 相机移动回调
    this.script.onCameraMove = (data) => {
      if (this.gameManager.camera) {
        eventBus.emit(EVENTS.CAMERA_MOVE, {
          x: data.pos[0],
          z: data.pos[1],
          duration: data.duration,
        });
      }
    };

    // 目标更新回调
    this.script.onObjectiveUpdate = (objectives) => {
      this._updateObjectiveUI(objectives);
    };

    // 任务完成回调
    this.script.onMissionComplete = () => {
      this._onMissionVictory();
    };

    // 任务失败回调
    this.script.onMissionFail = () => {
      this._onMissionDefeat();
    };
  }

  /**
   * 初始化事件监听
   */
  _initEventListeners() {
    // 监听单位死亡，更新统计
    eventBus.on(EVENTS.UNIT_DIED, (data) => {
      if (this.missionActive && data.unit) {
        if (data.unit.team === 1) {
          // 玩家单位损失
          this.missionStats.unitsLost++;
        }
      }
    });

    // 监听任务胜利
    eventBus.on('mission:victory', () => {
      this._onMissionVictory();
    });

    // 监听任务失败
    eventBus.on('mission:defeat', () => {
      this._onMissionDefeat();
    });
  }

  // ═══════════════════════════════════════
  // 战役加载与管理
  // ═══════════════════════════════════════

  /**
   * 加载指定种族的战役
   * @param {string} campaignId - 战役ID ('terran' | 'zerg' | 'protoss')
   * @returns {Object|null} 战役数据或null
   */
  loadCampaign(campaignId) {
    const campaign = CAMPAIGN_DATA[campaignId];
    if (!campaign) {
      console.error(`[CampaignManager] 找不到战役数据: ${campaignId}`);
      return null;
    }

    this.currentCampaign = campaign;
    this.currentCampaignId = campaignId;

    // 加载该战役的进度
    if (!this.progress.has(campaignId)) {
      this.progress.set(campaignId, {
        unlockedMissions: [campaign.missions[0]?.id], // 第一关默认解锁
        completedMissions: [],
        missionScores: {},
      });
    }

    console.log(`[CampaignManager] 加载战役: ${campaign.name} (${campaignId})`);
    eventBus.emit('campaign:loaded', {
      campaignId,
      campaign,
      progress: this.progress.get(campaignId),
    });

    return campaign;
  }

  /**
   * 获取指定战役的任务列表
   * @param {string} campaignId - 战役ID
   * @returns {Array} 任务列表
   */
  getMissionList(campaignId) {
    const campaign = CAMPAIGN_DATA[campaignId];
    if (!campaign) return [];
    return campaign.missions.map((m, index) => ({
      id: m.id,
      name: m.name,
      subtitle: m.subtitle,
      description: m.description,
      index,
      unlocked: this._isMissionUnlocked(campaignId, m.id),
      completed: this.completedMissions.has(`${campaignId}:${m.id}`),
      score: this.missionScores.get(`${campaignId}:${m.id}`) || null,
    }));
  }

  /**
   * 检查任务是否已解锁
   * @param {string} campaignId - 战役ID
   * @param {string} missionId - 任务ID
   * @returns {boolean}
   */
  _isMissionUnlocked(campaignId, missionId) {
    const prog = this.progress.get(campaignId);
    if (!prog) return false;
    return prog.unlockedMissions?.includes(missionId) || false;
  }

  /**
   * 开始任务
   * @param {string} missionId - 任务ID
   * @returns {boolean} 是否成功开始
   */
  startMission(missionId) {
    if (!this.currentCampaign) {
      console.error('[CampaignManager] 请先加载战役');
      return false;
    }

    // 检查任务是否解锁
    if (!this._isMissionUnlocked(this.currentCampaignId, missionId)) {
      console.warn(`[CampaignManager] 任务未解锁: ${missionId}`);
      eventBus.emit('campaign:mission_locked', { missionId });
      return false;
    }

    // 查找任务数据
    const mission = this.currentCampaign.missions.find((m) => m.id === missionId);
    if (!mission) {
      console.error(`[CampaignManager] 找不到任务: ${missionId}`);
      return false;
    }

    this.currentMission = mission;
    this.currentMissionId = missionId;
    this.missionActive = true;
    this.missionElapsedTime = 0;
    this.missionScore = 0;
    this.missionStats = {
      unitsLost: 0,
      unitsBuilt: 0,
      enemiesKilled: 0,
      resourcesSpent: 0,
      buildingsLost: 0,
    };

    // 初始化任务场景（地形、初始单位等）
    this._setupMissionScene(mission);

    // 加载并启动脚本
    this.script.reset();
    this.script.load(mission.script);

    console.log(`[CampaignManager] 开始任务: ${mission.name}`);
    eventBus.emit('campaign:mission_started', {
      missionId,
      mission,
      campaignId: this.currentCampaignId,
    });

    return true;
  }

  /**
   * 初始化任务场景
   * @param {Object} mission - 任务数据
   */
  _setupMissionScene(mission) {
    const gm = this.gameManager;

    // 清空现有实体
    gm.units = [];
    gm.buildings = [];
    gm.projectiles = [];
    gm.particles = [];
    gm.nextUnitId = 1;

    // 设置地图配置（如果有）
    if (mission.map) {
      eventBus.emit('campaign:setup_map', { map: mission.map });
    }

    // 生成初始单位
    if (mission.initialUnits) {
      for (const unitData of mission.initialUnits) {
        const unitDef = gm._getUnitDef?.(unitData.type) ||
          this.script._resolveUnitDef(unitData.type, unitData.race);
        if (unitDef) {
          gm.spawnUnit(
            unitDef,
            { x: unitData.pos[0], y: 0, z: unitData.pos[1] },
            unitData.team || 1
          );
        }
      }
    }

    // 生成初始建筑
    if (mission.initialBuildings) {
      for (const bldData of mission.initialBuildings) {
        const bldDef = gm._getBuildingDef?.(bldData.type);
        if (bldDef) {
          const building = gm.spawnBuilding(
            bldDef,
            { x: bldData.pos[0], y: 0, z: bldData.pos[1] },
            bldData.team || 1
          );
          // 可以直接标记为建造完成
          if (bldData.complete) {
            building.isComplete = true;
            building.buildProgress = 1;
            building.isBuilding = false;
          }
        }
      }
    }

    // 初始化玩家资源
    if (mission.startingResources) {
      gm.resourceManager?.setResources?.(
        1,
        mission.startingResources.minerals || 100,
        mission.startingResources.gas || 0
      );
    }

    // 初始化AI配置
    if (mission.aiConfig) {
      eventBus.emit('campaign:setup_ai', { aiConfig: mission.aiConfig });
    }

    // 设置相机初始位置
    if (mission.cameraStart) {
      eventBus.emit(EVENTS.CAMERA_MOVE, {
        x: mission.cameraStart[0],
        z: mission.cameraStart[1],
        duration: 0,
      });
    }
  }

  /**
   * 完成任务（外部调用，标记任务完成并解锁下一关）
   * @param {string} missionId - 任务ID
   * @param {number} score - 任务评分（可选）
   */
  completeMission(missionId, score = 0) {
    const key = `${this.currentCampaignId}:${missionId}`;
    this.completedMissions.set(key, true);

    // 计算评分（三星制）
    const mission = this.currentCampaign?.missions.find((m) => m.id === missionId);
    const stars = this._calculateStars(mission, score);

    this.missionScores.set(key, {
      score,
      stars,
      time: this.missionElapsedTime,
      stats: { ...this.missionStats },
    });

    // 解锁下一关
    this._unlockNextMission(missionId);

    // 发放任务奖励（解锁兵种/科技）
    if (mission?.rewards) {
      this._grantRewards(mission.rewards);
    }

    // 保存进度
    this._saveProgress();

    console.log(`[CampaignManager] 任务完成: ${missionId}，评分: ${stars}星`);
    eventBus.emit('campaign:mission_completed', {
      missionId,
      score,
      stars,
      stats: this.missionStats,
      campaignId: this.currentCampaignId,
    });
  }

  /**
   * 计算任务星级评分
   * @param {Object} mission - 任务数据
   * @param {number} score - 基础评分
   * @returns {number} 星级 (1-3)
   */
  _calculateStars(mission, score) {
    if (!mission?.scoring) return 1;

    const s = mission.scoring;
    const stats = this.missionStats;

    // 评分维度：完成时间、单位损失、资源使用
    let stars = 1; // 完成即1星

    const timeBonus = s.timeLimit ? (1 - this.missionElapsedTime / s.timeLimit) : 0;
    const lossBonus = s.maxLoss ? (1 - stats.unitsLost / s.maxLoss) : 0;
    const avgBonus = (timeBonus + lossBonus) / 2;

    if (avgBonus > 0.6 || score >= s.threeStarScore) {
      stars = 3;
    } else if (avgBonus > 0.3 || score >= s.twoStarScore) {
      stars = 2;
    }

    return stars;
  }

  /**
   * 解锁下一个任务
   * @param {string} completedMissionId - 刚完成的任务ID
   */
  _unlockNextMission(completedMissionId) {
    if (!this.currentCampaign) return;

    const prog = this.progress.get(this.currentCampaignId);
    if (!prog) return;

    // 找到当前任务的索引
    const missions = this.currentCampaign.missions;
    const index = missions.findIndex((m) => m.id === completedMissionId);

    if (index >= 0 && index < missions.length - 1) {
      const nextMissionId = missions[index + 1].id;
      if (!prog.unlockedMissions.includes(nextMissionId)) {
        prog.unlockedMissions.push(nextMissionId);
        console.log(`[CampaignManager] 解锁下一关: ${nextMissionId}`);
        eventBus.emit('campaign:mission_unlocked', { missionId: nextMissionId });
      }
    }
  }

  /**
   * 发放任务奖励
   * @param {Object} rewards - { units: [...], techs: [...], credits: number }
   */
  _grantRewards(rewards) {
    if (rewards.units) {
      for (const unitId of rewards.units) {
        if (!this.unlockedUnits.includes(unitId)) {
          this.unlockedUnits.push(unitId);
          console.log(`[CampaignManager] 🎁 解锁新兵种: ${unitId}`);
          eventBus.emit('campaign:unit_unlocked', { unitId });
        }
      }
    }

    if (rewards.techs) {
      for (const techId of rewards.techs) {
        if (!this.unlockedTechs.includes(techId)) {
          this.unlockedTechs.push(techId);
          console.log(`[CampaignManager] 🔬 解锁新科技: ${techId}`);
          eventBus.emit('campaign:tech_unlocked', { techId });
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 更新与回调
  // ═══════════════════════════════════════

  /**
   * 每帧更新（由GameManager调用）
   * @param {number} dt - 帧间隔时间（秒）
   */
  update(dt) {
    if (!this.missionActive || this.script.finished) return;

    this.missionElapsedTime += dt;

    // 更新任务脚本
    this.script.update(dt);

    // 发射战役更新事件（供UI刷新）
    if (Math.floor(this.missionElapsedTime * 4) !== Math.floor((this.missionElapsedTime - dt) * 4)) {
      eventBus.emit('campaign:update', {
        elapsedTime: this.missionElapsedTime,
        objectives: this.script.objectives,
        stats: this.missionStats,
      });
    }
  }

  /**
   * 任务胜利处理
   */
  _onMissionVictory() {
    if (!this.missionActive) return;

    this.missionActive = false;

    // 计算最终评分
    this.missionScore = this._calculateFinalScore();

    // 完成任务（含奖励发放）
    this.completeMission(this.currentMissionId, this.missionScore);

    eventBus.emit('campaign:mission_victory', {
      missionId: this.currentMissionId,
      score: this.missionScore,
      stats: this.missionStats,
      time: this.missionElapsedTime,
    });

    console.log(`[CampaignManager] 🏆 任务胜利！耗时: ${this.missionElapsedTime.toFixed(1)}s`);
  }

  /**
   * 任务失败处理
   */
  _onMissionDefeat() {
    if (!this.missionActive) return;

    this.missionActive = false;

    eventBus.emit('campaign:mission_defeat', {
      missionId: this.currentMissionId,
      stats: this.missionStats,
      time: this.missionElapsedTime,
    });

    console.log(`[CampaignManager] 💀 任务失败！`);
  }

  /**
   * 计算最终评分
   * @returns {number} 评分
   */
  _calculateFinalScore() {
    let score = 1000;

    // 损失扣分
    score -= this.missionStats.unitsLost * 10;
    score -= this.missionStats.buildingsLost * 25;

    // 时间奖励（越快越好）
    if (this.missionElapsedTime < 300) {
      score += 200;
    } else if (this.missionElapsedTime < 600) {
      score += 100;
    }

    // 杀敌奖励
    score += this.missionStats.enemiesKilled * 5;

    return Math.max(0, score);
  }

  // ═══════════════════════════════════════
  // UI辅助
  // ═══════════════════════════════════════

  /**
   * 显示对话框（触发UI事件）
   * @param {Object} dialogData - { speaker, portrait, text, onComplete }
   */
  _showDialog(dialogData) {
    eventBus.emit('campaign:dialog', dialogData);
  }

  /**
   * 更新目标UI
   * @param {Array} objectives - 目标列表
   */
  _updateObjectiveUI(objectives) {
    eventBus.emit('campaign:objectives_updated', { objectives });
  }

  // ═══════════════════════════════════════
  // 进度存储
  // ═══════════════════════════════════════

  /**
   * 保存进度到localStorage
   */
  _saveProgress() {
    try {
      const saveData = {
        progress: {},
        unlockedUnits: this.unlockedUnits,
        unlockedTechs: this.unlockedTechs,
        completedMissions: {},
        missionScores: {},
      };

      // 序列化Map
      for (const [key, value] of this.progress) {
        saveData.progress[key] = value;
      }
      for (const [key, value] of this.completedMissions) {
        saveData.completedMissions[key] = value;
      }
      for (const [key, value] of this.missionScores) {
        saveData.missionScores[key] = value;
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    } catch (err) {
      console.error('[CampaignManager] 保存进度失败:', err);
    }
  }

  /**
   * 从localStorage加载进度
   */
  _loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saveData = JSON.parse(raw);

      // 恢复Map数据
      if (saveData.progress) {
        for (const [key, value] of Object.entries(saveData.progress)) {
          this.progress.set(key, value);
        }
      }
      if (saveData.unlockedUnits) {
        this.unlockedUnits = saveData.unlockedUnits;
      }
      if (saveData.unlockedTechs) {
        this.unlockedTechs = saveData.unlockedTechs;
      }
      if (saveData.completedMissions) {
        for (const [key, value] of Object.entries(saveData.completedMissions)) {
          this.completedMissions.set(key, value);
        }
      }
      if (saveData.missionScores) {
        for (const [key, value] of Object.entries(saveData.missionScores)) {
          this.missionScores.set(key, value);
        }
      }

      console.log('[CampaignManager] 已加载战役进度');
    } catch (err) {
      console.warn('[CampaignManager] 加载进度失败:', err);
    }
  }

  /**
   * 重置所有进度
   */
  resetProgress() {
    this.progress.clear();
    this.completedMissions.clear();
    this.missionScores.clear();
    this.unlockedUnits = [];
    this.unlockedTechs = [];
    localStorage.removeItem(STORAGE_KEY);
    console.log('[CampaignManager] 战役进度已重置');
  }

  /**
   * 获取当前任务状态摘要
   * @returns {Object}
   */
  getStatus() {
    return {
      campaignId: this.currentCampaignId,
      missionId: this.currentMissionId,
      missionActive: this.missionActive,
      elapsedTime: this.missionElapsedTime,
      score: this.missionScore,
      objectives: this.script.objectives,
      stats: this.missionStats || {},
      unlockedUnits: this.unlockedUnits,
      unlockedTechs: this.unlockedTechs,
    };
  }
}
