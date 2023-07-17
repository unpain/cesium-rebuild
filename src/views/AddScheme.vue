<template>
  <el-card>
    <div class="title" style="margin-bottom: 20px;">
      <el-text style="color: #000;" size="large">方案论证</el-text>
      <el-steps :active="data.active" finish-status="success" simple>
        <el-step title="地形平压" :icon="Download"></el-step>
        <el-step title="模型放置" :icon="PictureRounded"></el-step>
      </el-steps>
    </div>
    <el-text style="user-select: none;cursor: pointer;" @click="drawArea" v-if="data.active === 0">
      <el-icon>
        <FullScreen />
      </el-icon>
      绘制区域
    </el-text>
    <el-text style="user-select: none;cursor: pointer;" @click="resetModel" v-if="data.active === 0">
      <el-icon>
        <Refresh />
      </el-icon>
      重置区域
    </el-text>
    <el-text style="user-select: none;cursor: pointer;" v-if="data.active === 1">
      <el-icon>
        <School />
      </el-icon>
      模型放置
    </el-text>
    <el-text style="user-select: none;cursor: pointer;float: right;" v-if="data.active === 0 && data.drawFlag === true">
      高度调整
      <el-button v-longpress="plusHieght" color="#2b2b2b" :icon="Top" circle plain></el-button>
      <el-button v-longpress="subHeight" color="#2b2b2b" :icon="Bottom" circle plain></el-button>
    </el-text>
    <div class="content">
      <div class="position" v-if="data.active === 0 && data.drawFlag === true">
        <el-text> 区域坐标 </el-text>
        <el-input style="width: 80%;" v-model="data.center"></el-input>
      </div>
      <div class="height" v-if="data.active === 0 && data.drawFlag === true">
        <el-text> 平压高度 </el-text>
        <el-input style="width: 80%;" v-model="data.height" disabled></el-input>
      </div>
      <el-table :data="data.build" v-if="data.active === 1" @row-click="addModel">
        <el-table-column>
          <template #default="props">
            <el-text>{{ props.row.name }}</el-text>
          </template>
        </el-table-column>
        <el-table-column>
          <template #default="props">
            <el-image style="width: 100px; height: 100px" :src="props.row.img_src" fit="fill" loading="lazy" />
          </template>
        </el-table-column>
      </el-table>
      <div class="button-group" v-if="data.active === 1">
        <el-button v-longpress="moveUp" color="#2b2b2b" :icon="CaretTop" circle plain></el-button>
        <el-button v-longpress="moveDown" color="#2b2b2b" :icon="CaretBottom" circle plain></el-button>
        <el-button v-longpress="moveLeft" color="#2b2b2b" :icon="CaretLeft" circle plain></el-button>
        <el-button v-longpress="moveRight" color="#2b2b2b" :icon="CaretRight" circle plain></el-button>
        <el-button v-longpress="plusModelHeight" color="#2b2b2b" :icon="Top" circle plain></el-button>
        <el-button v-longpress="subModelHeight" color="#2b2b2b" :icon="Bottom" circle plain></el-button>
        <el-button v-longpress="plusHeading" color="#2b2b2b" :icon="RefreshRight" circle plain></el-button>
        <el-button v-longpress="subHeading" color="#2b2b2b" :icon="RefreshLeft" circle plain></el-button>
        <el-button v-longpress="scaleUpModel" color="#2b2b2b" :icon="Plus" circle plain></el-button>
        <el-button v-longpress="scaleDownModel" color="#2b2b2b" :icon="Minus" circle plain></el-button>
      </div>
    </div>
    <el-button type="info" style="float: right;margin-top: 20px;" v-if="data.active === 0 && data.drawFlag === true"
      @click="nextStep">下一步</el-button>
    <el-button type="primary" style="float: right;margin-block: 10px;" v-if="data.active === 1"
      @click="startSubmit">提交</el-button>
    <el-dialog v-model="dialogVisible" title="请输入方案名称" width="30%">
      <el-input v-model="data.buildName"></el-input>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="submitModel">
            提交
          </el-button>
          <el-button @click="dialogVisible = false">取消</el-button>
        </span>
      </template>
    </el-dialog>
    <el-button type="info" style="float: right;margin-block: 10px;margin-right: 20px;" v-if="data.active === 1"
      @click="lastStep">上一步</el-button>
    <el-button type="info" style="float: right;margin-block: 10px;margin-right: 20px;" v-if="data.active === 1"
      @click="toSchemeList">方案页
    </el-button>
  </el-card>
