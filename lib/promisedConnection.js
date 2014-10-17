var amqp = require('amqp');
var Promise = require('promise');
var EventEmitter = require('events').EventEmitter;

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

function createQueueWrapper(queue, exchangeName) {
    var queueEmitter = new EventEmitter();
    var subscriptionCTag;

    function emitAsMessageEvent(message, headers, deliveryInfo) {
        queueEmitter.emit('message', message.data.toString('utf-8'), headers, deliveryInfo);
    }

    setImmediate(function () {
        console.log('subscribing to queue ', queue.name, 'on exchange', exchangeName);
        queue.subscribe(emitAsMessageEvent).addCallback(function (ok) {
            queueEmitter.emit('subscribed', ok);
            subscriptionCTag = ok.consumerTag;
            console.log('subscribed to queue ', queue.name, 'on exchange', exchangeName);
        });
    });

    function bind(key) {
        return new Promise(function (resolve, reject) {
            queue.bind(exchangeName, key, function () {
                resolve(queueEmitter);
            });
        });
    }

    function unbind(key) {
        queue.unbind(exchangeName, key);
    }

    queueEmitter.bind = bind;
    queueEmitter.unbind = unbind;
    queueEmitter.dispose = function () {
        if (!subscriptionCTag) {
            return;
        }
        console.log('disposing, unsubscribing', subscriptionCTag);
        queue.unsubscribe(subscriptionCTag);
        subscriptionCTag = undefined;
    }
    return queueEmitter;
}

function createExchangeWrapper(connection, exchange, exchangeName) {
    return {
        createQueue: function (name, queueSettings) {
            return new Promise(function (resolve, reject) {
                name = name || 'tmp-' + Math.random();
                queueSettings = queueSettings || {
                    exclusive: true
                };
                connection.queue(name, queueSettings,
                    function queueCreated(queue) {
                        resolve(createQueueWrapper(queue, exchangeName));
                    }
                );
            });
        },
        publish: function (key, message) {
            if (typeof (message) !== 'string') {
                message = JSON.stringify(message);
            }
            console.log('publishing message:', message, 'with key', key);
            exchange.publish(key, message);
        }
    }
}

function createNewConnectionWrapper(connection) {
    connection.on('error', function (error) {
        console.log('connection error', error);
    });
    return {
        declareExchange: function declareExchange(name, settings) {
            return new Promise(function (resolve, reject) {
                connection.exchange(name, settings, function (exchange) {
                    resolve(createExchangeWrapper(connection, exchange, name));
                })
            });
        },
        disconnect: function () {
            connection.disconnect.bind(connection)
        }
    };
}

module.exports = {
    connect: function (connectionOptions) {
        connectionOptions = connectionOptions || connectionSettings;
        return new Promise(function (resolve, reject) {
            var connection = amqp.createConnection(connectionOptions);
            connection.once('ready', function () {
                resolve(createNewConnectionWrapper(connection));
            });
        });
    }
}
