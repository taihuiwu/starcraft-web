// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 资源预加载器
// GLTF/OBJ 模型批量加载、纹理预加载+KTX2检测、缓存管理
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ─── 加载器实例（延迟创建，避免未使用时导入） ───
let _gltfLoader = null;
let _objLoader = null;
let _textureLoader = null;
let _ktx2Loader = null;

function getGLTFLoader() {
  if (!_gltfLoader) {
    // GLTFLoader 需要从 three/addons 导入
    // 这里提供容错: 如果不可用则报错
    try {
      // @ts-ignore dynamic import path
      const { GLTFLoader } = globalThis.__threeGLTFLoader || {};
      if (GLTFLoader) {
        _gltfLoader = new GLTFLoader();
      } else {
        console.warn('[AssetLoader] GLTFLoader not available, GLTF loading will fail');
      }
    } catch (e) {
      console.warn('[AssetLoader] Failed to initialize GLTFLoader:', e.message);
    }
  }
  return _gltfLoader;
}

function getOBJLoader() {
  if (!_objLoader) {
    try {
      const { OBJLoader } = globalThis.__threeOBJLoader || {};
      if (OBJLoader) {
        _objLoader = new OBJLoader();
      } else {
        console.warn('[AssetLoader] OBJLoader not available');
      }
    } catch (e) {
      console.warn('[AssetLoader] Failed to initialize OBJLoader:', e.message);
    }
  }
  return _objLoader;
}

// ─── 资源类型枚举 ───
export const ASSET_TYPE = {
  MODEL_GLTF: 'gltf',
  MODEL_OBJ: 'obj',
  TEXTURE: 'texture',
  CUBEMAP: 'cubemap',
  AUDIO: 'audio',
  JSON: 'json',
};

/**
 * 资源预加载器
 * 统一管理 GLTF/OBJ 模型、纹理、音频等资源的加载与缓存
 */
export class AssetLoader {
  /**
   * @param {THREE.LoadingManager} [manager] - Three.js LoadingManager (可选)
   */
  constructor(manager) {
    /** @type {THREE.LoadingManager} */
    this._manager = manager || new THREE.LoadingManager();

    /** @type {Map<string, any>} URL → 已加载资源缓存 */
    this._cache = new Map();

    /** @type {Map<string, Promise<any>} URL → 加载中的 Promise (防止重复加载) */
    this._loading = new Map();

    /** @type {THREE.TextureLoader} */
    this._textureLoader = new THREE.TextureLoader(this._manager);

    /** @type {number} 已加载资源数量 */
    this._loadedCount = 0;

    /** @type {number} 总资源数 */
    this._totalCount = 0;

    /** @type {Map<string, number>} 缓存资源大小估算 (bytes) */
    this._memoryMap = new Map();
  }

  // ─── 批量加载 ───

  /**
   * 按清单批量加载资源
   * @param {Array<{url: string, type: string, name?: string}>} manifest - 资源清单
   * @param {Function} [onProgress] - (loaded, total, item) => void
   * @returns {Promise<Map<string, any>>} name/url → 资源映射
   */
  async load(manifest, onProgress) {
    if (!manifest || manifest.length === 0) return new Map();

    this._totalCount += manifest.length;
    const results = new Map();

    const tasks = manifest.map(async (item) => {
      try {
        const resource = await this.loadSingle(item.url, item.type);
        const key = item.name || item.url;
        results.set(key, resource);
        this._loadedCount++;
        if (onProgress) {
          try { onProgress(this._loadedCount, this._totalCount, item); } catch (e) { /* ignore */ }
        }
      } catch (err) {
        console.error(`[AssetLoader] Failed to load "${item.url}":`, err);
        this._loadedCount++;
        if (onProgress) {
          try { onProgress(this._loadedCount, this._totalCount, item); } catch (e) { /* ignore */ }
        }
      }
    });

    await Promise.allSettled(tasks);
    return results;
  }

  /**
   * 加载单个资源
   * @param {string} url - 资源 URL
   * @param {string} type - ASSET_TYPE 值
   * @returns {Promise<any>}
   */
  async loadSingle(url, type) {
    // 检查缓存
    if (this._cache.has(url)) return this._cache.get(url);

    // 检查是否正在加载（防止重复）
    if (this._loading.has(url)) return this._loading.get(url);

    let promise;

    switch (type) {
      case ASSET_TYPE.MODEL_GLTF:
        promise = this._loadGLTF(url);
        break;
      case ASSET_TYPE.MODEL_OBJ:
        promise = this._loadOBJ(url);
        break;
      case ASSET_TYPE.TEXTURE:
        promise = this._loadTexture(url);
        break;
      case ASSET_TYPE.CUBEMAP:
        promise = this._loadCubemap(url);
        break;
      case ASSET_TYPE.AUDIO:
        promise = this._loadAudio(url);
        break;
      case ASSET_TYPE.JSON:
        promise = this._loadJSON(url);
        break;
      default:
        promise = this._loadTexture(url);
    }

    this._loading.set(url, promise);

    try {
      const result = await promise;
      this._cache.set(url, result);
      this._estimateMemory(url, result);
      return result;
    } finally {
      this._loading.delete(url);
    }
  }