</template>
<script setup>
import { getCurrentInstance, h, onMounted, reactive, ref, watch } from 'vue';
import { Download, PictureRounded, Top, Bottom, RefreshRight, RefreshLeft, Plus, Minus, CaretTop, CaretBottom, CaretLeft, CaretRight } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus';
import { toDraw, endDraw } from '@/utils/draw'
import { toFlatten, clearFlatten, changeHeight } from '@/utils/flatten'
import { addBuild, getBuild } from '@/api/rebuild'
import { useRouter } from 'vue-router';
import bus from '@/utils/bus'
import * as Cesium from 'cesium'
import * as turf from '@turf/turf'
const { proxy } = getCurrentInstance()
let $router = useRouter()
// let tileset = ref()
// let flattenCartesian
let dialogVisible = ref(false)
let data = reactive({
  active: 0,//steps变量
  tileset: {},//加载的3DTiles模型
  drawFlag: false,//画笔flag
  height: 0,//平压地面后生成的面实体的高度
  center: 0,//平压地面后生成的面实体的中心坐标
  ground: {},//平压地面后生成的面实体
  lonLatHeight: [],//模型的位置坐标
  model_cartesian: [],
  origin_height: 0,//模型初始高度
  win_cor: [],
  polygon: {},
  buildName: '',
  src: '',
  build: [
    {
      name: '购物商城',
      img_src: '/src/model/1.png',
      model_src: '/src/model/1.gltf'
    },
    {
      name: 'L型办公楼',
      img_src: '/src/model/2.png',
      model_src: '/src/model/2.gltf'
    },
    {
      name: '政务大楼',
      img_src: '/src/model/3.png',
      model_src: '/src/model/3.gltf'
    },
    {
      name: '教学楼',
      img_src: '/src/model/4.png',
      model_src: '/src/model/4.gltf'
    }
  ],
  model: {},//加载的模型实体
  heading: 0,//模型的水平角
  scale: 0.001//模型的放大缩小倍数
})

const resetModel = () => {
  if (Object.keys(data.ground).length) {
    proxy.$viewer.entities.remove(data.ground)
    proxy.$viewer.entities.remove(data.model)
    data.drawFlag = false
    data.center = []
    data.height = 0
    clearFlatten(data.tileset)
    endDraw()
  }
}
const resetData = () => {
  if (Object.keys(data.ground).length) {
    proxy.$viewer.entities.remove(data.model)
    endDraw()
  }
}

const drawArea = () => {
  let arr = []
  resetModel()
  toDraw(proxy.$viewer, 'polygon', (entity) => {
    data.ground = entity
    entity.polygon.material = Cesium.Color.GREY
    toFlatten(data.tileset, entity.polygon.hierarchy._value.positions)
    data.drawFlag = true
    entity.polygon.hierarchy._value.positions.forEach(item => {
      let p = Cesium.Cartographic.fromCartesian(item)
      let lat_ = Cesium.Math.toDegrees(p.latitude)
      let lon_ = Cesium.Math.toDegrees(p.longitude)
      arr.push([lon_, lat_])
    })
    arr.push(arr[0])
    let polygon = turf.polygon([arr])
    data.polygon = JSON.stringify(polygon.geometry)
    data.center = turf.center(polygon).geometry.coordinates
  })
}

const plusHieght = () => {
  data.height += 0.1
  changeHeight(data.tileset, data.height.toFixed(1))
}
const subHeight = () => {
  if (data.height > 0) {
    data.height -= 0.1
    changeHeight(data.tileset, data.height.toFixed(1))
  }
}

const plusModelHeight = () => {
  data.lonLatHeight.height += 0.5
  let lon_ = Cesium.Math.toDegrees(data.lonLatHeight.longitude)
  let lat_ = Cesium.Math.toDegrees(data.lonLatHeight.latitude)
  let h = data.lonLatHeight.height
  let car_pos = Cesium.Cartesian3.fromDegrees(lon_, lat_, h)
  data.model._position._value = car_pos
}

const subModelHeight = () => {
  if (data.lonLatHeight.height > data.origin_height) {
    data.lonLatHeight.height -= 0.5
    let lon_ = Cesium.Math.toDegrees(data.lonLatHeight.longitude)
    let lat_ = Cesium.Math.toDegrees(data.lonLatHeight.latitude)
    let h = data.lonLatHeight.height
    let car_pos = Cesium.Cartesian3.fromDegrees(lon_, lat_, h)
    data.model._position._value = car_pos
  }
}

const changePosition = () => {
  let glob_cor = proxy.$viewer.scene.globe.pick(proxy.$viewer.camera.getPickRay(data.win_cor), proxy.$viewer.scene)
  let lonLatH = Cesium.Cartographic.fromCartesian(glob_cor)
  data.lonLatHeight.longitude = lonLatH.longitude
  data.lonLatHeight.latitude = lonLatH.latitude
  let cartes_model = Cesium.Cartesian3.fromDegrees(Cesium.Math.toDegrees(lonLatH.longitude), Cesium.Math.toDegrees(lonLatH.latitude), data.lonLatHeight.height)
  data.model._position._value = cartes_model
  data.model_cartesian = data.model._position._value
}

const moveLeft = () => {
  data.win_cor.x -= 0.5
  changePosition()
}

