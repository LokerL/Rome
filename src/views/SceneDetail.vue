<template>
  <div class="detail-container">
    <!-- 返回按钮 -->
    <button class="back-button" @click="goBack">
      <span class="back-arrow">←</span>
      <span>返回</span>
    </button>

    <!-- 场景内容 -->
    <div v-if="sceneData" class="scene-content" :class="{ loaded: isLoaded }">
      <!-- 顶部标题区域 -->
      <div class="scene-header">
        <h1 class="scene-title">{{ sceneData.name }}</h1>
        <div class="title-divider"></div>
      </div>

      <!-- 标志性元素切换 -->
      <div v-if="sceneData.highlights?.length" class="highlight-tabs">
        <button
          v-for="(highlight, index) in sceneData.highlights"
          :key="highlight.id"
          :class="['highlight-tab', { active: index === activeHighlightIndex }]"
          @click="selectHighlight(index)"
        >
          <span class="tab-icon">{{ highlight.icon }}</span>
          <div class="tab-text">
            <span class="tab-name">{{ highlight.name }}</span>
            <span class="tab-meta">{{ highlight.period }}</span>
          </div>
        </button>
      </div>

      <!-- 媒体预览区域 -->
      <div class="media-viewer-container">
        <ThreeModelViewer
          v-if="currentMediaType === 'model'"
          :key="currentHighlight?.id || id"
          :scene-id="id"
          :model-url="currentMediaSrc"
          :placeholder-color="
            currentHighlight?.placeholderColor || sceneData.color
          "
          :placeholder-icon="
            currentHighlight?.placeholderIcon || sceneData.icon
          "
        />
        <div v-else-if="currentMediaType === 'image'" class="media-wrapper">
          <img
            v-if="currentMediaSrc"
            :src="currentMediaSrc"
            :alt="currentHighlight?.name"
            loading="lazy"
            class="media-element"
          />
          <div v-else class="media-fallback">暂未提供图片资源</div>
        </div>
        <div v-else-if="currentMediaType === 'video'" class="media-wrapper">
          <video
            v-if="currentMediaSrc"
            :src="currentMediaSrc"
            class="media-element"
            controls
            preload="metadata"
            playsinline
            :poster="currentMediaPoster || undefined"
          >
            您的浏览器暂不支持视频播放。
          </video>
          <div v-else class="media-fallback">暂未提供视频资源</div>
        </div>
        <div v-else class="media-wrapper">
          <div class="media-fallback">暂未配置媒体内容</div>
        </div>
      </div>

      <div v-if="currentHighlight" class="highlight-details">
        <div class="highlight-card">
          <h2 class="section-title">标志性元素</h2>
          <h3 class="highlight-title">{{ currentHighlight.name }}</h3>
          <p v-if="currentHighlight.location" class="highlight-location">
            {{ currentHighlight.location }}
          </p>
          <div class="description-content">
            <p
              v-for="(paragraph, index) in currentHighlight.description"
              :key="index"
              class="paragraph"
            >
              {{ paragraph }}
            </p>
          </div>
        </div>

        <div v-if="currentHighlight.stats?.length" class="highlight-stats">
          <div
            v-for="stat in currentHighlight.stats"
            :key="stat.label"
            class="highlight-stat"
          >
            <span class="stat-label">{{ stat.label }}</span>
            <span class="stat-value">{{ stat.value }}</span>
          </div>
        </div>

        <div v-if="currentHighlight.quickFacts?.length" class="highlight-facts">
          <h3 class="facts-title">重点提示</h3>
          <ul>
            <li
              v-for="(fact, index) in currentHighlight.quickFacts"
              :key="index"
            >
              {{ fact }}
            </li>
          </ul>
        </div>
      </div>

      <!-- 详细介绍区域 -->
      <div class="content-section">
        <div class="info-card">
          <h2 class="section-title">景点概览</h2>
          <div class="description-content">
            <p
              v-for="(paragraph, index) in sceneData.description"
              :key="index"
              class="paragraph"
            >
              {{ paragraph }}
            </p>
          </div>
        </div>

        <!-- 关键信息卡片 -->
        <div class="info-grid">
          <div
            v-for="(info, index) in sceneData.keyInfo"
            :key="index"
            class="info-item"
            :style="{ animationDelay: `${index * 0.1}s` }"
          >
            <div class="info-icon">{{ info.icon }}</div>
            <div class="info-content">
              <h3 class="info-title">{{ info.title }}</h3>
              <p class="info-text">{{ info.text }}</p>
            </div>
          </div>
        </div>

        <!-- 有趣的事实 -->
        <div class="facts-card">
          <h2 class="section-title">💡 有趣的事实</h2>
          <ul class="facts-list">
            <li
              v-for="(fact, index) in sceneData.facts"
              :key="index"
              class="fact-item"
            >
              {{ fact }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <p>抱歉，未找到该场景的信息。</p>
      <button class="back-button secondary" @click="goBack">返回主页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import ThreeModelViewer from "../components/ThreeModelViewer.vue";

const assetModules = import.meta.glob("../assets/**/*", {
  eager: true,
  as: "url",
});

const normalizeAssetKey = (path) => {
  if (!path) return null;
  return path.replace(/^[./\\]+/, "").replace(/\\/g, "/");
};

const resolveAssetPath = (path) => {
  const normalized = normalizeAssetKey(path);
  if (!normalized) return null;

  if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith("data:")) {
    return normalized;
  }

  let sanitized = normalized;
  if (sanitized.startsWith("src/assets/")) {
    sanitized = sanitized.slice("src/assets/".length);
  }
  if (sanitized.startsWith("assets/")) {
    sanitized = sanitized.slice("assets/".length);
  }

  const candidate = `../assets/${sanitized}`;
  if (candidate in assetModules) {
    return assetModules[candidate];
  }

  const fallbackCandidate = `../assets/${encodeURI(sanitized)}`;
  if (fallbackCandidate in assetModules) {
    return assetModules[fallbackCandidate];
  }

  console.warn(`[SceneDetail] 未找到本地资源: ${normalized}`);
  return null;
};

