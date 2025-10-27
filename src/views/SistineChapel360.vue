<template>
  <div class="video-360-container">
    <!-- 返回按钮 -->
    <button class="back-btn" @click="goBack" aria-label="返回主页">
      <span class="back-icon">←</span>
      <span class="back-text">返回</span>
    </button>

    <!-- 标题 -->
    <div class="title-overlay">
      <h1 class="title">西斯廷教堂</h1>
      <p class="subtitle">360° 全景体验</p>
    </div>

    <!-- Three.js 画布容器 -->
    <div ref="containerRef" class="canvas-container"></div>

    <!-- 加载提示 -->
    <div v-if="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
      <p class="loading-text">正在加载360全景视频...</p>
      <p class="loading-progress">{{ loadingProgress }}%</p>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-overlay">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <p class="error-text">{{ errorMessage }}</p>
        <button class="retry-btn" @click="initVideo">重试</button>
      </div>
    </div>

    <!-- 视频控制面板 -->
    <div
      v-if="!isLoading && !errorMessage"
      class="controls-panel"
      :class="{ 'controls-visible': showControls }"
    >
      <!-- 播放/暂停按钮 -->
      <button class="control-btn play-btn" @click="togglePlay">
        <span v-if="!isPlaying">▶</span>
        <span v-else>⏸</span>
      </button>

      <!-- 进度条 -->
      <div class="progress-container">
        <input
          type="range"
          class="progress-bar"
          :value="currentTime"
          :max="duration"
          @input="seekVideo"
          @mousedown="isDragging = true"
          @mouseup="isDragging = false"
          @touchstart="isDragging = true"
          @touchend="isDragging = false"
        />
        <div class="time-display">
          <span>{{ formatTime(currentTime) }}</span>
          <span>{{ formatTime(duration) }}</span>
        </div>
      </div>

      <!-- 音量控制 -->
      <div class="volume-control">
        <button class="control-btn volume-btn" @click="toggleMute">
          <span v-if="!isMuted && volume > 0.5">🔊</span>
          <span v-else-if="!isMuted && volume > 0">🔉</span>
          <span v-else>🔇</span>
        </button>
        <input
          type="range"
          class="volume-slider"
          :value="volume"
          min="0"
          max="1"
          step="0.01"
          @input="changeVolume"
        />
      </div>

      <!-- 全屏按钮 -->
      <button class="control-btn fullscreen-btn" @click="toggleFullscreen">
        <span v-if="!isFullscreen">⛶</span>
        <span v-else>⛶</span>
      </button>
    </div>

    <!-- 操作提示 -->
    <div v-if="!isLoading && !errorMessage && showHint" class="hint-overlay">
      <p class="hint-text">💡 拖动屏幕或使用鼠标旋转视角</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import * as THREE from "three";

const router = useRouter();
const containerRef = ref(null);

// 视频状态
const isLoading = ref(true);
const errorMessage = ref("");
const loadingProgress = ref(0);
const isPlaying = ref(false);
const currentTime = ref(0);
const duration = ref(0);
const volume = ref(1);
const isMuted = ref(false);
const showControls = ref(true);
const showHint = ref(true);
const isFullscreen = ref(false);
const isDragging = ref(false);

// Three.js 相关变量
let scene, camera, renderer, sphere, video, texture;
let isUserInteracting = false;
let onPointerDownMouseX = 0;
let onPointerDownMouseY = 0;
let lon = 0;
let onPointerDownLon = 0;
let lat = 0;
let onPointerDownLat = 0;
let phi = 0;
let theta = 0;
let controlsTimeout = null;

// 返回主页
const goBack = () => {
  router.push("/");
};

// 初始化 Three.js 场景
const initThreeJS = () => {
  if (!containerRef.value) return;

  // 创建场景
  scene = new THREE.Scene();

  // 创建相机
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 0.1);

  // 创建渲染器
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  containerRef.value.appendChild(renderer.domElement);

  // 创建视频元素
  video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.loop = true;
  video.muted = false;
  video.playsInline = true;
  video.preload = "auto";

  // 监听视频加载进度
  video.addEventListener("progress", () => {
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const duration = video.duration;
      if (duration > 0) {
        loadingProgress.value = Math.round((bufferedEnd / duration) * 100);
      }
    }
  });

  // 视频可以播放时
  video.addEventListener("canplay", () => {
    isLoading.value = false;
    duration.value = video.duration;

    // 3秒后隐藏提示
    setTimeout(() => {
      showHint.value = false;
    }, 3000);
  });

  // 视频时间更新
  video.addEventListener("timeupdate", () => {
    if (!isDragging.value) {
      currentTime.value = video.currentTime;
    }
  });

  // 视频结束
  video.addEventListener("ended", () => {
    isPlaying.value = false;
  });

  // 视频加载错误
  video.addEventListener("error", (e) => {
    console.error("视频加载错误:", e);
    errorMessage.value = "视频加载失败，请检查视频文件是否存在";
    isLoading.value = false;
  });

  // 设置视频源 - 使用相对路径
  video.src =
    "https://dy-rooms-1259317024.cos.ap-shanghai.myqcloud.com/%E8%A5%BF%E6%96%AF%E5%BB%B7%E6%95%99%E5%A0%82.mp4";

  // 创建视频纹理
  texture = new THREE.VideoTexture(video);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.format = THREE.RGBAFormat;

  // 创建球体几何体（视频在内部）
  const geometry = new THREE.SphereGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1); // 翻转球体，使纹理在内部可见

  // 创建材质
  const material = new THREE.MeshBasicMaterial({ map: texture });

  // 创建网格
  sphere = new THREE.Mesh(geometry, material);
  scene.add(sphere);

  // 添加事件监听
  addEventListeners();

  // 开始渲染循环
  animate();
};

