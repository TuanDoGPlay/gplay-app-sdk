<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getMaxAdHeight, showBanner } from '@/common/applovin.ts'
import { requireProjectConfig } from '@/state.ts'

const route = useRoute()
const config = ref()

onMounted(async () => {
  config.value = requireProjectConfig()
  await showBanner()
})
</script>

<template>
  <div class="app-layout">
    <div class="main-content">
      <component :is="config.layout.component" v-if="config && config.layout.component"> </component>
    </div>
    <div :style="{ '--ads-height': getMaxAdHeight('banner') + 'px' }" class="bottom-area">
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
}

.page {
  /* Chiếm toàn bộ không gian của main-content */
  width: 100%;
  height: 100%;

  /* Quan trọng: Định vị tuyệt đối để 2 page (vào và ra)
     có thể nằm chồng lên nhau trong lúc đang transition */
  position: absolute;
  top: 0;
  left: 0;

  /* Hỗ trợ scroll nội bộ bên trong trang nếu cần */
  overflow-y: auto;
  overflow-x: hidden;

  will-change: transform, opacity;
}

.bottom-area {
  width: 100%;
  flex-shrink: 0;
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
