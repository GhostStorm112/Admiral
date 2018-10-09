const GhostCore = require('ghost-core')
const log = new GhostCore.Logger()
const bodyParser = require('body-parser')
const express = require('express')
const config = require('./config.json')

let registery = []
let app = express()

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: true}))


app.use('/register/:type/:id', function(req, res, next) {
    log.info('Register', `${req.params.type} reg with id ${req.params.id}`)
    next()
}, function (req, res, next) {
    registery.push({
        type: req.params.id,
        id: req.params.id
    })
    console.log(registery)
})

app.get('/registery/', function (req, res, next) {
        res.send(registery)
})

app.listen(config.port, config.host)


log.info('Admiral', `Server started ${config.host}:${config.port}`)