// 初始化视频
const initVideo = () => {
  errorMessage.value = "";
  isLoading.value = true;
  loadingProgress.value = 0;
  initThreeJS();
};

// 渲染循环
const animate = () => {
  requestAnimationFrame(animate);
  update();
  renderer.render(scene, camera);
};

// 更新相机位置
const update = () => {
  if (!isUserInteracting) {
    // 自动旋转效果（可选）
    // lon += 0.1;
  }

  lat = Math.max(-85, Math.min(85, lat));
  phi = THREE.MathUtils.degToRad(90 - lat);
  theta = THREE.MathUtils.degToRad(lon);

  camera.target = new THREE.Vector3(
    500 * Math.sin(phi) * Math.cos(theta),
    500 * Math.cos(phi),
    500 * Math.sin(phi) * Math.sin(theta)
  );

  camera.lookAt(camera.target);
};

// 添加交互事件监听
const addEventListeners = () => {
  // 鼠标事件
  containerRef.value.addEventListener("mousedown", onPointerDown);
  containerRef.value.addEventListener("mousemove", onPointerMove);
  containerRef.value.addEventListener("mouseup", onPointerUp);
  containerRef.value.addEventListener("wheel", onMouseWheel);

  // 触摸事件
  containerRef.value.addEventListener("touchstart", onTouchStart);
  containerRef.value.addEventListener("touchmove", onTouchMove);
  containerRef.value.addEventListener("touchend", onTouchEnd);

  // 窗口大小改变
  window.addEventListener("resize", onWindowResize);

  // 鼠标移动显示控制面板
  containerRef.value.addEventListener("mousemove", showControlsTemporarily);
  containerRef.value.addEventListener("touchstart", showControlsTemporarily);
};

// 鼠标按下
const onPointerDown = (event) => {
  isUserInteracting = true;
  onPointerDownMouseX = event.clientX;
  onPointerDownMouseY = event.clientY;
  onPointerDownLon = lon;
  onPointerDownLat = lat;
};

// 鼠标移动
const onPointerMove = (event) => {
  if (!isUserInteracting) return;

  lon = (onPointerDownMouseX - event.clientX) * 0.1 + onPointerDownLon;
  lat = (event.clientY - onPointerDownMouseY) * 0.1 + onPointerDownLat;
};

// 鼠标释放
const onPointerUp = () => {
  isUserInteracting = false;
};

// 鼠标滚轮缩放
const onMouseWheel = (event) => {
  event.preventDefault();
  const fov = camera.fov + event.deltaY * 0.05;
  camera.fov = THREE.MathUtils.clamp(fov, 40, 100);
  camera.updateProjectionMatrix();
};

// 触摸开始
const onTouchStart = (event) => {
  if (event.touches.length === 1) {
    isUserInteracting = true;
    onPointerDownMouseX = event.touches[0].clientX;
    onPointerDownMouseY = event.touches[0].clientY;
    onPointerDownLon = lon;
    onPointerDownLat = lat;
  }
};

// 触摸移动
const onTouchMove = (event) => {
  if (!isUserInteracting || event.touches.length !== 1) return;

  lon =
    (onPointerDownMouseX - event.touches[0].clientX) * 0.1 + onPointerDownLon;
  lat =
    (event.touches[0].clientY - onPointerDownMouseY) * 0.1 + onPointerDownLat;
};

// 触摸结束
const onTouchEnd = () => {
  isUserInteracting = false;
};

// 窗口大小改变
const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

// 临时显示控制面板
const showControlsTemporarily = () => {
  showControls.value = true;
  clearTimeout(controlsTimeout);
  controlsTimeout = setTimeout(() => {
    if (isPlaying.value) {
      showControls.value = false;
    }
  }, 3000);
};

// 播放/暂停
const togglePlay = () => {
  if (video.paused) {
    video.play();
    isPlaying.value = true;
  } else {
    video.pause();
    isPlaying.value = false;
  }
};

// 跳转视频
const seekVideo = (event) => {
  const time = parseFloat(event.target.value);
  video.currentTime = time;
  currentTime.value = time;
};

// 切换静音
const toggleMute = () => {
  video.muted = !video.muted;
  isMuted.value = video.muted;
};

