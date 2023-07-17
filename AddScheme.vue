<template>
    <el-card class="addscheme">
        <template #header>
            <div class="card-header">
                <span style="font-weight: 600; font-size: 18px">方案论证</span>
                <div class="rightTop">
                    <span :style="{ color: (data.active ? '' : '#409eff') }">地形平压</span>
                    <ArrowRightBold style="width:30px;margin-top: -10px;position: relative;top: 10px;color: cadetblue;" />
                    <span :style="{ color: (data.active ? '#409eff' : '') }">模型放置</span>
                </div>
            </div>
        </template>
        <div style="margin:0 15px">
            <div v-show="data.active == 0">
                <div style="height: 40px">
                    <div class="myIcon" @click="drawPolygon">
                        <Crop />绘制区域
                    </div>
                    <div v-show="data.polygonEntity" class="setH">
                        高度调整：
                        <Top @click="tochange('up')" />
                        <Bottom @click="tochange('down')" style="margin-left: 5px;" />
                    </div>
                </div>
                <div v-show="data.polygonEntity">
                    <el-input readonly style="width: 40%" value="区域坐标" />
                    <el-input readonly style="width: 55%"
                        :value="data.polygonGeoJson ? data.polygonGeoJson.geometry.coordinates.toString() : ''" />
                    <el-input readonly style="width: 40%" value="平压高度" />
                    <el-input readonly style="width: 55%" :value="data.tileHeight" />
                </div>
                <el-button size="small" style="margin: 12px 0; float: right" type="info"
                    @click="() => { endDraw(); data.active = 1 }">下一步
                </el-button>
            </div>
            <div v-show="data.active == 1">
                <div style="height: 40px">
                    <span class="myIcon" @click="drawPoint">
                        <School />模型位置
                    </span>
                </div>
                <div class="list">
                    <div class="model" v-for="(item, index) in list" :key="index">
                        <span @click="() => { data.pickModelID = index + 1 }"
                            :style="{ color: (data.pickModelID == (index + 1) ? '#409eff' : '') }">{{ item }}</span>
                        <img :src="'/src/assets/model/' + (index + 1) + '.png'">
                    </div>
                </div>
                <div class="adjust" v-show="data.modelEntity">
                    <span>调整：</span>
                    <CaretLeft @click="toAdjust('left')" />
                    <CaretRight @click="toAdjust('right')" />
                    <CaretTop @click="toAdjust('top')" />
                    <CaretBottom @click="toAdjust('bottom')" />
                    <RefreshRight v-longpress="() => toAdjust('clockwise')" @click="toAdjust('clockwise')" />
                    <RefreshLeft v-longpress="() => toAdjust('anticlockwise')" @click="toAdjust('anticlockwise')" />
                    <ZoomIn @click="toAdjust('amplify')" />
                    <ZoomOut @click="toAdjust('reduce')" />
                </div>
                <el-button v-show="data.modelEntity" @click="data.dialogVisible = true" size="small"
                    style="margin: 12px 0 12px 10px;  float:right" type="primary">提&nbsp;&nbsp;&nbsp;&nbsp;交
                </el-button>
                <el-button size="small" style="margin: 12px 0; float: right" type="info"
                    @click="() => { endDraw(); data.active = 0 }">上一步
                </el-button>
            </div>
        </div>
    </el-card>
    <el-dialog v-model="data.dialogVisible" title="请输入方案名称" width="24%" center>
        <div style="width: 80%;margin: auto;">
            <el-input style="text-align: center;" v-model="data.name" />
        </div>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="toSubmit" type="primary">
                    确定
                </el-button>
                <el-button @click="data.dialogVisible = false">取消</el-button>
            </span>
        </template>
    </el-dialog>
</template>
<script setup>
import * as Cesium from "cesium";
import { toDraw, endDraw } from '../tool/draw'
import { toFlatten, changeHeight, clearFlatten } from '../tool/flatten'
import { ElMessage } from "element-plus";
import * as turf from "@turf/turf";
import {
    Crop,
    School,
    ArrowRightBold,
    Top,
    Bottom,
    CaretLeft,
    CaretTop,
    CaretRight,
    CaretBottom,
    RefreshRight,
    RefreshLeft,
    ZoomIn,
    ZoomOut,
    Message
} from "@element-plus/icons-vue";
import { reactive, getCurrentInstance, onUnmounted } from "vue";
import { addScheme } from "../api/schemeApi";
const { appContext } = getCurrentInstance();
const global = appContext.config.globalProperties;
const list = ['购物商城', 'L型办公楼', '政务大楼', '教学楼']
let positionList, heading = 0, scale = 0.001
const data = reactive({
    active: 0,
    polygonEntity: null,
    polygonGeoJson: null,
    tileHeight: 0.0,
    modelEntity: null,
    pickModelID: 0,
    dialogVisible: false,
    name: ''
});


const toSubmit = () => {
    if (!data.name) {
        ElMessage.info("请输入方案名称！");
    } else {
        let camera = global.$viewer.camera
        addScheme({
            name: data.name,
            polygonJson: data.polygonEntity ? JSON.stringify(data.polygonGeoJson.geometry) : '',
            src: data.pickModelID + '',
            position: positionList.toString(),
            heading,
            scale,
            tileHeight: Number(data.tileHeight),
            cameraPosition: camera.position.x + ',' + camera.position.y + ',' + camera.position.z,
            cameraOrt: camera.heading + ',' + camera.pitch + ',' + camera.roll
        }).then(res => {
            if (res.code == 200) {
                data.active = 0
                data.pickModelID = 0
                data.polygonEntity = null
                data.modelEntity = null
                data.name = ''
                global.$viewer.entities.removeAll()
                clearFlatten(global.$tileset)
                data.dialogVisible = false
                ElMessage.success("添加方案成功!")
            }
        })
    }
}