const moveRight = () => {
  data.win_cor.x += 0.5
  changePosition()
}
const moveUp = () => {
  data.win_cor.y -= 0.5
  changePosition()
}

const moveDown = () => {
  data.win_cor.y += 0.5
  changePosition()
}

const plusHeading = () => {
  // 设置实体的方向角度
  data.heading += 1
  const heading = Cesium.Math.toRadians(data.heading); // 将角度转换为弧度
  const pitch = 0; // 设置俯仰角为0
  const roll = 0; // 设置滚动角为0
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(
    data.model.position.getValue(proxy.$viewer.clock.currentTime),
    new Cesium.HeadingPitchRoll(heading, pitch, roll)
  );
  data.model.orientation = orientation;
}

const subHeading = () => {
  data.heading -= 1
  const heading = Cesium.Math.toRadians(data.heading); // 将角度转换为弧度
  const pitch = 0; // 设置俯仰角为0
  const roll = 0; // 设置滚动角为0
  const orientation = Cesium.Transforms.headingPitchRollQuaternion(
    data.model.position.getValue(proxy.$viewer.clock.currentTime),
    new Cesium.HeadingPitchRoll(heading, pitch, roll)
  );
  data.model.orientation = orientation;
}

const scaleUpModel = () => {
  data.scale += 0.00001
  data.model.model.scale = data.scale
}

const scaleDownModel = () => {
  data.scale -= 0.00001
  data.model.model.scale = data.scale
}
const nextStep = () => {
  data.active = 1
}

const lastStep = () => {
  resetData()
  data.active--
}

const addModel = (item) => {
  toDraw(proxy.$viewer, 'point', (entity) => {
    data.model = proxy.$viewer.entities.add({
      position: entity.position._value,
      model: {
        uri: item.model_src,
        scale: 0.001
      }
    })
    data.src = (data.build.findIndex(build => build === item) + 1) + ""
    proxy.$viewer.entities.remove(entity)
    data.lonLatHeight = Cesium.Cartographic.fromCartesian(data.model._position._value)
    data.origin_height = data.lonLatHeight.height
    data.model_cartesian = data.model._position._value
    data.win_cor = Cesium.SceneTransforms.wgs84ToWindowCoordinates(proxy.$viewer.scene, data.model_cartesian)
    proxy.$viewer.camera.moveEnd.addEventListener(() => {
      data.win_cor = Cesium.SceneTransforms.wgs84ToWindowCoordinates(proxy.$viewer.scene, data.model_cartesian)
    })
    endDraw()
  })
}
const startSubmit = () => {
  dialogVisible.value = true
  // let lon_ = Cesium.Math.toDegrees(data.lonLatHeight.longitude)
  // let lat_ = Cesium.Math.toDegrees(data.lonLatHeight.latitude)
  // let h = data.lonLatHeight.height
  // console.log(JSON.stringify(Object.values(proxy.$viewer.camera.direction).join(',')))
  // console.log(JSON.stringify(Object.values(proxy.$viewer.camera.position).join(',')))
  // console.log(data.heading, 333)
  // console.log(JSON.stringify([lon_,lat_,h].join(',')))
  // console.log(data.polygon, 555)
}

const submitModel = () => {
  let lon_ = Cesium.Math.toDegrees(data.lonLatHeight.longitude)
  let lat_ = Cesium.Math.toDegrees(data.lonLatHeight.latitude)
  let h = data.lonLatHeight.height
  let camera = proxy.$viewer.camera
  addBuild({
    cameraOrt: camera.heading + ',' + camera.pitch + ',' + camera.roll,
    cameraPosition: camera.position.x + ',' + camera.position.y + ',' + camera.position.z,
    heading: data.heading,
    name: data.buildName,
    polygonJson: data.polygon,
    position: [lon_, lat_, h].toString(),
    scale: data.model.model.scale,
    src: data.src,
    tileHeight: data.height
  }).then(res => {
    if (res.code === 200) {
      ElMessage.success("添加方案成功")
      dialogVisible.value = false
    }
    getBuild().then(res => {
      console.log(res)
    })
  })
}

const toSchemeList = () => {
  resetModel()
  $router.push({ path: 'scheme' })
}
onMounted(() => {
  bus.$on('tileset', (e) => {
    data.tileset = e
  })
})
</script>
<style lang="scss" scoped>
.el-card {
  position: fixed;
  top: 20px;
  left: 20px;
  width: 500px;
  min-height: 300px;
  max-height: 800px;

  .title {
    width: 100%;
  }

  .content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    width: 100%;
    margin-top: 20px;

    .position {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;

      :deep(.el-text) {
        width: 80%;
      }
    }

    .height {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;

      :deep(.el-text) {
        width: 80%;
      }
    }

    .button-group {
      display: flex;
      justify-content: start;
      align-items: center;
    }
  }
}
</style>
