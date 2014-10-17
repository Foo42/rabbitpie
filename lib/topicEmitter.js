var EventEmitter = require('events').EventEmitter;

function matchesSubscriptionKey(messageKey, subscriptionKey) {
    subscriptionRegex = new RegExp(subscriptionKey.replace(/\*/g, '[^\.]*').replace(/#/g, '.*'));
    return subscriptionRegex.test(messageKey);
}

module.exports.create = function (queue) {
    var emitter = new EventEmitter();
    var originalOn = emitter.on.bind(emitter);

    function wrappedOn(key, func) {
        queue.bind(key);
        queue.on('message', function (message, headers, routingInfo) {
            if (matchesSubscriptionKey(routingInfo.routingKey, key)) {
                emitter.emit(key, message, headers, routingInfo);
            }
        });
        originalOn.apply(emitter, arguments);
    }
    emitter.on = wrappedOn;
    return emitter;
}
