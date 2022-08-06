const { EventEmitter } = require('events')
const util = require('util')
const HID = require('node-hid')
const utils = require('./util')

const { pad, checksum, getHexSignature, mask, maskAll } = utils

const Type = {
    RESPONSE: 0x55,
    EVENT: 0x56,
}

const Command = {
    CONNECTED: 0x19,
    ACTION: 0x0b,
}

const Request = {
    GET_COLOR: 0xc1,
    FADE: 0xc2,
    SET_COLOR: 0xc0,
    FLASH: 0xc3,
}

const dimensions = {}

dimensions.Panel = {
    ALL: 'ALL',
    CENTER: 'CENTER',
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
}

dimensions.Action = {
    ADD: 'ADD',
    REMOVE: 'REMOVE',
}

const PRODUCT_ID = 0x0241
const VENDOR_ID = 0x0e6f

const PANEL_TO_CODE = {
    ALL: 0,
    CENTER: 1,
    LEFT: 2,
    RIGHT: 3,
}

const CODE_TO_ACTION = {
    0: dimensions.Action.ADD,
    1: dimensions.Action.REMOVE,
}

const CODE_TO_PANEL = {
    0: dimensions.Panel.ALL,
    1: dimensions.Panel.CENTER,
    2: dimensions.Panel.LEFT,
    3: dimensions.Panel.RIGHT,
}

dimensions.Device = function () {
    EventEmitter.call(this)
    this.hidDevice = null

    // This could be considered the same?
    this.colourUpdateNumber = 0
    this.requestId = 0
}

util.inherits(dimensions.Device, EventEmitter)

dimensions.Device.prototype.connect = function () {
    this.hidDevice = new HID.HID(VENDOR_ID, PRODUCT_ID)

    this.hidDevice.on('data', (data) => {
        const type = data[0]
        const cmd = data[1]
        if (type === Type.EVENT && cmd === Command.ACTION) {
            // tag scanned
            const panel = CODE_TO_PANEL[data[2]]
            const action = CODE_TO_ACTION[data[5]]
            const signature = getHexSignature(data.slice(7, 13))

            const toEmit = {
                panel,
                action,
                id: signature,
            }

            console.log('got tag data', toEmit)

            this.emit('tag-scan', toEmit)
        } else if (cmd === 0x01) {
            // LED change
            console.log('led change')
        } else if (type === Type.RESPONSE && cmd === Command.CONNECTED) {
            this.emit('connected')
        } else {
            console.warn('unknown dimensions command', data)
        }
    })

    this.hidDevice.on('error', (error) => {
        this.emit('error', error)
    })

    // do something when app is closing
    process.on('exit', exitHandler.bind(null, this, { cleanup: true }))
    // catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, this, { exit: true }))
    // catches uncaught exceptions
    process.on(
        'uncaughtException',
        exitHandler.bind(null, this, { exit: true }),
    )

    const self = this
    setTimeout(() => {
        self.wakeup()
    }, 100)
}

dimensions.Device.prototype.fade = function (panel, color, optSpeed) {
    const speed = typeof optSpeed !== 'number' ? 0.7 : optSpeed

    const data = maskAll([
        this.colourUpdateNumber, // why this here??
        PANEL_TO_CODE[panel], // panel
        (1 - speed) * 0xff, // speed
        0x01, // cycle count
        color >> 16, // r
        color >> 8, // g
        color, // b
    ])

    this.colourUpdateNumber++
    this.send(Request.FADE, data)
    // this.write([Type.RESPONSE, 0x08, Request.FADE].concat(data))
}

dimensions.Device.prototype.setColor = function (panel, color, callback) {
    const params = maskAll([panel, color >> 16, color >> 8, color])
    this.send(Request.SET_COLOR, params, callback)
}

dimensions.Device.prototype.flash = function (
    panel,
    color,
    count,
    opts = {},
    callback,
) {
    const options = opts
    options.offTicks = options.offTicks || 10
    options.onTicks = options.onTicks || 10

    const params = maskAll([
        panel,
        options.offTicks,
        options.onTicks,
        count,
        color >> 16,
        color >> 8,
        color,
    ])
    this.send(Request.FLASH, params, callback)
}

dimensions.Device.prototype.getColor = function (panel, callback) {
    const params = maskAll([panel - 1])
    this.send(Request.GET_COLOR, params, callback)
}

dimensions.Device.prototype.send = function (type, params /* , callback */) {
    const requestId = mask(++this.requestId)
    // if (callback) {
    //     this._callbacks[requestId] = new Callback(type, callback);
    // }
    this.write(
        [
            Type.RESPONSE,
            mask(params.length + 2), // or + 1 ?
            type,
            requestId,
        ].concat(params),
    )
}

dimensions.Device.prototype.write = function (data) {
    this.hidDevice.write([0x00].concat(pad(checksum(data))))
}

dimensions.Device.prototype.close = function () {
    this.hidDevice.removeAllListeners('data')
    this.hidDevice.close()
}

dimensions.Device.prototype.wakeup = function () {
    this.hidDevice.write([
        0x00,
        0x55,
        0x0f,
        0xb0,
        0x01,
        0x28,
        0x63,
        0x29,
        0x20,
        0x4c,
        0x45,
        0x47,
        0x4f,
        0x20,
        0x32,
        0x30,
        0x31,
        0x34,
        0xf7,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
        0x00,
    ])
}

module.exports = dimensions
