import mitt from 'mitt'

const bus = {}

let emitter = mitt()

bus.$emit = emitter.emit
bus.$on = emitter.on
bus.$off = emitter.off

export default bus
