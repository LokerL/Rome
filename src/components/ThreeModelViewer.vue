<template>
  <div class="model-viewer" ref="viewerContainer">
    <!-- 占位符区域（当没有3D模型时显示） -->
    <div
      v-if="!modelUrl"
      class="placeholder-container"
      :style="{ background: placeholderColor }"
    >
      <div class="placeholder-content">
        <div class="icon-container">
          <span class="scene-icon">{{ placeholderIcon }}</span>
        </div>
        <div class="interaction-hint">
          <div class="rotate-icon">🔄</div>
          <p>滑动旋转查看</p>
          <p class="hint-subtitle">（3D模型即将加载）</p>
        </div>
      </div>

      <!-- 模拟的3D旋转效果 -->
      <div
        class="rotating-element"
        :style="rotationStyle"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
      >
        <div class="model-frame">
          <span class="frame-icon">{{ placeholderIcon }}</span>
        </div>
      </div>
    </div>

    <!-- ThreeJS 3D模型容器（预留接口） -->
    <div v-else ref="threeContainer" class="three-container">
      <!-- ThreeJS will be mounted here -->
    </div>

    <!-- 控制面板 -->
    <div class="controls-panel">
      <button class="control-btn" @click="resetView" title="重置视图">
        <span>🔄</span>
      </button>
      <button class="control-btn" @click="toggleAutoRotate" title="自动旋转">
        <span>{{ isAutoRotating ? "⏸" : "▶" }}</span>
      </button>
      <button class="control-btn" @click="zoomIn" title="放大">
        <span>🔍+</span>
      </button>
      <button class="control-btn" @click="zoomOut" title="缩小">
        <span>🔍-</span>
      </button>
    </div>

    <!-- 加载指示器 -->
    <div v-if="isLoading" class="loading-indicator">
      <div class="loader"></div>
      <p>加载3D模型中...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// 让构建产物包含所有 assets，并获得其构建后的 URL
// 注意：GLTF 内部引用的 scene.bin / textures 无法被 Vite 自动重写，
// 需要在加载阶段用 URLModifier 将它们映射到打包后的真实 URL。
const assetModules = import.meta.glob("../assets/**/*", {
  eager: true,
  as: "url",
});

const normalizeAssetKey = (path) => {
  if (!path) return null;
  return path.replace(/^[./\\]+/, "").replace(/\\/g, "/");
};

