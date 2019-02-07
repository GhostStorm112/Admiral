const WebSocket = require('ws')
const GhostCore = require('ghost-core')
const log = new GhostCore.Logger()
const shardAmount = 20
let shardList = [...Array(shardAmount).keys()]
let gatewayAmount = 10
let Clients = []
const wss = new WebSocket.Server({
  port: 9911
})

function noop () {}

function heartbeat () {
  this.isAlive = true
}

async function run () {
  wss.getUniqueID = function () {
    function s4 () {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
    }
    return s4() + s4() + '-' + s4()
  }
  wss.on('connection', function connection (ws) {
    ws.id = wss.getUniqueID()
    log.info('Webscoket', 'Client connected')
    ws.isAlive = true
    ws.on('pong', heartbeat)
    _registerListeners(ws)
  })

  const interval = setInterval(function ping () {
    wss.clients.forEach(function each (ws) {
      if (ws.isAlive === false) {
        return ws.terminate()
      }
      ws.isAlive = false
      ws.ping(noop)
    })
  }, 5000)
}

function _registerListeners (ws) {
  ws.on('message', function incoming (message) {
    const packet = JSON.parse(message)
    if (packet.op === 'request-shards') {
      shardRequest(ws, packet)
    }
  })
  ws.on('close', () => {
    log.info('ShardRequest', `Shards ${Clients[ws.id]} being added back to bucket`)
    shardList = Clients[ws.id].concat(shardList)
    Clients.splice(ws.id, ws.id)
    shardList.sort((a, b) => a - b)
  })
}

async function shardRequest (ws, packet) {
  if (Clients[ws.id]) {
    ws.send(JSON.stringify({
      op: 'shard-ids',
      d: {
        shards: Clients[ws.id]
      }
    }))
    log.info('ShardRequest', `Shards ${Clients[ws.id]} being sent to ${packet.d.resumeID}`)
  } else {
    let gatewayShards = []
    gatewayShards = shardList.splice(0, gatewayAmount)
    ws.send(JSON.stringify({
      op: 'shard-ids',
      d: {
        shardAmount: shardAmount,
        shards: gatewayShards
      }
    }))
    log.info('ShardRequest', `Shards ${gatewayShards} being sent to ${packet.d.resumeID}`)
    Clients[ws.id] = gatewayShards
    gatewayShards = null
  }
}

run().catch(error => log.error('Admiral', error))
log.info('Admiral', 'Started')
