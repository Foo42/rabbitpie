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

            var emitter = topicEmitter.create(fakeQueue);
            emitter.on('foo.bar', function () {});
        });

        it('should emit subscribed event when message with that exact key arrives on queue', function (done) {
            var fakeQueue = new EventEmitter();
            fakeQueue.bind = function () {};

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
});