const props = defineProps({
  sceneId: {
    type: String,
    required: true,
  },
  modelUrl: {
    type: String,
    default: null,
  },
  placeholderColor: {
    type: String,
    default: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  placeholderIcon: {
    type: String,
    default: "🏛️",
  },
});

const viewerContainer = ref(null);
const threeContainer = ref(null);
const isLoading = ref(false);
const isAutoRotating = ref(true);
const loadProgress = ref(0);

// Three.js references
let renderer = null;
let scene = null;
let camera = null;
let controls = null;
let modelGroup = null;
let animationId = null;
let disposeCurrentModel = null;
let currentModelKey = null; // 例如: ../assets/model/.../scene.gltf
let currentModelBaseDirKey = null; // 例如: ../assets/model/.../

const initialCameraPos = new THREE.Vector3();
const initialTarget = new THREE.Vector3();

// 旋转状态
const rotationX = ref(0);
const rotationY = ref(0);
const isDragging = ref(false);
const lastX = ref(0);
const lastY = ref(0);

// 计算旋转样式
const rotationStyle = computed(() => ({
  transform: `rotateX(${rotationX.value}deg) rotateY(${rotationY.value}deg)`,
  transition: isDragging.value ? "none" : "transform 0.3s ease-out",
}));

// 自动旋转动画
let autoRotateInterval = null;

const startAutoRotate = () => {
  if (autoRotateInterval) return;
  autoRotateInterval = setInterval(() => {
    if (isAutoRotating.value && !isDragging.value) {
      rotationY.value += 0.5;
    }
  }, 16);
};

const stopAutoRotate = () => {
  if (autoRotateInterval) {
    clearInterval(autoRotateInterval);
    autoRotateInterval = null;
  }
};

// 触摸事件处理
const handleTouchStart = (e) => {
  isDragging.value = true;
  const touch = e.touches[0];
  lastX.value = touch.clientX;
  lastY.value = touch.clientY;
  isAutoRotating.value = false;
};

const handleTouchMove = (e) => {
  if (!isDragging.value) return;
  e.preventDefault();

  const touch = e.touches[0];
  const deltaX = touch.clientX - lastX.value;
  const deltaY = touch.clientY - lastY.value;

  rotationY.value += deltaX * 0.5;
  rotationX.value -= deltaY * 0.3;

  // 限制X轴旋转范围
  rotationX.value = Math.max(-45, Math.min(45, rotationX.value));

  lastX.value = touch.clientX;
  lastY.value = touch.clientY;
};

const handleTouchEnd = () => {
  isDragging.value = false;
};

// 鼠标事件处理（桌面端）
const handleMouseDown = (e) => {
  isDragging.value = true;
  lastX.value = e.clientX;
  lastY.value = e.clientY;
  isAutoRotating.value = false;
};

const handleMouseMove = (e) => {
  if (!isDragging.value) return;

  const deltaX = e.clientX - lastX.value;
  const deltaY = e.clientY - lastY.value;

  rotationY.value += deltaX * 0.5;
  rotationX.value -= deltaY * 0.3;

  rotationX.value = Math.max(-45, Math.min(45, rotationX.value));

  lastX.value = e.clientX;
  lastY.value = e.clientY;
};

const handleMouseUp = () => {
  isDragging.value = false;
};

// 控制面板功能
const resetView = () => {
  // 占位符旋转复位
  rotationX.value = 0;
  rotationY.value = 0;

  // Three.js 视图复位
  if (camera && controls) {
    camera.position.copy(initialCameraPos);
    controls.target.copy(initialTarget);
    controls.update();
  }
  isAutoRotating.value = true;
  if (controls) controls.autoRotate = true;
};

const toggleAutoRotate = () => {
  isAutoRotating.value = !isAutoRotating.value;
  if (controls) {
    controls.autoRotate = isAutoRotating.value;
  }
};

const zoomByFactor = (factor) => {
  if (!camera || !controls) return;
  const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
  dir.multiplyScalar(factor);
  camera.position.copy(new THREE.Vector3().addVectors(controls.target, dir));
  controls.update();
};

const zoomIn = () => zoomByFactor(0.9);
const zoomOut = () => zoomByFactor(1.1);

// 初始化 Three.js 渲染器/场景/相机/控制器
const initRenderer = () => {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  threeContainer.value.appendChild(renderer.domElement);
};

const initScene = () => {
  scene = new THREE.Scene();
  scene.background = null;
  // 柔和环境光 + 方向光
  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);
  const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
  dir1.position.set(3, 5, 2);
  scene.add(dir1);
  const dir2 = new THREE.DirectionalLight(0xffffff, 0.4);
  dir2.position.set(-3, -2, -2);
  scene.add(dir2);

  modelGroup = new THREE.Group();
  scene.add(modelGroup);
};

const initCamera = () => {
  const width = threeContainer.value.clientWidth;
  const height = threeContainer.value.clientHeight;
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(0, 1.5, 4);
  camera.lookAt(0, 0, 0);
  renderer.setSize(width, height);
};

const initControls = () => {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enablePan = false;
  controls.autoRotate = isAutoRotating.value;
  controls.autoRotateSpeed = 0.8;
};

const onResize = () => {
  if (!renderer || !camera) return;
  const width = threeContainer.value.clientWidth;
  const height = threeContainer.value.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

const fitCameraToObject = (obj, offset = 1.3) => {
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * offset;
  cameraZ = Math.max(cameraZ, 1.5);

  // 以中心为目标点
  controls.target.copy(center);
  camera.position.set(center.x, center.y + maxDim * 0.1, center.z + cameraZ);
  camera.near = maxDim / 100;
  camera.far = maxDim * 100;
  camera.updateProjectionMatrix();
  controls.update();

  // 记录初始视角
  initialCameraPos.copy(camera.position);
  initialTarget.copy(controls.target);
};

const clearModel = () => {
  if (!modelGroup) return;
  while (modelGroup.children.length) {
    const child = modelGroup.children.pop();
    child.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose?.();
      if (obj.material) {
        if (Array.isArray(obj.material))
          obj.material.forEach((m) => m.dispose?.());
        else obj.material.dispose?.();
      }
      if (obj.texture) obj.texture.dispose?.();
    });
  }
};