// 改变音量
const changeVolume = (event) => {
  const vol = parseFloat(event.target.value);
  video.volume = vol;
  volume.value = vol;
  isMuted.value = vol === 0;
};

// 切换全屏
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    containerRef.value.parentElement.requestFullscreen();
    isFullscreen.value = true;
  } else {
    document.exitFullscreen();
    isFullscreen.value = false;
  }
};

// 全屏状态改变监听
const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement;
};

// 格式化时间
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// 组件挂载
onMounted(() => {
  initVideo();
  document.addEventListener("fullscreenchange", onFullscreenChange);
});

// 组件卸载前清理
onBeforeUnmount(() => {
  if (video) {
    video.pause();
    video.src = "";
  }
  if (renderer) {
    renderer.dispose();
  }
  if (texture) {
    texture.dispose();
  }
  document.removeEventListener("fullscreenchange", onFullscreenChange);
  window.removeEventListener("resize", onWindowResize);
  clearTimeout(controlsTimeout);
});
</script>

<style scoped>
.video-360-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #000;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
}

.canvas-container {
  width: 100%;
  height: 100%;
  cursor: grab;
}

.canvas-container:active {
  cursor: grabbing;
}

/* 返回按钮 */
.back-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50px;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-btn:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: translateX(-5px);
}

.back-icon {
  font-size: 20px;
}

/* 标题覆盖层 */
.title-overlay {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 90;
  text-align: center;
  pointer-events: none;
}

.title {
  color: #fff;
  font-size: 2rem;
  font-weight: 700;
  margin: 0;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
}

.subtitle {
  color: rgba(255, 255, 255, 0.9);
  font-size: 1rem;
  margin: 5px 0 0 0;
  text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.8);
}

/* 加载覆盖层 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
}

.loading-spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(255, 255, 255, 0.1);
  border-top: 4px solid #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.loading-text {
  color: #fff;
  font-size: 1.2rem;
  margin-top: 20px;
}

.loading-progress {
  color: rgba(255, 255, 255, 0.7);
  font-size: 1rem;
  margin-top: 10px;
}

/* 错误覆盖层 */
.error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.9);
  z-index: 1000;
}

.error-content {
  text-align: center;
  padding: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  backdrop-filter: blur(10px);
}

.error-icon {
  font-size: 4rem;
}

.error-text {
  color: #fff;
  font-size: 1.2rem;
  margin: 20px 0;
}

.retry-btn {
  padding: 12px 30px;
  background: #667eea;
  border: none;
  border-radius: 25px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.retry-btn:hover {
  background: #5568d3;
  transform: translateY(-2px);
}

/* 控制面板 */
.controls-panel {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 20px 30px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  backdrop-filter: blur(10px);
  transition: opacity 0.3s ease, transform 0.3s ease;
  opacity: 0;
  transform: translateY(100%);
}

.controls-panel.controls-visible {
  opacity: 1;
  transform: translateY(0);
}

.control-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  width: 45px;
  height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  flex-shrink: 0;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.play-btn {
  width: 50px;
  height: 50px;
  font-size: 1.4rem;
}

/* 进度条容器 */
.progress-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.progress-bar::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.progress-bar::-webkit-slider-thumb:hover {
  transform: scale(1.3);
}

.progress-bar::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
  transition: transform 0.2s ease;
}

.progress-bar::-moz-range-thumb:hover {
  transform: scale(1.3);
}

.time-display {
  display: flex;
  justify-content: space-between;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
}

/* 音量控制 */
.volume-control {
  display: flex;
  align-items: center;
  gap: 10px;
}

.volume-slider {
  width: 80px;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #fff;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

/* 提示覆盖层 */
.hint-overlay {
  position: fixed;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 90;
  pointer-events: none;
  animation: fadeInOut 3s ease forwards;
}

.hint-text {
  color: #fff;
  font-size: 1rem;
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 25px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin: 0;
}

@keyframes fadeInOut {
  0%,
  100% {
    opacity: 0;
  }
  10%,
  90% {
    opacity: 1;
  }
}

/* 平板和手机适配 */
@media (max-width: 768px) {
  .title {
    font-size: 1.5rem;
  }

  .subtitle {
    font-size: 0.9rem;
  }

  .back-btn {
    padding: 10px 15px;
    font-size: 14px;
  }

  .back-text {
    display: none;
  }

  .controls-panel {
    padding: 15px 20px;
    gap: 10px;
  }

  .control-btn {
    width: 40px;
    height: 40px;
    font-size: 1rem;
  }

  .play-btn {
    width: 45px;
    height: 45px;
  }

  .volume-control {
    display: none;
  }

  .hint-text {
    font-size: 0.9rem;
    padding: 10px 20px;
  }
}

/* 小屏幕优化 */
@media (max-width: 480px) {
  .title {
    font-size: 1.2rem;
  }

  .controls-panel {
    padding: 10px 15px;
  }

  .progress-container {
    flex: 1;
  }

  .time-display {
    font-size: 0.75rem;
  }
}
</style>
