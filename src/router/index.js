import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import SceneDetail from '../views/SceneDetail.vue'
import SistineChapel360 from '../views/SistineChapel360.vue'

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
  },
  {
    path: '/sistine-360',
    name: 'SistineChapel360',
    component: SistineChapel360
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