const toAdjust = (type) => {
    let xy = Cesium.SceneTransforms.wgs84ToWindowCoordinates(
        global.$viewer.scene,
        Cesium.Cartesian3.fromDegrees(positionList[0], positionList[1], 0)
    )
    if (type == 'left') {
        xy.x -= 10
    } else if (type == 'right') {
        xy.x += 10
    } else if (type == 'top') {
        xy.y -= 10
    } else if (type == 'bottom') {
        xy.y += 10
    } else if (type == 'clockwise') {
        heading += 1
    } else if (type == 'anticlockwise') {
        heading -= 1
    } else if (type == 'amplify') {
        scale += 0.00005
    } else if (type == 'reduce') {
        scale -= 0.00005
    }
    const cartesian = global.$viewer.scene.globe.pick(global.$viewer.camera.getPickRay(xy), global.$viewer.scene);
    let cartographic = Cesium.Cartographic.fromCartesian(cartesian)
    let lon = Cesium.Math.toDegrees(cartographic.longitude)
    let lat = Cesium.Math.toDegrees(cartographic.latitude)
    positionList = [lon, lat, positionList[2]]
    const position = Cesium.Cartesian3.fromDegrees(...positionList)
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, Cesium.HeadingPitchRoll.fromDegrees(heading, 0, 0))
    data.modelEntity.position = position
    data.modelEntity.orientation = orientation
    data.modelEntity.model.scale = scale
}


const tochange = (type) => {
    data.tileHeight = type == 'up' ?
        (Number(data.tileHeight) + 0.5).toFixed(1)
        :
        (Number(data.tileHeight) - 0.5).toFixed(1)
    changeHeight(global.$tileset, data.tileHeight)
}


const drawPoint = () => {
    if (!data.pickModelID) {
        ElMessage.info("请选择放置的模型");
        return
    }
    heading = 0
    scale = 0.001
    ElMessage.info("请绘制模型放置位置");
    data.modelEntity && global.$viewer.entities.remove(data.modelEntity)
    data.modelEntity = null
    toDraw(global.$viewer, "point", (res) => {
        endDraw()
        let cartographic = Cesium.Cartographic.fromCartesian(res.position._value)
        let lon = Cesium.Math.toDegrees(cartographic.longitude)
        let lat = Cesium.Math.toDegrees(cartographic.latitude)
        positionList = [lon, lat, cartographic.height]
        global.$viewer.entities.remove(res)
        const position = Cesium.Cartesian3.fromDegrees(...positionList)
        const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, Cesium.HeadingPitchRoll.fromDegrees(0, 0, 0))
        data.modelEntity = global.$viewer.entities.add({
            position: position,
            orientation: orientation,
            model: {
                uri: "/src/assets/model/" + data.pickModelID + ".gltf",
                minimumPixelSize: 10,
                maximumScale: 5000,
                scale: scale,
            },
        })
    })
}

const drawPolygon = () => {
    ElMessage.info("请绘制压平区域,右键结束绘制");
    global.$viewer.entities.removeAll();
    data.polygonEntity = null
    data.tileHeight = 0.0
    clearFlatten(global.$tileset)
    toDraw(global.$viewer, "polygon", (res) => {
        data.polygonEntity = res
        res.polygon.material = Cesium.Color.SLATEGREY
        let arr = [];
        let car3_ps = res.polygon.hierarchy._value.positions;
        for (let i = 0; i < car3_ps.length; i++) {
            let _cartographic = Cesium.Cartographic.fromCartesian(car3_ps[i]);
            let _lat = Cesium.Math.toDegrees(_cartographic.latitude);
            let _lng = Cesium.Math.toDegrees(_cartographic.longitude);
            arr.push([_lng, _lat]);
        }
        arr.push(arr[0]);
        data.polygonGeoJson = turf.polygon([arr]);
        toFlatten(global.$tileset, car3_ps)
    })
}

onUnmounted(() => {
    endDraw()
    clearFlatten(global.$tileset)
    global.$viewer.entities.removeAll()
})


</script>
<style lang="scss">
.el-input__inner {
    text-align: center;
}

.addscheme {
    width: 22%;
    position: absolute;
    top: 4%;
    left: 4%;
    z-index: 999;
    font-size: 15px;
    font-weight: 600;

    .rightTop {
        float: right;
    }

    .el-input {
        margin: 5px 1%;

        .el-input__inner {
            text-align: center;
        }
    }

    .myIcon {

        cursor: pointer;
        float: left;

        svg {
            width: 23px;
            position: relative;
            top: 5px;
            margin-right: 3px;
        }
    }

    .setH {
        float: right;
        user-select: none;

        svg {
            background: rgb(85, 84, 84);
            color: #fff;
            width: 23px;
            position: relative;
            top: 5px;
            margin-right: 3px;
            border-radius: 50%;
            cursor: pointer;
        }
    }

    .list {
        border: 1px solid #dcdfe6;
        border-radius: 4px;

        .model {
            display: flex;
            justify-content: space-around;

            &:not(:last-child) {
                border-bottom: 1px solid #dcdfe6;
            }

            span {
                cursor: pointer;
                line-height: 65px;
            }

            img {
                width: 90px;
                height: 65px;
            }
        }
    }

    .adjust {
        display: flex;
        justify-content: space-around;
        margin-top: 9px;
        user-select: none;

        svg {
            background: rgb(85, 84, 84);
            color: #fff;
            width: 25px;
            margin-right: 3px;
            border-radius: 50%;
            cursor: pointer;
        }
    }

}
</style>
