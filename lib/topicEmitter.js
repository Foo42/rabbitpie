var EventEmitter = require('events').EventEmitter;

function matchesSubscriptionKey(messageKey, subscriptionKey) {
    subscriptionRegex = new RegExp(subscriptionKey.replace(/\*/g, '[^\.]*').replace(/#/g, '.*'));
    return subscriptionRegex.test(messageKey);
}

module.exports.create = function (queue) {
    var topicEmitter = new EventEmitter();

    topicEmitter.on('newListener', function (event, listener) {
        if (event === 'newListener' || event === 'removeListener') {
            return;
        }
        var key = event;
        queue.bind(key);
        var wrappedListener = function wrappedListener(message, headers, routingInfo) {
            if (matchesSubscriptionKey(routingInfo.routingKey, key)) {
                listener(message, headers, routingInfo);
            }
        };
        queue.on('message', wrappedListener);
        topicEmitter.on('removeListener', function (eventBeingUnsubscribedFrom, listenerBeingRemoved) {
            console.log('removing listener for', eventBeingUnsubscribedFrom);
            console.log('removing', listenerBeingRemoved);
            console.log('compared to', listener);

            if (eventBeingUnsubscribedFrom === event && listenerBeingRemoved === listener) {
                queue.removeListener('message', wrappedListener);
                console.log('listener count for', eventBeingUnsubscribedFrom, EventEmitter.listenerCount(topicEmitter, eventBeingUnsubscribedFrom));
                if (EventEmitter.listenerCount(topicEmitter, eventBeingUnsubscribedFrom) < 1) {
                    queue.unbind(key);
                }
            }
        });
    });

    // var originalOn = topicEmitter.on.bind(topicEmitter);

    // function wrappedOn(key, func) {
    //     queue.bind(key);
    //     queue.on('message', function (message, headers, routingInfo) {
    //         if (matchesSubscriptionKey(routingInfo.routingKey, key)) {
    //             topicEmitter.emit(key, message, headers, routingInfo);
    //         }
    //     });
    //     originalOn.apply(topicEmitter, arguments);
    // }
    // topicEmitter.on = wrappedOn;
    return topicEmitter;
}
