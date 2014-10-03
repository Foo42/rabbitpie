var EventEmitter = require('events').EventEmitter;

var amqp = require('amqp');
var Promise = require('promise');

var connectionSettings = {
    host: process.env.RABBITMQ_HOST || '192.168.59.103',
    login: 'admin',
    password: 'aXo0o4BrUyUq'
};

var exchangeSettings = {
    type: 'topic',
    autoDelete: false
};

var exchange;

function beginConnecting() {
    return new Promise(function (resolve, reject) {
        var connection = amqp.createConnection(connectionSettings);
        connection.once('ready', resolve.bind(null, connection));
    });
}

function declareExchange(connection) {
    return new Promise(function (resolve, reject) {
        connection.exchange('distex', exchangeSettings, resolve.bind(null))
    });
}

function createEmitter(queue) {
    var emitter = new EventEmitter();
    var originalOn = emitter.on.bind(emitter);
    emitter.on = function (key, callback) {
        queue.on('queueBindOk', function queueBound() {
            resolveListenerQueue(queue);
        });
        queue.bind('distex', key);
        originalOn(key, callback);
    }
    queue.subscribe(function (message, headers, deliveryInfo, messageObject) {
        //ned to figure out how to decide what to emit? Maybe take the deliveryInfo routingKey and match it against keys people have bound to reimplementing smarts to handle * etc. Maybe use regex?
    });
}

var makingConnection = beginConnecting();
var settingUpExchange = makingConnection.then(declareExchange);
bindListenerQueue = settingUpExchange.then(function (exchange) {
    console.log('listener exchange connect');
    return new Promise(function (resolveListenerQueue) {
        makingConnection.then(function (connection) {
            console.log('got connection to rabbitMQ reader');
            var queueSettings = {
                exclusive: true
            };
            connection.queue('tmp-' + Math.random(), queueSettings,
                function queueCreated(queue) {
                    console.log('queue created');

                    resolveListenerQueue(createEmitter(queue));
                });
        });
    });
});

///Need to store one per user n stuff
readers = {};

module.exports = function (userId) {
    console.log('in listener queue exports');
    return bindListenerQueue.then(function (queue) {
        if (readers[userId]) {
            console.log('reaturning previously created rabbitMQ conext event listener for ' + userId);
            return readers[userId];
        }
        console.log('creating rabbitMQ context event listener for ' + userId);
        var emitter = new EventEmitter();
        emitter.userId = userId;
        readers[userId] = emitter;
        queue.subscribe(function (msg) {
            var eventAsObj;
            try {
                var eventAsObj = JSON.parse(msg.data.toString('utf-8'));
            } catch (e) {
                console.error('error parsing contextEvent coming off queue ' + e);
            }
            if (!eventAsObj) {
                return;
            }
            emitter.emit('context event', eventAsObj);
            console.log(msg.data.toString('utf-8'));
        });
        console.log('returning emitter for user', userId, 'with userId property of', emitter.userId);
        return emitter;
    });
};
