<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getMaxAdHeight, showBanner } from '@/common/applovin.ts'
import { requireProjectConfig } from '@/state.ts'

const route = useRoute()
const config = ref()
const transitionName = computed(() => {
  return (route.meta.transition as string) || 'slide-left'
})

onMounted(async () => {
  config.value = requireProjectConfig()
  await showBanner()
})
</script>

<template>
  <div class="app-layout">
    <div class="main-content">
      <router-view v-slot="{ Component, route: r }">
        <transition :name="transitionName" mode="out-in">
          <div :key="r.fullPath" class="page">
            <component :is="Component"> </component>
          </div>
        </transition>
      </router-view>
    </div>
    <div :style="{ '--ads-height': getMaxAdHeight('banner') + 'px' }" class="bottom-area">
      <component :is="config.navbar.component()" v-if="config && config.navbar.enable"> </component>
      <div class="ads-placeholder"></div>
    </div>
  </div>
</template>

<style>
.app-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  position: relative;
  width: 100%;
  overflow-y: hidden;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.tab-track {
  height: 100%;
  display: flex;
  width: 200%;
  transition: transform 0.22s ease;
  will-change: transform;
}

.tab-track.is-home {
  transform: translate3d(0, 0, 0);
}

.tab-track.is-profile {
  transform: translate3d(-50%, 0, 0);
}

.tab-pane {
  width: 50%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  position: relative;
  -webkit-overflow-scrolling: touch;
}

/* để tab inactive không bắt scroll/click */
.tab-pane.inactive {
  pointer-events: none;
}

.bottom-area {
  width: 100%;
  flex-shrink: 0;
  background-color: var(--background-navbar, #000000);
  z-index: 100;

  padding-bottom: env(safe-area-inset-bottom, 0px);

  transition: all 0.3s ease;
}

.ads-placeholder {
  width: 100%;
  height: calc(var(--ads-height) + env(safe-area-inset-bottom, 0px));
  background-color: transparent;
  transition: height 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-enter-to {
  transform: translateX(0);
  opacity: 1;
}

.slide-left-enter-active {
  transition: all 0.2s ease-out;
}

.slide-left-leave-from {
  transform: translateX(0);
  opacity: 1;
}

.slide-left-leave-to {
  transform: translateX(-30%);
  opacity: 0;
}

.slide-left-leave-active {
  transition: all 0.2s ease-in;
}

.slide-right-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-enter-to {
  transform: translateX(0);
  opacity: 1;
}

.slide-right-enter-active {
  transition: all 0.2s ease-out;
}

.slide-right-leave-from {
  transform: translateX(0);
  opacity: 1;
}

.slide-right-leave-to {
  transform: translateX(30%);
  opacity: 0;
}

.slide-right-leave-active {
  transition: all 0.2s ease-in;
}
</style>
