require('chai').should();
var promisedConnection = require('../lib/promisedConnection');

describe('connecting', function () {
    it('should connect', function (done) {
        promisedConnection.connect().then(function (connection) {
            return connection.declareExchange('testing');
        }).then(function (exchange) {
            return exchange.createQueue();
        }).then(function (queue) {
            return queue.bind('#');
        }).then(function (queueEmitter) {
            done();
        }).catch(done);
    });
});