const router = useRouter();
const route = useRoute();
const id = computed(() => route.params.id);

// 场景数据库
const scenesDatabase = {
  forum: {
    id: "forum",
    name: "罗马广场",
    color: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
    icon: "🏛️",
    description: [
      "罗马广场（Forum Romanum）坐落在帕拉蒂尼山与卡比托利欧山之间，自公元前7世纪起逐步发展为古罗马的政治、宗教与商业中心。市民在此举行集会，元老院在此辩论，胜利的凯旋者也会在这里接受欢迎。",
      "广场曾聚集了壮丽的神庙、长方形大殿、凯旋门和市场，构成古罗马城市生活的核心。尽管如今大多只剩遗迹，但每一块石头仍然诉说着帝国的兴衰与荣耀。",
      "从凯旋大道（Via Sacra）穿行而过，游客可沿着历史的脉络，探索朱利亚大教堂、维斯塔贞女之家和萨图恩神庙等标志性建筑，感受罗马文明的恢弘。",
    ],
    keyInfo: [
      { icon: "📅", title: "兴起时期", text: "公元前7世纪至公元5世纪" },
      { icon: "🏛️", title: "主要职能", text: "政治中心、宗教仪式、商业活动" },
      { icon: "🛤️", title: "核心道路", text: "凯旋大道（Via Sacra）" },
      { icon: "🌍", title: "世界遗产", text: "1980年列入联合国教科文组织名录" },
    ],
    facts: [
      "凯撒大帝曾在广场上发表演讲，争取民众支持其改革。",
      "凯旋大道连接斗兽场与卡比托利欧山，是凯旋仪式的必经之路。",
      "中世纪时期广场沦为牧场，曾被称为“Campo Vaccino”（牛场）。",
      "18世纪的考古发掘揭示了大量埋藏的神庙与基座。",
      "如今的遗址展示了古罗马建筑从共和到帝国时期的演变。",
    ],
    highlights: [
      {
        id: "forum-basilica-julia",
        name: "朱利亚大教堂",
        icon: "⚖️",
        period: "公元前54年重建",
        location: "位于广场南侧，凯撒与奥古斯都时期的司法中心。",
        mediaType: "image",
        mediaSrc: "https://img.j8.je/images/2025/10/24/Uih.jpg",
        description: [
          "朱利亚大教堂（Basilica Julia）由尤利乌斯·凯撒发起重建，后由奥古斯都完成，用于民事法庭与商业交易。宽阔的大厅内设有多排柱廊，二层阳台为旁听者提供空间。",
          "古罗马的陪审团在此审理贸易纠纷和财产权案件，地面的大理石棋盘刻痕仍记录着等待审理时市民的消遣。",
        ],
        stats: [
          { label: "平面尺寸", value: "长101米 × 宽49米" },
          { label: "柱式风格", value: "地面层陶立克柱、二层爱奥尼柱" },
          { label: "遗存亮点", value: "大理石地坪与法庭基座" },
        ],
        quickFacts: [
          "部分大理石台阶在中世纪被拆用作其他建筑。",
          "考古证据显示，这里曾挂有征税与继承法的公告。",
        ],
        placeholderIcon: "⚖️",
        placeholderColor: "linear-gradient(135deg, #f79d65 0%, #fbc687 100%)",
      },
      // {
      //   id: "forum-vestal-house",
      //   name: "维斯塔贞女之家",
      //   icon: "🔥",
      //   period: "公元前3世纪修缮",
      //   location: "萨图恩神庙旁，守护圣火的女祭司居所。",
      //   mediaType: "image",
      //   mediaSrc: "imgs/2958856.jpg",
      //   description: [
      //     "维斯塔贞女之家（Atrium Vestae）是维斯塔女祭司的生活区，环绕庭院而建，中央水池象征着纯洁。女祭司负责守护维斯塔神庙中的永恒圣火，被视为罗马安全的象征。",
      //     "贞女们享有崇高地位与优厚待遇，但若违反贞洁誓言将被严厉惩戒。庭院中的雕像底座仍铭刻着历任女祭司的名字。",
      //   ],
      //   stats: [
      //     { label: "建筑层数", value: "三层回廊" },
      //     { label: "庭院元素", value: "中央水池与花坛" },
      //     { label: "宗教意义", value: "守护罗马的永恒之火" },
      //   ],
      //   quickFacts: [
      //     "圣火一旦熄灭，被视为灾难预兆，需要特别仪式重新点燃。",
      //     "贞女任期最长可达30年，满期后可自由选择生活。",
      //   ],
      //   placeholderIcon: "🔥",
      //   placeholderColor: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
      // },
      {
        id: "forum-arch-titus",
        name: "提图斯凯旋门",
        icon: "🎖️",
        period: "公元81年",
        location: "凯旋大道东段，通往帕拉蒂尼山的要道。",
        mediaType: "image",
        mediaSrc: "https://img.j8.je/images/2025/10/24/vtm.jpg",
        description: [
          "提图斯凯旋门纪念提图斯皇帝镇压犹太起义的胜利，是罗马现存最古老的凯旋门之一。门内浮雕描绘罗马军团携带耶路撒冷圣殿七枝烛台的场景。",
          "凯旋仪式中，胜利者将穿过此门进入广场，象征荣耀归来。它也成为后世凯旋门建筑的范本。",
        ],
        stats: [
          { label: "总高度", value: "15.4米" },
          { label: "建筑材料", value: "白色大理石与火山凝灰岩" },
          { label: "雕塑主题", value: "胜利女神与凯旋游行" },
        ],
        quickFacts: [
          "19世纪曾经过大规模修复，以防崩塌。",
          "浮雕为研究罗马凯旋仪式提供珍贵影像。",
        ],
        placeholderIcon: "🎖️",
        placeholderColor: "linear-gradient(135deg, #fdd5a6 0%, #fba26c 100%)",
      },
    ],
  },
  colosseum: {
    id: "colosseum",
    name: "罗马斗兽场",
    color: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    icon: "🏟️",
    description: [
      "罗马斗兽场（Colosseo）原名弗拉维圆形剧场，是古罗马最大、最具代表性的公共娱乐建筑，可容纳5万至8万观众。",
      "椭圆形结构由四层拱廊组成，石灰华与砖混材料共同支撑庞大的看台系统，复杂的通道确保观众快速入场与疏散。",
      "斗兽场不仅上演角斗士殊死搏斗，也举办海战、水上狩猎等奢华表演，是帝国实力的象征。",
    ],
    keyInfo: [
      { icon: "📅", title: "建造时期", text: "公元70-80年" },
      { icon: "👥", title: "观众容量", text: "约50,000 - 80,000人" },
      { icon: "📐", title: "建筑尺度", text: "轴长189米 × 轴宽156米 × 高48米" },
      { icon: "🗂️", title: "功能分区", text: "竞技场、地下层Hypogeum、观众席" },
    ],
    facts: [
      "地下层拥有约80条通道与升降平台，可快速调度野兽与布景。",
      "演出开始前会铺设可开合的天幕（Velarium）遮挡烈日。",
      "教皇本笃十四世在18世纪将其视为殉道者圣地，制止石料盗取。",
      "自18世纪起成为考古与保护工程的重点对象。",
      "2000年起每逢废除死刑或重大赦免事件会点亮夜间灯光。",
    ],
    highlights: [
      {
        id: "colosseum-arena",
        name: "竞技场舞台",
        icon: "🛡️",
        period: "公元1世纪",
        location: "椭圆中央区域，覆于木制平台之上。",
        mediaType: "model",
        mediaSrc: "model/Colosseo-Roma/Colosseo-Roma.gltf",
        description: [
          "原始竞技场地面由木板铺设，并覆盖黄色沙层（Arena一词即源于“沙”），吸收血迹并提供防滑表面。",
          "现代修复的舞台展示了部分木板结构，让观众得以俯瞰地下层布局并感受角斗发生的空间尺度。",
        ],
        stats: [
          { label: "舞台尺寸", value: "长83米 × 宽48米" },
          { label: "地面材质", value: "木板 + 沙层" },
          { label: "修复工程", value: "2014-2021年分阶段完成" },
        ],
        quickFacts: [
          "剧场可通过机械装置在舞台上演模拟海战。",
          "角斗士入场时会向皇帝敬礼：“向您致敬，即将死去的人向您问好”。",
        ],
        placeholderIcon: "🛡️",
        placeholderColor: "linear-gradient(135deg, #6a7cff 0%, #8f6bff 100%)",
      },
      // {
      //   id: "colosseum-hypogeum",
      //   name: "地下层 Hypogeum",
      //   icon: "🕳️",
      //   period: "公元1-2世纪扩建",
      //   location: "舞台下方的双层通道与笼舍网络。",
      //   mediaType: "video",
      //   mediaSrc:
      //     "https://cdn.coverr.co/videos/coverr-rome-colosseum-1584368802793?download=1",
      //   mediaPoster:
      //     "https://upload.wikimedia.org/wikipedia/commons/d/d2/Colosseum_in_Rome%2C_Italy_-_April_2007.jpg",
      //   description: [
      //     "Hypogeum复杂的走廊与笼舍用于安置猛兽、囚犯以及舞台布景，通过升降机与滑轮系统将其送至舞台。",
      //     "通道墙面保留了导轨与铁环的痕迹，考古学家借助它们复原了舞台机动系统的真实运作方式。",
      //   ],
      //   stats: [
      //     { label: "通道数量", value: "约80条交错走廊" },
      //     { label: "升降平台", value: "估计有28个升降装置" },
      //     { label: "照明方式", value: "火把与天窗补光" },
      //   ],
      //   quickFacts: [
      //     "地下层在斗兽场建成后约10年才完工，为表演增添戏剧性。",
      //     "现代参观需提前预约导览才能进入。",
      //   ],
      //   placeholderIcon: "🕳️",
      //   placeholderColor: "linear-gradient(135deg, #5b5f9a 0%, #907ad6 100%)",
      // },
      // {
      //   id: "colosseum-facade",
      //   name: "外立面拱廊",
      //   icon: "🏛️",
      //   period: "公元1世纪",
      //   location: "环绕建筑四周的四层拱券与柱式系统。",
      //   mediaType: "image",
      //   mediaSrc:
      //     "https://upload.wikimedia.org/wikipedia/commons/3/3a/Colosseo_2020.jpg",
      //   description: [
      //     "斗兽场外立面采用陶立克、爱奥尼与科林斯三种柱式自下而上递进，展现罗马对希腊柱式的再造。",
      //     "拱廊曾悬挂帝国与诸神雕像，券口编号便于观众迅速找到座位区。",
      //   ],
      //   stats: [
      //     { label: "拱券数量", value: "1-3层各80道拱券" },
      //     { label: "顶层形式", value: "实体墙+科林斯壁柱" },
      //     { label: "结构材质", value: "石灰华、砖与凝灰岩" },
      //   ],
      //   quickFacts: [
      //     "中世纪曾拆取铁钉与石块用于其他建筑，留下铅夹孔洞。",
      //     "夜间灯光秀会以不同色彩突出拱廊层次。",
      //   ],
      //   placeholderIcon: "🏛️",
      //   placeholderColor: "linear-gradient(135deg, #7f8cff 0%, #5c4aff 100%)",
      // },
    ],
  },
  vatican: {
    id: "vatican",
    name: "梵蒂冈博物馆",
    color: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    icon: "🎨",
    description: [
      "梵蒂冈博物馆（Musei Vaticani）源自教皇儒略二世的私人收藏，如今拥有20多个专题博物馆与画廊，串联成绵延约7公里的艺术长廊。",
      "藏品跨越古埃及、古希腊、古罗马、文艺复兴与现代艺术，展现教廷对艺术赞助与保存的悠久传统。",
      "游客沿着既定路线依次造访地图廊、拉斐尔画室、西斯廷礼拜堂等经典空间，感受视觉与精神的双重盛宴。",
    ],
    keyInfo: [
      { icon: "📅", title: "开馆年份", text: "1506年" },
      { icon: "🎟️", title: "年参观量", text: "约600万游客" },
      { icon: "🖼️", title: "藏品规模", text: "登记藏品超过70,000件" },
      { icon: "🚶", title: "参观路线", text: "全程约7公里，需要3小时以上" },
    ],
    facts: [
      "布拉曼特螺旋楼梯的现代版本建于1930年代，是摄影热点。",
      "拉斐尔画室的壁画由拉斐尔与其工作室共同完成。",
      "地图廊收藏了1580年代根据测地图绘制的意大利全境地图。",
      "博物馆每周五晚间开放夜间参观，需提前预约。",
      "馆内餐厅能眺望圣彼得大教堂穹顶。",
    ],
    highlights: [
      {
        id: "vatican-bramante-stair",
        name: "布拉曼特楼梯",
        icon: "🌀",
        period: "1932年现代重建",
        location: "圆形庭院内，连接入口与出口的双螺旋坡道。",
        mediaType: "image",
        mediaSrc:
          // "imgs/The Famous Double Spiral Staircase At The Vatican Museums.jpg",
          "https://img.j8.je/images/2025/10/24/vqQ.jpg",
        description: [
          "布拉曼特楼梯以双螺旋设计著称，上下行人互不干扰。现代版本由朱塞佩·莫莫设计，灵感来自16世纪原版楼梯。",
          "钢与大理石结合的流线造型，配合自然采光，营造出富有未来感的空间体验，是梵蒂冈博物馆的“压轴”景点。",
        ],
        stats: [
          { label: "坡道宽度", value: "4米" },
          { label: "旋转圈数", value: "2圈独立螺旋" },
          { label: "设计者", value: "朱塞佩·莫莫" },
        ],
        quickFacts: [
          "常被误认为是达·芬奇设计，实则为现代作品。",
          "采用缓坡设计，方便携带大型文物进出。",
        ],
        placeholderIcon: "🌀",
        placeholderColor: "linear-gradient(135deg, #f7a1ff 0%, #f5576c 100%)",
      },
      // {
      //   id: "vatican-porphyry-basin",
      //   name: "斑岩盆地",
      //   icon: "🪨",
      //   period: "公元2世纪",
      //   location: "圆厅（Sala Rotonda）中央，出自尼禄的金宫。",
      //   mediaType: "image",
      //   mediaSrc:
      //     "https://upload.wikimedia.org/wikipedia/commons/9/97/Rotunda_room_basin_Vatican_Museums.jpg",
      //   description: [
      //     "直径近5米的斑岩盆地由稀有的埃及红斑岩整石雕刻而成，原置于尼禄金宫，后移入梵蒂冈博物馆。",
      //     "盆地象征皇权与奢华，斑岩石材因硬度极高而难加工，是帝王才能享用的材料。",
      //   ],
      //   stats: [
      //     { label: "直径", value: "4.57米" },
      //     { label: "材质", value: "埃及红斑岩" },
      //     { label: "重量估计", value: "约40吨" },
      //   ],
      //   quickFacts: [
      //     "圆厅的拱顶仿照万神庙设计，形成庄严背景。",
      //     "斑岩因开采困难，在古罗马被视为皇帝专属。",
      //   ],
      //   placeholderIcon: "🪨",
      //   placeholderColor: "linear-gradient(135deg, #f8a5ae 0%, #f76a8c 100%)",
      // },
      {
        id: "vatican-school-of-athens",
        name: "《雅典学院》",
        icon: "📚",
        period: "1509-1511年",
        location: "拉斐尔画室中的签字厅，象征哲学学科。",
        mediaType: "video",
        mediaSrc: "videos/vatican-school-of-athens.mp4",
        description: [
          "《雅典学院》集合古代哲学大师于同一空间，柏拉图与亚里士多德居中而立，呈现理性与经验的对话。",
          "拉斐尔巧妙地将同时代艺术家入画：柏拉图面孔借鉴达·芬奇，赫拉克利特则是米开朗基罗的肖像。",
        ],
        stats: [
          { label: "画作尺寸", value: "500 cm × 770 cm" },
          { label: "媒材", value: "湿壁画" },
          { label: "人物数量", value: "约60位哲学家与学者" },
        ],
        quickFacts: [
          "四面壁画分别象征哲学、诗歌、神学与法学。",
          "作品中的自画像隐藏在右侧身穿黑帽的年轻人。",
        ],
        placeholderIcon: "📚",
        placeholderColor: "linear-gradient(135deg, #f6b4ff 0%, #f55f73 100%)",
      },
    ],
  },
  sistine: {
    id: "sistine",
    name: "西斯廷教堂",
    color: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    icon: "⛪",
    description: [
      "西斯廷礼拜堂（Cappella Sistina）以米开朗基罗创作的穹顶与祭坛壁画闻名，是文艺复兴艺术的巅峰之作。",
      "教堂长40.9米、宽13.4米，与所罗门圣殿的尺寸相同，象征对圣经传统的传承。",
      "每逢教皇选举（秘密会议）仍在此举行，使教堂成为艺术与宗教权力的交汇点。",
    ],
    keyInfo: [
      { icon: "📅", title: "建造时间", text: "1473-1481年（西斯都四世主持）" },
      { icon: "🎨", title: "穹顶绘制", text: "米开朗基罗，1508-1512年" },
      { icon: "🖼️", title: "祭坛壁画", text: "《最后的审判》，1536-1541年" },
      { icon: "🕯️", title: "礼仪功能", text: "教皇私人礼拜与秘密会议场所" },
    ],
    facts: [
      "穹顶壁画面积超过500平方米，包含300多个独立人物。",
      "米开朗基罗原本以雕塑家自居，绘制壁画是教皇的命令。",
      "1980-1994年的修复揭示了原先明亮的色彩与细节。",
      "教堂内部禁止拍照，保持宗教庄严与版权保护。",
      "进入教堂前需着装得体，肩膀与膝盖需被遮蔽。",
    ],
    highlights: [
      {
        id: "sistine-creation",
        name: "《创世纪》穹顶",
        icon: "🌌",
        period: "1508-1512年",
        location: "穹顶中央九幅画面讲述《创世纪》。",
        mediaType: "model",
        mediaSrc: "model/sistine-creation/scene.gltf",
        description: [
          "穹顶的九幅核心画面从《光暗之分》到《诺亚醉酒》，逐步呈现世界的创造、堕落与救赎。最著名的《创造亚当》描绘上帝指尖即将触碰亚当，象征生命传递。",
          "环绕核心画面的是先知与西比尔女巫，他们肩负传递救世预言的使命，与旧约人物共同构成宏大的神圣叙事。",
        ],
        stats: [
          { label: "核心画幅", value: "9幅矩形画面" },
          { label: "人物数量", value: "超过300人" },
          { label: "绘画技法", value: "湿壁画 + 夸张透视 foreshortening" },
        ],
        quickFacts: [
          "米开朗基罗搭建巨大脚手架，长期仰头作画导致颈背疼痛。",
          "《创造亚当》成为现代视觉文化引用最多的图像之一。",
        ],
        placeholderIcon: "🌌",
        placeholderColor: "linear-gradient(135deg, #4facfe 0%, #5ce1ff 100%)",
      },
      {
        id: "sistine-last-judgement",
        name: "《最后的审判》",
        icon: "⚖️",
        period: "1536-1541年",
        location: "祭坛墙面巨幅壁画，俯瞰整个教堂。",
        mediaType: "image",
        mediaSrc: "imgs/Eljuiciofinal-encuentra.com_.jpg",
        description: [
          "《最后的审判》描绘基督在末日审判世人的场景，上方圣徒环绕，中央的基督手势象征裁决，下方是复活与坠入地狱的灵魂。",
          "米开朗基罗在此采用大胆的动态构图与肌肉刻画，反映宗教改革时期的紧张氛围。后期为遵守教会规范，部分裸体被披上“贞洁布”。",
        ],
        stats: [
          { label: "画作尺寸", value: "1370 cm × 1220 cm" },
          { label: "人物数量", value: "约400位圣徒与凡人" },
          { label: "修复年份", value: "1980-1994年全堂修复时完成清洁" },
        ],
        quickFacts: [
          "圣巴托罗缪手中的人皮被认为是米开朗基罗自画像。",
          "反宗教改革后期曾加绘遮盖布料，被戏称为“裤子画家”。",
        ],
        placeholderIcon: "⚖️",
        placeholderColor: "linear-gradient(135deg, #55d4ff 0%, #00f2fe 100%)",
      },
      {
        id: "sistine-sibyls",
        name: "西比尔与先知",
        icon: "🔮",
        period: "1508-1512年",
        location: "穹顶两侧拱券，交替排列七名先知与五位西比尔。",
        mediaType: "image",
        mediaSrc: "imgs/CAPPELLA_SISTINA_Ceiling-scaled.webp",
        description: [
          "西比尔是古典神话中的女先知，与旧约先知呼应，象征救主降临的普世预言。米开朗基罗以雕塑般的体量描绘她们，赋予女性人物前所未有的力量感。",
          "每位先知与西比尔身旁都有少年助手或天使，辅助传达神启讯息。",
        ],
        stats: [
          { label: "角色数量", value: "12位核心人物" },
          { label: "色彩特征", value: "鲜明对比色与大面积天蓝背景" },
          { label: "人物姿态", value: "复杂扭转展现解剖功力" },
        ],
        quickFacts: [
          "最具代表性的德尔菲西比尔展现优雅而强健的姿态。",
          "米开朗基罗参考雕塑素描，将人物塑造成三维感极强的形体。",
        ],
        placeholderIcon: "🔮",
        placeholderColor: "linear-gradient(135deg, #79e7ff 0%, #00c8ff 100%)",
      },
    ],
  },
};

