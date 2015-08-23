module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: ['dest/'],

        copy: {
            files: {
                expand: true,
                cwd: 'src/',
                src: ['*.{txt,ico}'],
                dest: 'dest/'
            },
            javascripts: {
                expand: true,
                cwd: 'src/javascripts/',
                src: ['**/*.js'],
                dest: 'dest/javascripts/'
            },
            images: {
                files: [{
                    expand: true,
                    cwd: 'src/images/',
                    src: ['**/*.{gif,jpg,png,svg}'],
                    dest: 'dest/images/'
                }]
            }
        },

        haml: {
            views: {
                options: {
                    style: 'expanded'
                },
                files: [{
                    expand: true,
                    cwd: 'src/',
                    src: ['**/*.haml'],
                    dest: 'dest/',
                    ext: '.html'
                }]
            }
        },

        sass: {
            stylesheets: {
                options: {
                    noCache: true,
                    sourcemap: 'none',
                    style: 'expanded'
                },
                files: [{
                    expand: true,
                    cwd: 'src/stylesheets/',
                    src: ['**/*.scss'],
                    dest: 'dest/stylesheets/',
                    ext: '.css'
                }]
            }
        },

        postcss: {
            options: {
                processors: [
                    require('pixrem')(),
                    require('autoprefixer-core')({browsers: 'last 2 versions'})
                ]
            },
            dist: {
                src: 'dest/stylesheets/application.css'
            }
        },

        jshint: {
            javascripts: {
                files: [{
                    expand: true,
                    cwd: 'src/javascripts/',
                    src: ['**/*.js']
                }]
            }
        },

        imagemin: {
            images: {
                files: [{
                    expand: true,
                    cwd: 'src/images/',
                    src: ['**/*.{gif,jpg,png,svg}'],
                    dest: 'dest/images/'
                }]
            }
        },

        connect: {
            server: {
                options: {
                    port: 1111,
                    base: 'dest/',
                    livereload: false
                }
            }
        },

        watch: {
            options: {
                atBegin: true,
                livereload: false,
                spawn: false
            },
            files: {
                files: ['src/*.*'],
                tasks: ['newer:copy:files']
            },
            views: {
                files: ['src/**/*.haml'],
                tasks: ['newer:haml:views']
            },
            stylesheets: {
                files: 'src/stylesheets/**/*.scss',
                tasks: ['sass:stylesheets']
            },
            javascripts: {
                files: 'src/javascripts/**/*.js',
                tasks: ['newer:copy:javascripts']
            },
            images: {
                files: 'src/images/**/*.{gif,jpg,png,svg}',
                tasks: ['newer:copy:images']
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-imagemin');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-haml2html');
    grunt.loadNpmTasks('grunt-newer');
    grunt.loadNpmTasks('grunt-postcss');

    grunt.registerTask('default', ['clean', 'connect', 'watch']);
    grunt.registerTask('production', ['clean', 'copy:files', 'copy:fonts', 'haml:views', 'sass:stylesheets', 'postcss', 'jshint:javascripts', 'copy:javascripts', 'imagemin:images']);
};