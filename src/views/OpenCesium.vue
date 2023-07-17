<template>
  <div id="cesium-container"></div>
  <RouterView />
</template>
<script setup>
import * as Cesium from 'cesium'
import { onMounted, getCurrentInstance } from 'vue';
import bus from '@/utils/bus'
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIzODY4ZGM0Zi01NDQ5LTQyZDYtOTE3Zi1jNzZmMWM1M2FmMjAiLCJpZCI6MTM2MTA3LCJpYXQiOjE2ODU2Njk2NTh9.Rk-b7YRlFjEG0VNVfNxPzzbzYFSs0978h_yxwF4P3Wc'
const { appContext } = getCurrentInstance()
let global = appContext.config.globalProperties
let viewer
onMounted(() => {
  viewer = new Cesium.Viewer('cesium-container', {
    timeline: false,
    animation: false,
    infoBox: false,
    selectionIndicator: false
  })
  global.$viewer = viewer
  const tileset = viewer.scene.primitives.add(
    new Cesium.Cesium3DTileset({
      url: Cesium.IonResource.fromAssetId(69380),
    })
  )
  bus.$emit('tileset', tileset)
  viewer.flyTo(tileset)
})
</script>
<style lang="scss" scoped>
#cesium-container {
  width: 100vw;
  height: 100vh;
}

:deep .cesium-viewer-bottom {
  display: none;
}
</style>