const sceneData = ref(null);
const isLoaded = ref(false);
const activeHighlightIndex = ref(0);
const currentHighlight = computed(
  () => sceneData.value?.highlights?.[activeHighlightIndex.value] || null
);
const currentMediaType = computed(
  () => currentHighlight.value?.mediaType || "model"
);
const currentMediaSrc = computed(() =>
  resolveAssetPath(currentHighlight.value?.mediaSrc || null)
);
const currentMediaPoster = computed(() =>
  resolveAssetPath(currentHighlight.value?.mediaPoster || null)
);

const loadScene = () => {
  const data = scenesDatabase[id.value];
  sceneData.value = data || null;
  activeHighlightIndex.value = 0;
  isLoaded.value = false;

  if (data) {
    nextTick(() => {
      setTimeout(() => {
        isLoaded.value = true;
      }, 100);
    });
  }
};

const selectHighlight = (index) => {
  if (!sceneData.value?.highlights) return;
  if (index < 0 || index >= sceneData.value.highlights.length) return;
  activeHighlightIndex.value = index;
};

onMounted(() => {
  loadScene();
});

watch(id, () => {
  loadScene();
});

const goBack = () => {
  router.push({ name: "Home" });
};
</script>

<style scoped>
.detail-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(to bottom, #1a1a2e, #16213e, #0f3460);
  position: relative;
  padding-bottom: 3rem;
}