  // ─── 纹理预加载 ───

  /**
   * 批量预加载纹理
   * @param {string[]} urls - 纹理 URL 列表
   * @param {Function} [onProgress] - (loaded, total) => void
   * @returns {Promise<Map<string, THREE.Texture>>}
   */
  async preloadTextures(urls, onProgress) {
    const results = new Map();
    let loaded = 0;

    const tasks = urls.map(async (url) => {
      try {
        const texture = await this._loadTexture(url);
        results.set(url, texture);
      } catch (err) {
        console.error(`[AssetLoader] Texture preload failed: "${url}":`, err);
      }
      loaded++;
      if (onProgress) {
        try { onProgress(loaded, urls.length); } catch (e) { /* ignore */ }
      }
    });

    await Promise.allSettled(tasks);
    return results;
  }

  // ─── 内部加载方法 ───

  async _loadGLTF(url) {
    const loader = getGLTFLoader();
    if (!loader) throw new Error('GLTFLoader not available');
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (err) => reject(err),
      );
    });
  }

  async _loadOBJ(url) {
    const loader = getOBJLoader();
    if (!loader) throw new Error('OBJLoader not available');
    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (obj) => resolve(obj),
        undefined,
        (err) => reject(err),
      );
    });
  }

  async _loadTexture(url) {
    // 检测 KTX2 格式
    if (url.endsWith('.ktx2') || url.includes('.ktx2?')) {
      // KTX2 需要特殊加载器
      console.warn(`[AssetLoader] KTX2 texture "${url}" — ensure KTX2Loader is configured`);
    }

    return new Promise((resolve, reject) => {
      this._textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          resolve(texture);
        },
        undefined,
        (err) => reject(err),
      );
    });
  }

  async _loadCubemap(urls) {
    // urls 应为 6 个面的 URL 数组或单个字符串 (equirectangular)
    if (typeof urls === 'string') {
      const texture = await this._loadTexture(urls);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      return texture;
    }
    const cubeTexture = new THREE.CubeTexture(urls);
    cubeTexture.needsUpdate = true;
    return cubeTexture;
  }

  async _loadAudio(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      audio.addEventListener('canplaythrough', () => resolve(audio), { once: true });
      audio.addEventListener('error', (e) => reject(e), { once: true });
      audio.load();
    });
  }

  async _loadJSON(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
    return response.json();
  }

  // ─── 缓存管理 ───

  /**
   * 从缓存获取资源
   * @param {string} url
   * @returns {any|undefined}
   */
  getFromCache(url) {
    return this._cache.get(url);
  }

  /**
   * 清除所有缓存
   */
  clearCache() {
    // 释放 Three.js 资源
    for (const [, resource] of this._cache) {
      if (resource && typeof resource.dispose === 'function') {
        resource.dispose();
      }
      if (resource && resource.scene && typeof resource.scene.traverse === 'function') {
        resource.scene.traverse((child) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });
      }
    }
    this._cache.clear();
    this._memoryMap.clear();
    this._loadedCount = 0;
    this._totalCount = 0;
  }

  /**
   * 估算资源内存占用
   * @param {string} url
   * @param {any} resource
   */
  _estimateMemory(url, resource) {
    let bytes = 0;

    if (resource instanceof THREE.Texture && resource.image) {
      const img = resource.image;
      bytes = (img.width || 512) * (img.height || 512) * 4; // RGBA
    } else if (resource && resource.scene) {
      // GLTF scene 估算
      resource.scene.traverse((child) => {
        if (child.geometry) {
          const geo = child.geometry;
          if (geo.attributes.position) bytes += geo.attributes.position.array.byteLength;
          if (geo.index) bytes += geo.index.array.byteLength;
        }
      });
    } else if (resource instanceof Audio) {
      bytes = resource.duration * 44100 * 2; // 粗略估算 PCM
    }

    this._memoryMap.set(url, bytes);
  }

  /**
   * 获取当前缓存的内存使用估算
   * @returns {{ totalBytes: number, totalMB: number, itemCount: number, items: Array<{url: string, bytes: number}> }}
   */
  getMemoryUsage() {
    let totalBytes = 0;
    const items = [];

    for (const [url, bytes] of this._memoryMap) {
      totalBytes += bytes;
      items.push({ url, bytes });
    }

    items.sort((a, b) => b.bytes - a.bytes);

    return {
      totalBytes,
      totalMB: Math.round(totalBytes / (1024 * 1024) * 100) / 100,
      itemCount: this._cache.size,
      items,
    };
  }
}
