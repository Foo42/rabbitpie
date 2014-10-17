var amqp = require('amqp');
var Promise = require('promise');
var EventEmitter = require('events').EventEmitter;

var debug = process.env.NODE_DEBUG_RABBITPIE && process.env.NODE_DEBUG_RABBITPIE.toUpperCase === 'TRUE';
var debugLog = debug ? console.log.bind(console, 'RABBIT_PIE:') : function () {};

var connectionSettings = {
    host: process.env.RABBITMQ_HOST || 'localhost',
    login: 'admin',
    password: 'admin'
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
        setImmediate(function () {
            queueEmitter.emit('message', message.data.toString('utf-8'), headers, deliveryInfo);
        });
    }

    setImmediate(function () {
        debugLog('subscribing to queue ', queue.name, 'on exchange', exchangeName);
        queue.subscribe(emitAsMessageEvent).addCallback(function (ok) {
            queueEmitter.emit('subscribed', ok);
            subscriptionCTag = ok.consumerTag;
            debugLog('subscribed to queue ', queue.name, 'on exchange', exchangeName);
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
        debugLog('disposing, unsubscribing', subscriptionCTag);
        queue.unsubscribe(subscriptionCTag);
        subscriptionCTag = undefined;
    }
    queueEmitter.topicEmitter = require('./topicEmitter').create(queueEmitter);
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
            debugLog('publishing message:', message, 'with key', key);
            exchange.publish(key, message);
        }
    }
}

function createNewConnectionWrapper(connection) {
    connection.on('error', function (error) {
        debugLog('connection error', error);
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

module.exports = function (connectionOptions) {
    connectionOptions = connectionOptions || connectionSettings;
    return new Promise(function (resolve, reject) {
        var connection = amqp.createConnection(connectionOptions);
        connection.once('ready', function () {
            resolve(createNewConnectionWrapper(connection));
        });
    });
};