/* 返回按钮 */
.back-button {
  position: fixed;
  top: 2rem;
  left: 2rem;
  z-index: 100;
  background: rgba(255, 255, 255, 0.95);
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 50px;
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.back-button:hover {
  transform: translateX(-5px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.back-button:active {
  transform: translateX(-2px) scale(0.95);
}

.back-arrow {
  font-size: 1.2rem;
  transition: transform 0.3s ease;
}

.back-button:hover .back-arrow {
  transform: translateX(-3px);
}

/* 场景内容 */
.scene-content {
  padding: 2rem 2rem 3rem;
  max-width: 1400px;
  margin: 0 auto;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s ease;
}

.scene-content.loaded {
  opacity: 1;
  transform: translateY(0);
}

/* 场景标题 */
.scene-header {
  text-align: center;
  margin-bottom: 2rem;
  margin-top: 3rem;
}

.scene-title {
  font-size: 3rem;
  color: #ffffff;
  margin: 0;
  font-weight: 700;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.3);
}

.title-divider {
  width: 100px;
  height: 4px;
  background: linear-gradient(to right, transparent, #667eea, transparent);
  margin: 1rem auto;
  border-radius: 2px;
}

.highlight-tabs {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.highlight-tab {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.8rem 1.2rem;
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  min-width: 220px;
}

.highlight-tab:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.highlight-tab.active {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.5);
}

.tab-icon {
  font-size: 1.6rem;
}

.tab-text {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.tab-name {
  font-weight: 600;
  font-size: 1.05rem;
}

.tab-meta {
  font-size: 0.85rem;
  opacity: 0.8;
}

/* 媒体查看容器 */
.media-viewer-container {
  margin-bottom: 3rem;
  animation: fadeInScale 0.8s ease 0.2s both;
  height: 500px;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  background: rgba(0, 0, 0, 0.2);
}

.media-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
}

.media-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.media-fallback {
  color: #ffffff;
  text-align: center;
  font-size: 1.1rem;
  padding: 1rem;
  backdrop-filter: blur(6px);
  background: rgba(0, 0, 0, 0.35);
  border-radius: 15px;
}

.highlight-details {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2.5rem;
}

.highlight-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  animation: fadeInScale 0.8s ease 0.3s both;
}

.highlight-title {
  font-size: 2rem;
  color: #2c3e50;
  margin: 0.3rem 0 0.5rem;
  font-weight: 700;
}

.highlight-location {
  font-size: 1rem;
  color: #556877;
  margin-bottom: 1rem;
}

.highlight-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.highlight-stat {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 15px;
  padding: 1.2rem 1.4rem;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  animation: fadeInUp 0.6s ease both;
}

.stat-label {
  font-size: 0.9rem;
  color: #6b7a89;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2c3e50;
}

.highlight-facts {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 1.8rem;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.18);
  animation: fadeInScale 0.8s ease 0.4s both;
}

.facts-title {
  margin: 0 0 1rem;
  font-size: 1.4rem;
  color: #2c3e50;
  font-weight: 700;
}

.highlight-facts ul {
  margin: 0;
  padding-left: 1.2rem;
  color: #445565;
  line-height: 1.7;
}

/* 内容区域 */
.content-section {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* 信息卡片 */
.info-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  animation: fadeInScale 0.8s ease 0.4s both;
}

.section-title {
  font-size: 2rem;
  color: #2c3e50;
  margin: 0 0 1.5rem 0;
  font-weight: 700;
  border-bottom: 3px solid #667eea;
  padding-bottom: 0.5rem;
  display: inline-block;
}

.description-content {
  line-height: 1.8;
}

.paragraph {
  font-size: 1.1rem;
  color: #34495e;
  margin-bottom: 1rem;
  text-align: justify;
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.info-item {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  animation: fadeInUp 0.6s ease both;
}

.info-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
}

.info-icon {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.info-content {
  flex: 1;
}

.info-title {
  font-size: 1.2rem;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  font-weight: 600;
}

.info-text {
  font-size: 1rem;
  color: #5a6c7d;
  margin: 0;
}

/* 事实卡片 */
.facts-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  animation: fadeInScale 0.8s ease 0.6s both;
}

.empty-state {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  gap: 1rem;
  padding: 2rem;
  text-align: center;
}

.back-button.secondary {
  position: static;
  box-shadow: none;
  backdrop-filter: none;
}

.back-button.secondary:hover {
  transform: none;
}

.facts-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.fact-item {
  font-size: 1.1rem;
  color: #34495e;
  padding: 1rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(to right, rgba(102, 126, 234, 0.1), transparent);
  border-left: 4px solid #667eea;
  border-radius: 5px;
  transition: all 0.3s ease;
}

.fact-item:hover {
  background: linear-gradient(to right, rgba(102, 126, 234, 0.2), transparent);
  transform: translateX(5px);
}

/* 动画 */
@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 平板横屏适配 */
@media (orientation: landscape) and (min-width: 768px) {
  .scene-title {
    font-size: 2.5rem;
  }

  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .media-viewer-container {
    height: 400px;
  }
}

/* 平板竖屏适配 */
@media (orientation: portrait) and (max-width: 768px) {
  .detail-container {
    padding: 1rem;
  }

  .back-button {
    top: 1rem;
    left: 1rem;
    padding: 0.6rem 1.2rem;
    font-size: 0.9rem;
  }

  .scene-title {
    font-size: 2rem;
    margin-top: 1rem;
  }

  .media-viewer-container {
    height: 400px;
  }

  .highlight-tab {
    width: 100%;
    justify-content: flex-start;
  }

  .highlight-title {
    font-size: 1.6rem;
  }

  .section-title {
    font-size: 1.5rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-card,
  .facts-card {
    padding: 1.5rem;
  }
}

/* 小屏幕优化 */
@media (max-width: 480px) {
  .scene-content {
    padding: 1rem;
  }

  .scene-title {
    font-size: 1.8rem;
  }

  .paragraph {
    font-size: 1rem;
  }

  .media-viewer-container {
    height: 350px;
  }
}
</style>
