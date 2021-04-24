console.log(process.env)

const Shell = require('node-powershell')
const mqtt = require('mqtt')
const command = `Get-AudioDevice -RecordingMute`
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

let ps

let state = null

function publishMute() {
    ps = new Shell({
        verbose: false,
        executionPolicy: 'Bypass',
        noProfile: true,
        nonInteractive: true,
    })
    ps.addCommand(command)
    ps.invoke().then(output => {
        if (state === output) {
            return ps.dispose().then(code => {}).catch(error => { console.log(err) })
        }
        state = output
        console.log(output.trim())
        client.publish(`${baseTopic}/mute`, `${output.trim()}`, {
            qos: 0,
            retain: false,
        })
        ps.dispose().then(code => {}).catch(error => { console.log(err) })
    })
    .catch(err => {
        ps.dispose().then(code => {}).catch(error => console.lor(error))
        ps = new Shell({
            verbose: false,
            executionPolicy: 'Bypass',
            noProfile: true,
            nonInteractive: false,
        })
        console.log(err.message);
    })
}

function setMute(value) {
    console.log(value)
    ps = new Shell({
        verbose: false,
        executionPolicy: 'Bypass',
        noProfile: true,
        nonInteractive: true,
    })
    ps.addCommand(`Set-AudioDevice -RecordingMute ${value ? '1' : '0'}`)
    ps.invoke().then(output => {
        const test = ps.dispose()
        if (test) {
            test.then(code => {}).catch(error => { console.log(err) })
        }
    })
}

client.on('connect', function () {
    console.log('connected')
    client.publish(`${baseTopic}/state`, 'online', {
        qos: 2,
        retain: true,
    })
    console.log(`${baseTopic}/mute/set`)
    client.subscribe(`${baseTopic}/mute/set`, function (err, msg) {
        if (err) {
            console.log(err)
        }
    })
    setInterval(publishMute, 500)
})

client.on('message', function(topic, message) {
    console.log(topic, message.toString())
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
        if (ps) {
            const test = ps.dispose()
            if (test) {
                test.then(code => {}).catch(error => { console.log(err) });
            }
        }
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