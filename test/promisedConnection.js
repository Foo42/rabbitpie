require('chai').should();
var promisedConnection = require('../lib/promisedConnection');

describe('connecting', function () {
    it('should connect, setup an exchange and bound queue which can recieve messages published on that exchange', function (done) {
        var testingExchange;

        promisedConnection.connect().then(function (connection) {
            return connection.declareExchange('testing');
        }).then(function (exchange) {
            testingExchange = exchange;
            return exchange.createQueue();
        }).then(function (queue) {
            return queue.bind('#');
        }).then(function (queueEmitter) {
            queueEmitter.on('message', function recievedMessage(message, headers, deliveryInfo) {
                deliveryInfo.routingKey.should.equal('somekey');
                done();
            });
            testingExchange.publish('somekey', 'some payload');
        }).catch(done);
    });
});

describe('cleanup', function () {
    this.timeout(20000);
    var queueToHoldExchangeOpen;
    afterEach(function (done) {
        //queueToHoldExchangeOpen.dispose();
        setTimeout(done, 200);
    });

    it('disposing a queue should disconnect it from further events', function (done) {
        var testingExchange;
        var passTestTimeout;

        promisedConnection.connect().then(function (connection) {
            return connection.declareExchange('testing2');
        }).then(function (exchange) {
            testingExchange = exchange;
            exchange.createQueue('exchangeKeepalive').then(function (q) {
                console.log('exchangeKeepalive queue');
                queueToHoldExchangeOpen = q;
                q.bind('#');
            });
            return exchange.createQueue('testQueue');
        }).then(function (queue) {
            return queue.bind('#');
        }).then(function (queue) {
            queue.once('message', function recievedFirstMessage() {
                passTestTimeout = setTimeout(done, 500); //pass test if no messages by this time;
                queue.on('message', function recievedUnexpectedFurtherMessage() {
                    done(new Error('recieved message after disposing queue'));
                });

                setTimeout(function () {
                    console.log('disposing test queue');
                    queue.dispose();
                    setTimeout(function () {
                        console.log('publishing message to exchange (which should still exist)');
                        testingExchange.publish('somekey', 'message nobody should recieve');
                    }, 200);
                }, 50);
            });
            testingExchange.publish('somekey', 'initial message to prove connection');
        }).catch(function (error) {
            clearTimeout(passTestTimeout);
            console.error('badness', error);
            done(error);
        });
    });
});
