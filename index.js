const Shell = require('node-powershell')
const mqtt = require('mqtt')
const deviceName = process.env.COMPUTERNAME
const clientId = `mic2mqtt-${deviceName}`
const baseTopic = `mic2mqtt/${deviceName}`
const mqttHost = 'mqtt://mqtt.home'

const client  = mqtt.connect(mqttHost, {
    clientId: clientId,
    will: {
        topic: `${baseTopic}/state`,
        payload: 'offline',
        qos: 2,
        retain: true,
    },
})

let state = null

function getShell() {
    return new Shell({
        verbose: false,
        executionPolicy: 'Bypass',
        noProfile: true,
        nonInteractive: true,
    })
}

function closeShell(ps) {
    if (!ps) {
        return
    }
    const test = ps.dispose()
    if (test) {
        test.then(code => {}).catch(error => { console.log(err) })
    }
}



function publishMute() {
    const ps = getShell()
    ps.addCommand('Get-AudioDevice -RecordingMute')
    ps.invoke().then(output => {
        closeShell(ps)
        if (state === output) {
            return
        }
        state = output
        console.log(output.trim())
        client.publish(`${baseTopic}/mute`, `${output.trim() === 'True' ? 1 : 0}`, {
            qos: 2,
            retain: true,
        })
    }).catch(err => {
        closeShell(ps)
        console.log(err);
    })
}

function setMute(value) {
    const ps = getShell()
    ps.addCommand(`Set-AudioDevice -RecordingMute ${value ? '1' : '0'}`)
    ps.invoke().then(output => {
        closeShell(ps)
        publishMute()
    }).catch(err => {
        closeShell(ps)
        console.log(err);
    })
}

client.on('connect', function () {
    console.log('connected')
    client.publish(`${baseTopic}/state`, 'online', {
        qos: 2,
        retain: true,
    })
    client.subscribe(`${baseTopic}/mute/set`, function (err, msg) {
        if (err) {
            console.log(err)
        }
    })
    setInterval(publishMute, 1000)
})

client.on('message', function(topic, message) {
    //console.log(topic, message.toString())
    if (topic === `${baseTopic}/mute/set`) {
        const value = message.toString()
        setMute(value === '1' || value.toLowerCase() === 'true')
    }
})

client.on('disconnect', function () {
    console.log('disconnect')
    client.publish(`${baseTopic}/state`, 'offline', {
        qos: 2,
        retain: true,
    })
})

function handleAppExit (options, err) {
    if (err) {
      console.log(err.stack)
    }
  
    if (options.cleanup) {
        client.publish(`${baseTopic}/state`, 'offline', {
            qos: 2,
            retain: true,
        }, function () {
            process.exit()
        })
    } else {
        process.exit()
    }
}
if (process.platform === "win32") {
    var rl = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout
    })
  
    rl.on("SIGINT", function () {
      process.emit("SIGINT");
    })
}

process.on('exit', () => {
    console.log('exit')
    handleAppExit({
        cleanup: true
    })
})

process.on('SIGINT', handleAppExit.bind(null, {
    exit: true, cleanup: true
}))

process.on('SIGTERM', handleAppExit.bind(null, {
    exit: true, cleanup: true
}))

process.on('uncaughtException', handleAppExit.bind(null, {
    exit: true
}))
