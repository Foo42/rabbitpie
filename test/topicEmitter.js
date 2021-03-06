require('chai').should();
var EventEmitter = require('events').EventEmitter;
var topicEmitter = require('../lib/topicEmitter');

describe('topic emitter', function () {
    describe('when subscribing to events with on', function () {
        it('should bind the underlying queue with the event name', function (done) {
            var fakeQueue = new EventEmitter();
            fakeQueue.bind = function (key) {
                key.should.equal('foo.bar');
                done();
            };
            fakeQueue.unbind = function () {};

            var emitter = topicEmitter.create(fakeQueue);
            emitter.on('foo.bar', function () {});
        });

        it('should emit subscribed event when message with that exact key arrives on queue', function (done) {
            var fakeQueue = new EventEmitter();
            fakeQueue.bind = function () {};
            fakeQueue.unbind = function () {};

            var emitter = topicEmitter.create(fakeQueue);
            emitter.on('foo.bar', function () {
                done();
            });

            fakeQueue.emit('message', 'some message', null, {
                routingKey: 'foo.bar'
            });
        });

        describe('with fuzzy keys', function () {
            describe('with asterix in', function () {
                it('should emit subscribed event when message which matches key arrives on queue', function (done) {
                    var fakeQueue = new EventEmitter();
                    fakeQueue.bind = function () {};
                    fakeQueue.unbind = function () {};

                    var emitter = topicEmitter.create(fakeQueue);
                    emitter.on('a.b.*.d', function () {
                        done();
                    });

                    fakeQueue.emit('message', 'some message', null, {
                        routingKey: 'a.b.c.d'
                    });
                });
            });

            describe('with hash in', function () {
                it('should emit subscribed event when message which matches key arrives on queue', function (done) {
                    var fakeQueue = new EventEmitter();
                    fakeQueue.bind = function () {};
                    fakeQueue.unbind = function () {};

                    var emitter = topicEmitter.create(fakeQueue);
                    emitter.on('a.b.#.d', function () {
                        done();
                    });

                    fakeQueue.emit('message', 'some message', null, {
                        routingKey: 'a.b.c.banana.d'
                    });
                });
            });
        });

    });

    describe('subscribing to events with once', function () {
        it('should bind the underlying queue with the event namae', function (done) {
            var fakeQueue = new EventEmitter();
            fakeQueue.bind = function (key) {
                key.should.equal('foo.bar');
                done();
            };
            fakeQueue.unbind = function () {};

            var emitter = topicEmitter.create(fakeQueue);
            emitter.once('foo.bar', function () {});
        });

        it('should unbind the underlying queue after the event fires when there are no other subscribers to that event', function (done) {
            var callbackWasCalled = false;
            var fakeQueue = new EventEmitter();
            fakeQueue.bind = function () {};
            fakeQueue.unbind = function (key) {
                callbackWasCalled.should.equal(true);
                key.should.equal('foo.bar');
                EventEmitter.listenerCount(fakeQueue, 'message').should.equal(0);
                done();
            };

            var emitter = topicEmitter.create(fakeQueue);
            emitter.once('foo.bar', function () {
                callbackWasCalled = true;
            });

            emitter.emit('foo.bar');
        });

        it('should not unbind the underlying queue after the event fires when there are other subscribers to that event', function (done) {
            var callbackWasCalled = false;
            var fakeQueue = new EventEmitter();
            fakeQueue.bind = function () {};
            fakeQueue.unbind = function (key) {
                done(new Error('should not have unbound'));
            };

            var emitter = topicEmitter.create(fakeQueue);
            emitter.once('foo.bar', function () {
                callbackWasCalled = true;
            });
            emitter.on('foo.bar', function () {
                setTimeout(done, 100);
            });

            emitter.emit('foo.bar');
        });
    });
});
