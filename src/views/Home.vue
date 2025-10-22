<template>
  <div class="home-container">
    <!-- 头部标题 -->
    <header class="header">
      <h1 class="title">探索罗马</h1>
      <p class="subtitle">发现永恒之城的历史与文化</p>
    </header>

    <!-- 场景卡片网格 -->
    <div class="scenes-grid">
      <div
        v-for="(scene, index) in scenes"
        :key="scene.id"
        class="scene-card"
        :style="{ animationDelay: `${index * 0.1}s` }"
        @click="goToScene(scene.id)"
        @touchstart="handleTouchStart"
        @touchend="handleTouchEnd"
      >
        <div class="card-inner">
          <!-- 场景图片占位 -->
          <div class="scene-image" :style="{ background: scene.color }">
            <div class="image-placeholder">
              <span class="icon" v-if="!scene.image">{{ scene.icon }}</span>
              <img v-else :src="getAssetsImage(scene.image)" srcset="" />
            </div>
          </div>

          <!-- 场景信息 -->
          <div class="scene-info">
            <h2 class="scene-title">{{ scene.name }}</h2>
            <p class="scene-description">{{ scene.brief }}</p>
            <div class="explore-btn">
              <span>探索</span>
              <span class="arrow">→</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { getAssetsImage } from "@/util/index.js";

const router = useRouter();

// 场景数据
const scenes = ref([
  {
    id: "forum",
    name: "罗马广场",
    brief: "古罗马帝国的政治、经济和宗教中心",
    color: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
    image: "2958856.jpg",
    icon: "🏛️",
  },
  {
    id: "colosseum",
    name: "罗马斗兽场",
    brief: "古罗马最伟大的竞技场，见证千年历史",
    color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    image: "389011.jpg",
    icon: "🏟️",
  },
  {
    id: "vatican",
    name: "梵蒂冈博物馆",
    brief: "世界上最伟大的艺术宝库，珍藏无数艺术瑰宝",
    color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    image: "Inside Vatican Museums.jpg",
    icon: "🎨",
  },
  {
    id: "sistine",
    name: "西斯廷教堂",
    brief: "米开朗基罗的艺术杰作，穹顶壁画震撼人心",
    color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    image: "Sistine.jpg",
    icon: "⛪",
  },
]);

// 触摸反馈
let touchStartTime = 0;
const handleTouchStart = () => {
  touchStartTime = Date.now();
};

const handleTouchEnd = () => {
  touchStartTime = 0;
};

// 跳转到场景详情
const goToScene = (id) => {
  router.push({ name: "SceneDetail", params: { id } });
};
</script>

<style scoped>
.home-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(to bottom, #0f2027, #203a43, #2c5364);
  padding: 2rem 2rem 3rem;
  box-sizing: border-box;
}

/* 头部 */
.header {
  text-align: center;
  margin-bottom: 3rem;
  animation: fadeInDown 0.8s ease;
}

.title {
  font-size: 3rem;
  color: #ffffff;
  margin: 0;
  font-weight: 700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.subtitle {
  font-size: 1.2rem;
  color: #b8c6db;
  margin-top: 0.5rem;
  font-weight: 300;
}

/* 场景网格 */
.scenes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* 场景卡片 */
.scene-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: fadeInUp 0.6s ease both;
}

.scene-card:hover {
  transform: translateY(-10px) scale(1.02);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.scene-card:active {
  transform: translateY(-5px) scale(0.98);
}

.card-inner {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 场景图片区域 */
.scene-image {
  height: 250px;
  position: relative;
  overflow: hidden;
}

.image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 5rem;
  transition: transform 0.3s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.scene-card:hover .image-placeholder {
  transform: scale(1.1) rotate(5deg);
}

.icon {
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

/* 场景信息 */
.scene-info {
  padding: 1.5rem;
  background: rgba(255, 255, 255, 0.95);
  flex: 1;
  display: flex;
  flex-direction: column;
}

.scene-title {
  font-size: 1.8rem;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.scene-description {
  font-size: 1rem;
  color: #5a6c7d;
  line-height: 1.6;
  margin: 0 0 1rem 0;
  flex: 1;
}

.explore-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #667eea;
  font-weight: 600;
  font-size: 1.1rem;
  transition: gap 0.3s ease;
}

.scene-card:hover .explore-btn {
  gap: 1rem;
}

.arrow {
  transition: transform 0.3s ease;
}

.scene-card:hover .arrow {
  transform: translateX(5px);
}

/* 动画 */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 平板横屏适配 */
@media (orientation: landscape) and (min-width: 768px) {
  .scenes-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .scene-image {
    height: 200px;
  }

  .title {
    font-size: 2.5rem;
  }
}

/* 平板竖屏适配 */
@media (orientation: portrait) and (max-width: 768px) {
  .home-container {
    padding: 1.5rem;
  }

  .scenes-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .title {
    font-size: 2.2rem;
  }

  .scene-image {
    height: 220px;
  }
}

/* 大屏幕优化 */
@media (min-width: 1200px) {
  .scenes-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
