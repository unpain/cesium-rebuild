<template>
  <el-card>
    <el-select v-model="selectBuild.name" placeholder="请选择" size="large" :value-key="selectBuild.name" @change="loadModel"
      style="width: 200px;">
      <el-option v-for="item in data.buildList" :key="item.position" :label="item.name" :value="item.name">
        <div class="option-container" style="display: flex;justify-content: space-between;align-items: center;">
          <span>{{ item.name }}</span>
          <el-icon @click="deletePlan(item.id)" size="20">
            <Delete />
          </el-icon>
        </div>
      </el-option>
    </el-select>
  </el-card>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue'
import { getBuild, delBuild } from '@/api/rebuild'
import { Delete } from '@element-plus/icons-vue'
import * as Cesium from 'cesium'
import bus from '@/utils/bus'
import { getCurrentInstance } from 'vue'
import { toFlatten, clearFlatten } from '@/utils/flatten'
import { ElMessage } from 'element-plus'
let { proxy } = getCurrentInstance()
let data = reactive({
  buildList: [],
  tileset: {},
})

let selectBuild = reactive({
  name: '',
  build: {},
  cars_cor: [],
  ground: {},
  model: {}
})

const loadModel = (val) => {
  let camera = proxy.$viewer.camera
  clearFlatten(data.tileset)
  if (data.ground !== {}) {
    proxy.$viewer.entities.remove(selectBuild.ground)
    proxy.$viewer.entities.remove(selectBuild.model)
  }
  selectBuild.build = data.buildList.find(item => item.name === val)
  selectBuild.cars_cor = Cesium.Cartesian3.fromDegreesArray(selectBuild.build.polygon.coordinates.flat(2))
  toFlatten(data.tileset, selectBuild.cars_cor)
  camera.setView({
    destination: new Cesium.Cartesian3(...selectBuild.build.cameraPosition.split(',').map(item => Number(item))),
    orientation: {
      // 指向
      heading: selectBuild.build.cameraOrt.split(',').map(item => Number(item))[0],
      // 视角
      pitch: selectBuild.build.cameraOrt.split(',').map(item => Number(item))[1],
      roll: selectBuild.build.cameraOrt.split(',').map(item => Number(item))[2]
    }
  })
  selectBuild.ground = proxy.$viewer.entities.add({
    polygon: {
      hierarchy: new Cesium.PolygonHierarchy(selectBuild.cars_cor),
      material: Cesium.Color.GREY
    }
  })
  selectBuild.model = proxy.$viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(...selectBuild.build.position.split(',').map(item => Number(item))),
    model: {
      uri: `/src/model/${selectBuild.build.src}.gltf`,
      scale: selectBuild.build.scale
    }
  })
  const heading = Cesium.Math.toRadians(selectBuild.build.heading); // 将角度转换为弧度
  const pitch = 0; // 设置俯仰角为0
  const roll = 0; // 设置滚动角为0
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(
    selectBuild.model.position.getValue(proxy.$viewer.clock.currentTime),
    new Cesium.HeadingPitchRoll(heading, pitch, roll)
  );
  selectBuild.model.orientation = orientation;
}

const deletePlan = (id) => {
  delBuild(id).then(res => {
    if (res.code === 200) {
      ElMessage.success("删除成功")
    }
  })
}

onMounted(() => {
  getBuild().then(res => {
    if (res.code === 200) {
      data.buildList = res.data
    }
  })
  bus.$on('tileset', (val) => {
    data.tileset = val
  })
})
</script>
<style lang="scss" scoped>
.el-card {
  position: fixed;
  top: 20px;
  left: 20px;
  width: 300px;
  min-height: 100px;
}
</style>
