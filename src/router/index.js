import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import SceneDetail from '../views/SceneDetail.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/scene/:id',
    name: 'SceneDetail',
    component: SceneDetail,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
