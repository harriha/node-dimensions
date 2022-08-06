const dimensions = require('./dimensions')

const panels = {}
panels[dimensions.Panel.LEFT] = {}
panels[dimensions.Panel.RIGHT] = {}
panels[dimensions.Panel.CENTER] = {}

const red = 0xff0000
const green = 0x00ff00
const blue = 0x00ff

const colors = {}
colors['14 45 5a 7e 67 80'] = blue

// process.stdin.resume()

const device = new dimensions.Device()

// function exitHandler(device, options, err) {
//   device.close()
//   // if (options.cleanup) console.log('clean')
//   if (err) console.log(err.stack)
//   if (options.exit) process.exit()
// }

// // do something when app is closing
// process.on('exit', exitHandler.bind(null, device, { cleanup: true }))

// // catches ctrl+c event
// process.on('SIGINT', exitHandler.bind(null, device, { exit: true }))

// // catches uncaught exceptions
// process.on('uncaughtException', exitHandler.bind(null, device, { exit: true }))

device.connect()
device.on('connected', function () {
    console.log('connected')

    device.fade('LEFT', blue, 0.9)
    device.fade('RIGHT', red, 0.2)
    device.fade('CENTER', green, 0.9)

    setTimeout(() => {
        device.fade('LEFT', 0, 0.9)
        device.fade('RIGHT', 0, 0.2)
        device.fade('CENTER', 0, 0.9)
    }, 3000)
})
device.on('tag-scan', function (e) {
    console.log('tag scanned', e)

    if (e.action === dimensions.Action.ADD) {
        panels[e.panel][e.id] = true
        device.fade(e.panel, colors[e.id] || red, 0.9)
    } else if (e.action === dimensions.Action.REMOVE) {
        delete panels[e.panel][e.id]
        const ids = Object.keys(panels[e.panel])
        const toColor = ids.length ? colors[ids[0]] : 0

        device.fade(e.panel, toColor, 0.9)
    }
})
