var Promise = require('promise');
var promisedConnection = require('./promisedConnection');

function create(connection, canHandleCallback) {
    if (connection.then === undefined) {
        connection = Promise.resolve(connection);
    }

    var distexExchange;

    return connection.then(function (conn) {
        console.log('distex provider got connected connection');
        return conn.declareExchange('distex');
    }).then(function (exchange) {
        distexExchange = exchange;
        console.log('distex provider got exchange');
        return exchange.createQueue();
    }).then(function (queue) {
        console.log('distex provider connected to queue on distex exchange. Waiting for messages.');
        return queue.bind('event.handler.required');
    }).then(function (queue) {

        queue.on('message', function (message, headers, deliveryInfo) {
            setImmediate(function () {
                var messageObject;
                messageObject = JSON.parse(message);
                console.log('distex provider recieved message', message);

                callbackResponse = canHandleCallback(messageObject)
                if (callbackResponse === undefined) {
                    callbackResponse = Promise.resolve(false);
                }
                if (callbackResponse.then === undefined) {
                    callbackResponse = Promise.resolve(callbackResponse);
                }
                callbackResponse.then(function (canHandle) {
                    if (canHandle) {
                        distexExchange.publish('event.handler.available', {
                            token: 'banana',
                            requestId: messageObject.id
                        });
                    }
                });
            });
        });

        return {
            dispose: function () {
                console.log('disposing distex provider');
                queue.dispose();
                console.log('disposed distex provider');
                canHandleCallback = undefined;
                connection = undefined;
            }
        };
    });
}

module.exports.create = create;
