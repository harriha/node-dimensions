function checksum(data) {
    let sum = 0
    for (let i = 0; i < data.length; i++) {
        sum += data[i]
    }
    data.push(sum & 0xff)
    return data
}

function pad(data) {
    while (data.length < 32) {
        data.push(0x00)
    }
    return data
}

function getHexSignature(buffer) {
    let signature = ''
    for (let i = 0; i < buffer.length; i++) {
        signature += `${
            ((buffer[i] >> 4) & 0xf).toString(16) +
            (buffer[i] & 0xf).toString(16)
        } `
    }
    return signature.trim()
}

/**
 * @param {number} val
 */
function mask(val) {
    return val & 0xff
}

/**
 * @param {number[]} values
 */
function maskAll(values) {
    return values.map((v) => mask(v))
}

function exitHandler(dimensionsDevice, options, err) {
    dimensionsDevice.close()
    if (options.cleanup) console.log('cleaning up (nothing to do here, really)')
    if (err) console.log(err.stack)
    if (options.exit) process.exit()
}

module.exports = {
    checksum,
    pad,
    getHexSignature,
    mask,
    maskAll,
    exitHandler,
}
