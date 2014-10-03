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
    var subscribed = false;
    console.log('creating queue wrapper for', queue.name, 'to bind to', exchangeName);

    function bind(key) {
        return new Promise(function (resolve, reject) {
            console.log('binding queue', queue.name, 'on exchange', exchangeName, 'with key', key);
            queue.bind(exchangeName, key, function () {
                console.log('Queue bound');
                if (!subscribed) {
                    console.log('subscribing queue');
                    queue.subscribe(queueEmitter.emit.bind(queueEmitter, 'message'));
                }
                resolve(queueEmitter);
            });
        });
    }

    return {
        bind: bind
    }
}

function createExchangeWrapper(connection, exchange, exchangeName) {
    return {
        createQueue: function (name, queueSettings) {
            return new Promise(function (resolve, reject) {
                name = name || 'tmp-' + Math.random();
                console.log('creating queue', name);
                queueSettings = queueSettings || {
                    exclusive: true
                };
                connection.queue(name, queueSettings,
                    function queueCreated(queue) {
                        console.log('queue created');
                        resolve(createQueueWrapper(queue, exchangeName));
                    }
                );
            });
        }
    }
}

function createNewConnectionWrapper(connection) {
    return {
        declareExchange: function declareExchange(name, settings) {
            console.log('declaring exchange', name);
            return new Promise(function (resolve, reject) {
                connection.exchange(name, settings, function (exchange) {
                    console.log('connection created exchange');
                    resolve(createExchangeWrapper(connection, exchange, name));
                })
            });
        }
    };
}

module.exports = {
    connect: function (connectionOptions) {
        connectionOptions = connectionOptions || connectionSettings;
        return new Promise(function (resolve, reject) {
            var connection = amqp.createConnection(connectionOptions);
            connection.once('ready', function () {
                console.log('Connection ready');
                resolve(createNewConnectionWrapper(connection));
            });
        });
    }
}
