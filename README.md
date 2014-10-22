#rabbitpie

library for making amqp as easy as pie in nodejs

##Example

```
rabbitPie.connect().then(function (connection) {
    return connection.declareExchange('testing');
}).then(function (exchange) {
    return exchange.createQueue();
}).then(function (queue) {
    return queue.bind('#'); //returns the queue again for easy chaining
}).then(function (queue) {
    queue.on('message', function recievedMessage(message, headers, deliveryInfo) {
        console.log(arguments);
    });
});
```
