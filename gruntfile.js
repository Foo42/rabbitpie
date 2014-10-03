module.exports = function (grunt) {

    require('jit-grunt')(grunt, {
        jscs: 'grunt-jscs-checker'
    });

    grunt.initConfig({
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['test/**/*.js']
            }
        },
        jscs: {
            server: {
                options: {
                    config: '.jscs.server.json'
                },
                src: ['**/*.js', '!node_modules/**/*']
            }
        }
    });

    grunt.registerTask('test', ['mochaTest']);
    grunt.registerTask('default', ['test', 'jscs']);

};
