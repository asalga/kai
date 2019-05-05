'use strict';

module.exports = function(grunt) {

  const LivereloadPort = 35729;
  const ServeStatic = require('serve-static');

  // directories
  const src = 'src';
  const tmp = '.tmp';
  const app = 'app';
  const lib = 'src/libs';

  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  grunt.initConfig({
    /** 
     * Delete all working directories and contents
     */
    clean: {
      build: {
        src: [
          `${app}`,
          `${tmp}`
        ]
      }
    },

    /**
     * Connect port/livereload
     * https://github.com/gruntjs/grunt-contrib-connect
     */
    connect: {
      options: {
        port: 9000,
        hostname: '*'
      },
      livereload: {
        options: {
          middleware: function(connect, options) {
            return [
              ServeStatic(`${app}`),
              connect().use(`${app}`, ServeStatic(`${app}`)),
              ServeStatic(`${app}`)
            ]
          }
        }
      }
    },

    /**
     *
     */
    copy: {

      data: {
        files: [{
          expand: true,
          src: 'data/**/*.*',
          dest: `${app}/`
        }, ]
      },

      libs: {
        files: [{
          expand: true,
          cwd: `${lib}`,
          src: '*.js',
          dest: `${app}/libs`,
          filter: 'isFile'
        }]
      },

      dev: {
        files: [
          // MARKUP
          {
            expand: true,
            cwd: `${src}/`,
            src: 'index.html',
            dest: `${app}/`,
            filter: 'isFile'
          },
          // STYLE
          {
            expand: true,
            cwd: `${src}/css/`,
            src: '*.css',
            dest: `${app}/`,
            filter: 'isFile'
          },
          // JS
          {
            expand: true,
            cwd: `${src}/js/`,
            src: '**/*.js',
            dest: `${app}/js/`,
            filter: 'isFile'
          },
          // JS LIBS
          {
            expand: true,
            cwd: `${lib}`,
            src: '*.js',
            dest: `${app}/libs`,
            filter: 'isFile'
          },
          // JSON
          {
            expand: true,
            cwd: `data/json`,
            src: ['**/*.json'],
            dest: `${app}/data/json`,
            filter: 'isFile'
          },
          // FONT
          {
            expand: true,
            cwd: `data/font`,
            src: ['**/*.ttf'],
            dest: `${app}/data/font`,
            filter: 'isFile'
          },
          // ATLAS
          {
            expand: true,
            cwd: `data/atlas`,
            src: ['*.json', '*.png'],
            dest: `${app}/data/atlas`,
            filter: 'isFile'
          },

          // AUDIO
          {
            expand: true,
            cwd: `data/audio`,
            src: ['**/*.{mp3,ogg,wav}'],
            dest: `${app}/data/audio`,
            filter: 'isFile'
          },
          // IMAGES
          {
            expand: true,
            cwd: `data/img`,
            src: ['**/*.{jpg,jpeg,png,gif,svg}'],
            dest: `${app}/data/img`,
            filter: 'isFile'
          },
          // SHADERS
          {
            expand: true,
            flatten: false,
            cwd: `${src}/shaders/`,
            src: ['**/*.glsl'],
            dest: `${app}/shaders`,
            filter: 'isFile'
          },
          // TEST
          {
            expand: true,
            cwd: `data/`,
            src: ['*.{jpg,jpeg,png,gif,svg}'],
            dest: `${app}/data/`,
            filter: 'isFile'
          },
        ]
      }
    },

    /**
     * https://github.com/gruntjs/grunt-contrib-jshint
     * options inside .jshintrc file
     */
    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },

      files: [
        `${src}/js/**/*.js`,
        `${src}/json/**/*.js`,
        `!${src}/js/vendor/**/*.js`
      ]
    },

    /**
     * https://github.com/gruntjs/grunt-contrib-watch
     *
     */
    watch: {
      options: {
        spawn: true,
        livereload: true
      },

      dev: {
        files: [
          `${src}/js/**/*.js`,
          `data/**/*.{mp3,ogg,wav}`,
          'data/**/*.*',
          `src/index.html`,
          `src/css/style.css`
        ],
        tasks: [
          'copy:dev',
        ],
        options: {
          livereload: true
        }
      },

      scripts_dev: {
        files: [
          `${src}/js/**/*.js`
        ],
        tasks: [
          'copy:dev',
          // 'jshint',
          'bundle'
        ],
        options: {
          livereload: true
        }
      },
      // AUDIO
      audio: {
        files: [`data/**/*.{mp3,ogg,wav}`],
        tasks: [
          'copy:dev'
        ],
        options: { livereload: true }
      },
      // DATA
      data: {
        files: ['data/**/*.*'],
        tasks: [
          'copy:dev'
        ],
        options: {
          livereload: true
        }
      },
      // STYLE
      style: {
        files: [`src/css/style.css`],
        tasks: [
          'copy:dev'
        ],
        options: { livereload: true }
      },
      // MARKUP
      markup: {
        files: [
          `src/index.html`
        ],
        tasks: [
          'copy:dev'
          // 'processhtml'
        ],
        options: { livereload: true }
      }
    }
  });

  grunt.registerTask('default', [
    'copy:dev',
    'connect:livereload',
    'watch:dev'
  ]);

};