const loadModel = (url) => {
  clearModel();
  isLoading.value = true;
  loadProgress.value = 0;

  // 反向查找 modelUrl 对应的原始 glob key，拿到其所在目录，
  // 这样可将 GLTF 内部引用的相对路径映射到正确的构建后 URL。
  currentModelKey = null;
  currentModelBaseDirKey = null;
  for (const [key, builtUrl] of Object.entries(assetModules)) {
    if (builtUrl === url) {
      currentModelKey = key; // 形如 ../assets/model/sistine-creation/capella_sistina/scene.gltf
      break;
    }
  }
  if (currentModelKey) {
    currentModelBaseDirKey = currentModelKey.replace(/[^/]+$/, ""); // 去掉文件名，保留目录，以 / 结尾
  }

  // 构建 URLModifier：将 GLTF 请求到的相对路径映射成构建后 URL
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((requestedUrl) => {
    try {
      // data: / http(s): 直接放行
      if (/^(data:|https?:)/i.test(requestedUrl)) return requestedUrl;

      // 取出相对路径部分
      let relativePath = requestedUrl;

      // 如果是绝对URL，提取pathname
      try {
        const u = new URL(requestedUrl, window.location.href);
        relativePath = u.pathname;
      } catch (_) {
        // 已经是相对路径，保持原样
      }

      // 移除可能的前导斜杠和 assets/ 前缀
      relativePath = relativePath.replace(/^\/+/, '').replace(/^assets\//, '');

      // 如果有当前模型的目录信息，优先在同目录下查找
      if (currentModelBaseDirKey) {
        // 尝试1: 直接拼接相对路径
        const directKey = normalizeAssetKey(`${currentModelBaseDirKey}${relativePath}`);
        if (assetModules[directKey]) {
          console.log(`[URLModifier] 匹配成功: ${requestedUrl} -> ${directKey}`);
          return assetModules[directKey];
        }

        // 尝试2: URL编码处理
        const encodedPath = encodeURI(relativePath);
        const encodedKey = normalizeAssetKey(`${currentModelBaseDirKey}${encodedPath}`);
        if (assetModules[encodedKey]) {
          console.log(`[URLModifier] 编码匹配成功: ${requestedUrl} -> ${encodedKey}`);
          return assetModules[encodedKey];
        }
      }

      // 兜底1: 在全局assets中搜索完全匹配的路径
      for (const [key, builtUrl] of Object.entries(assetModules)) {
        if (key.endsWith(relativePath) || key.endsWith(`/${relativePath}`)) {
          console.log(`[URLModifier] 全局路径匹配: ${requestedUrl} -> ${key}`);
          return builtUrl;
        }
      }

      // 兜底2: 按文件名匹配(仅当唯一时)
      const fileName = relativePath.split("/").pop();
      if (fileName) {
        const candidates = Object.entries(assetModules).filter(([k]) =>
          k.endsWith(`/${fileName}`)
        );
        if (candidates.length === 1) {
          console.log(`[URLModifier] 文件名匹配: ${requestedUrl} -> ${candidates[0][0]}`);
          return candidates[0][1];
        }
      }

      // 找不到映射，警告并返回原路径
      console.warn(`[URLModifier] 未找到匹配: ${requestedUrl}, 相对路径: ${relativePath}`);
      return requestedUrl;
    } catch (e) {
      console.error(`[URLModifier] 处理失败:`, e);
      return requestedUrl;
    }
  });

  const loader = new GLTFLoader(manager);
  loader.load(
    url,
    (gltf) => {
      const root = gltf.scene || gltf.scenes?.[0];
      if (!root) {
        console.warn("GLTF 无有效场景");
        isLoading.value = false;
        return;
      }
      modelGroup.add(root);
      fitCameraToObject(modelGroup, 1.4);
      isLoading.value = false;
    },
    (evt) => {
      if (evt.total)
        loadProgress.value = Math.round((evt.loaded / evt.total) * 100);
    },
    (err) => {
      console.error("模型加载失败:", err);
      isLoading.value = false;
    }
  );
};

const startRenderLoop = () => {
  const tick = () => {
    animationId = requestAnimationFrame(tick);
    if (controls) controls.update();
    renderer.render(scene, camera);
  };
  tick();
};

const stopRenderLoop = () => {
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
};

// ThreeJS 初始化函数
const initThreeJS = () => {
  if (!props.modelUrl || !threeContainer.value) return;
  // 若已存在，先清理
  disposeThree();

  initRenderer();
  initScene();
  initCamera();
  initControls();
  window.addEventListener("resize", onResize);

  loadModel(props.modelUrl);
  startRenderLoop();
};

const disposeThree = () => {
  stopRenderLoop();
  window.removeEventListener("resize", onResize);
  if (controls) {
    controls.dispose();
    controls = null;
  }
  clearModel();
  if (renderer) {
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    renderer = null;
  }
  scene = null;
  camera = null;
  modelGroup = null;
};

// 监听模型URL变化
watch(
  () => props.modelUrl,
  () => {
    if (props.modelUrl) {
      initThreeJS();
    }
  }
);

onMounted(() => {
  startAutoRotate();

  // 添加全局鼠标抬起事件监听
  document.addEventListener("mouseup", handleMouseUp);

  // 如果有模型URL，初始化ThreeJS
  if (props.modelUrl) {
    initThreeJS();
  }
});

onUnmounted(() => {
  stopAutoRotate();
  document.removeEventListener("mouseup", handleMouseUp);
  disposeThree();
});
</script>

<style scoped>
.model-viewer {
  width: 100%;
  height: 500px;
  position: relative;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

/* 占位符容器 */
.placeholder-container {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 1000px;
}

.placeholder-content {
  position: absolute;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  text-align: center;
  z-index: 2;
  color: white;
}

.icon-container {
  margin-bottom: 1rem;
}

.scene-icon {
  font-size: 4rem;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
  animation: float 3s ease-in-out infinite;
}

.interaction-hint {
  background: rgba(0, 0, 0, 0.3);
  padding: 1rem 2rem;
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.rotate-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
  animation: rotate 2s linear infinite;
}

.interaction-hint p {
  margin: 0.3rem 0;
  font-size: 1rem;
  font-weight: 600;
}

.hint-subtitle {
  font-size: 0.9rem !important;
  opacity: 0.8;
  font-weight: 400 !important;
}

/* 旋转元素 */
.rotating-element {
  width: 300px;
  height: 300px;
  transform-style: preserve-3d;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.rotating-element:active {
  cursor: grabbing;
}

.model-frame {
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.1);
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(5px);
  box-shadow: 0 0 40px rgba(255, 255, 255, 0.2),
    inset 0 0 40px rgba(255, 255, 255, 0.1);
}

.frame-icon {
  font-size: 8rem;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5));
}

