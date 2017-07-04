var path = require('path'), fs = require('fs');

module.exports = function (grunt) {

    grunt.initConfig({
        uglify:{
            main:{
                files: {
                    'dist/on.min.js': ['dist/on.js']
                }
            },
            options:{
                mangle: false,
                beautify: true,
                indentStart: 0,
                indentLevel: 0
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('build', function () {
        var file, src = './src/', dist = './dist/';
        try {
            fs.mkdirSync(dist);
        }catch(e){
            // dir exists
        }

        file = fs.readFileSync(src + 'on.js').toString();
        fs.writeFileSync(dist + 'on.js', file);

        grunt.task.run('uglify');
    });
};