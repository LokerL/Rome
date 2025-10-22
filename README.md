# 罗马风景探索网站

一个基于 Vue 3 的交互式罗马历史景点展示网站，专为安卓平板设计，支持横竖屏自适应。

## 项目特点

- ✨ **响应式设计**：完美适配平板设备的横屏和竖屏模式
- 🎨 **流畅动画**：页面切换和交互都配有精美的过渡效果
- 📱 **触摸优化**：针对触摸屏设备优化的交互体验
- 🎯 **面向中学生**：简洁易懂的界面设计和内容呈现
- 🔮 **3D模型接口**：预留了 Three.js 3D模型加载接口，便于未来扩展

## 包含的景点

1. **罗马斗兽场**：古罗马最大的竞技场
2. **梵蒂冈博物馆**：世界级的艺术宝库
3. **西斯廷教堂**：米开朗基罗的艺术杰作
4. **特莱维喷泉**：罗马最美的许愿池

## 技术栈

- **框架**：Vue 3 (Composition API)
- **构建工具**：Vite
- **路由**：Vue Router 4
- **3D库**：Three.js（预留接口）
- **样式**：原生 CSS3 with 渐变和动画

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

开发服务器将在 `http://localhost:3000` 启动

### 3. 构建生产版本

```bash
npm run build
```

### 4. 预览生产构建

```bash
npm run preview
```

## 项目结构

```
Rome/
├── public/                    # 静态资源
├── src/
│   ├── assets/
│   │   └── styles/
│   │       └── main.css       # 全局样式
│   ├── components/
│   │   └── ThreeModelViewer.vue  # 3D模型查看器组件
│   ├── views/
│   │   ├── Home.vue           # 场景选择主页
│   │   └── SceneDetail.vue    # 场景详情页
│   ├── router/
│   │   └── index.js           # 路由配置
│   ├── App.vue                # 根组件
│   └── main.js                # 入口文件
├── index.html                 # HTML模板
├── vite.config.js             # Vite配置
├── package.json               # 项目配置
└── README.md                  # 项目说明
```

## 功能说明

### 主页面 (Home.vue)

- 展示四个罗马景点的卡片
- 卡片包含渐变背景、图标和简介
- 支持触摸点击进入详情页
- 卡片悬停/点击时有动画效果
- 响应式网格布局

### 详情页面 (SceneDetail.vue)

- 展示景点的详细信息
- 3D模型预览区域（目前为占位符）
- 景点介绍、关键信息和有趣的事实
- 返回按钮支持返回主页
- 流畅的进入和退出动画

### 3D模型查看器 (ThreeModelViewer.vue)

**当前功能：**
- 交互式占位符显示
- 支持触摸/鼠标拖拽旋转
- 自动旋转模式
- 控制面板（重置、旋转、缩放）

**预留接口：**
- Three.js 场景初始化
- GLTF 模型加载
- 相机控制
- 光照设置

## 如何添加真实的 3D 模型

### 第 1 步：准备 3D 模型

将 `.gltf` 或 `.glb` 格式的 3D 模型文件放置在 `public/models/` 目录下：

```
public/
└── models/
    ├── colosseum.glb
    ├── vatican.glb
    ├── sistine.glb
    └── trevi.glb
```

### 第 2 步：在场景数据中添加模型 URL

编辑 `src/views/SceneDetail.vue`，在 `scenesDatabase` 中为每个场景添加 `modelUrl`：

```javascript
const scenesDatabase = {
  colosseum: {
    // ... 其他属性
    modelUrl: '/models/colosseum.glb',  // 添加这一行
  },
  // ... 其他场景
}
```

### 第 3 步：启用 ThreeModelViewer 中的代码

在 `src/components/ThreeModelViewer.vue` 的 `initThreeJS()` 函数中，取消注释 Three.js 初始化代码：

```javascript
// 取消注释第 145-185 行的 Three.js 代码
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(...)
// ... 等等
```

### 第 4 步：安装必要的加载器

如果需要加载不同格式的模型，可能需要安装额外的加载器：

```bash
npm install three
```

Three.js 已经在 `package.json` 中列出，确保版本正确即可。

## 响应式断点

- **小屏幕** (< 480px)：单列布局，较小字体
- **平板竖屏** (< 768px)：单列布局，优化的间距
- **平板横屏** (768px - 1200px)：双列布局
- **大屏幕** (> 1200px)：双列布局，更大的容器

## 动画效果

### 页面切换动画
- 淡入淡出 + 滑动效果
- 持续时间：0.5秒

### 卡片动画
- 悬停：上移 + 放大
- 分阶段淡入（stagger animation）

### 3D模型交互
- 拖拽旋转
- 自动旋转
- 平滑过渡

## 浏览器支持

- Chrome/Edge（推荐）
- Firefox
- Safari
- 安卓平板浏览器

## 性能优化建议

1. **图片优化**：使用 WebP 格式的图片
2. **懒加载**：为大型资源实现懒加载
3. **代码分割**：利用 Vue Router 的路由懒加载
4. **3D模型优化**：
   - 使用压缩的 GLB 格式
   - 减少多边形数量
   - 优化纹理大小

## 未来扩展

- [ ] 添加更多罗马景点
- [ ] 集成真实的 3D 模型
- [ ] 添加音频讲解
- [ ] 实现虚拟游览路线
- [ ] 添加多语言支持
- [ ] 集成地图定位功能

## 开发提示

### 添加新景点

1. 在 `src/views/Home.vue` 的 `scenes` 数组中添加新场景
2. 在 `src/views/SceneDetail.vue` 的 `scenesDatabase` 中添加详细信息
3. 准备相应的图片或 3D 模型

### 修改主题颜色

主要颜色定义在各个组件的 CSS 中：
- 主色调：`#667eea`
- 渐变色可在各卡片的 `color` 属性中修改

## 常见问题

### Q: 如何在局域网中访问？
A: Vite 开发服务器已配置 `host: '0.0.0.0'`，可以通过局域网 IP 访问。

### Q: 为什么 3D 模型不显示？
A: 确保已经完成上述"如何添加真实的 3D 模型"部分的所有步骤。

### Q: 如何调整动画速度？
A: 在各组件的 CSS 中查找 `transition` 或 `animation` 属性并修改持续时间。

## 许可证

MIT License

## 作者

Vue3 + Vite + Three.js 项目

---

享受探索罗马的历史之旅！🏛️