/* ThreeJS容器 */
.three-container {
  width: 100%;
  height: 100%;
}

/* 控制面板 */
.controls-panel {
  position: absolute;
  bottom: 1.5rem;
  right: 1.5rem;
  display: flex;
  gap: 0.5rem;
  z-index: 10;
}

.control-btn {
  width: 50px;
  height: 50px;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.control-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.control-btn:active {
  transform: scale(0.95);
}

/* 加载指示器 */
.loading-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  color: white;
  z-index: 20;
  background: rgba(0, 0, 0, 0.7);
  padding: 2rem 3rem;
  border-radius: 15px;
  backdrop-filter: blur(10px);
}

.loader {
  width: 50px;
  height: 50px;
  border: 5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

.loading-indicator p {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

/* 动画 */
@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 平板适配 */
@media (orientation: landscape) and (min-width: 768px) {
  .model-viewer {
    height: 400px;
  }

  .rotating-element {
    width: 250px;
    height: 250px;
  }
}

@media (orientation: portrait) and (max-width: 768px) {
  .model-viewer {
    height: 400px;
  }

  .rotating-element {
    width: 250px;
    height: 250px;
  }

  .scene-icon {
    font-size: 3rem;
  }

  .frame-icon {
    font-size: 6rem;
  }

  .controls-panel {
    bottom: 1rem;
    right: 1rem;
  }

  .control-btn {
    width: 45px;
    height: 45px;
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .model-viewer {
    height: 350px;
  }

  .rotating-element {
    width: 200px;
    height: 200px;
  }
}
</style>
