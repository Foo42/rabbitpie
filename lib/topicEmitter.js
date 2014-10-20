var EventEmitter = require('events').EventEmitter;

function matchesSubscriptionKey(messageKey, subscriptionKey) {
    subscriptionRegex = new RegExp(subscriptionKey.replace(/\*/g, '[^\.]*').replace(/#/g, '.*'));
    return subscriptionRegex.test(messageKey);
}



module.exports.create = function (queue) {
    var topicEmitter = new EventEmitter();

    topicEmitter.on('newListener', function (event, topicListener) {
        if (event === 'newListener' || event === 'removeListener') {
            return;
        }
        var subscriptionKey = event;
        var wrappedListener = function wrappedListener(message, headers, routingInfo) {
            if (matchesSubscriptionKey(routingInfo.routingKey, subscriptionKey)) {
                topicListener(message, headers, routingInfo);
            }
        };
        queue.on('message', wrappedListener);
        queue.bind(subscriptionKey);

        topicEmitter.on('removeListener', function (eventBeingUnsubscribedFrom, listenerBeingRemoved) {
            //node wrappers the users original listener if subscribed via 'once' but stores original on .listener
            listenerBeingRemoved = listenerBeingRemoved.listener || listenerBeingRemoved;

            if (eventBeingUnsubscribedFrom === event && (listenerBeingRemoved === topicListener)) {
                queue.removeListener('message', wrappedListener);
                console.log('listener count for', eventBeingUnsubscribedFrom, EventEmitter.listenerCount(topicEmitter, eventBeingUnsubscribedFrom));
                if (EventEmitter.listenerCount(topicEmitter, eventBeingUnsubscribedFrom) < 1) {
                    setImmediate(function () {
                        queue.unbind(subscriptionKey)
                    });
                }
            }
        });
    });
    return topicEmitter;
}
