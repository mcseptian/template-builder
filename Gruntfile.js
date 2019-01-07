module.exports = function(grunt) {
  'use strict';

  // Force use of Unix newlines
  grunt.util.linefeed = '\n';

  var isTravis = require('is-travis');

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    clean: {
      'dist': 'dist',
      'css': [
        'template-src/includable/assets/css/bootstrap',
        'template-src/includable/assets/css/blogger',
        'docs/assets/css/blogger'
      ]
    },

    scsslint: {
      options: {
        bundleExec: true,
        config: '.scss-lint.yml',
        reporterOutput: null
      },
      bootstrap: {
        src: 'scss/bootstrap/*.scss'
      },
      blogger: {
        src: 'scss/blogger/*.scss'
      }
    },

    sass: {
      options: {
        precision: 6,
        sourcemap: 'auto',
        style: 'expanded',
        trace: true,
        bundleExec: true
      },
      bootstrap: {
        files: {
          'template-src/includable/assets/css/bootstrap/bootstrap.css': 'scss/bootstrap/bootstrap.scss'
        }
      },
      blogger: {
        files: {
          'template-src/includable/assets/css/blogger/blogger.css': 'scss/blogger/blogger.scss'
        }
      }
    },

    postcss: {
      options: {
        map: {
          inline: false,
          annotation: true,
          sourcesContent: true
        },
        processors: [
          require('postcss-flexbugs-fixes')(),
          require('autoprefixer')({
            browsers: [
              'Chrome >= 45',
              'Firefox >= 38',
              'Edge >= 12',
              'Explorer >= 10',
              'iOS >= 9',
              'Safari >= 9',
              'Android >= 4.4',
              'Opera >= 30'
            ]
          })
        ]
      },
      bootstrap: {
        src: 'template-src/includable/assets/css/bootstrap/*.css'
      },
      blogger: {
        src: 'template-src/includable/assets/css/blogger/*.css'
      }
    },

    cssmin: {
      options: {
        compatibility: 'ie10,-properties.zeroUnits',
        keepSpecialComments: '*',
        sourceMap: true,
        advanced: false
      },
      bootstrap: {
        files: [{
          expand: true,
          cwd: 'template-src/includable/assets/css/bootstrap',
          src: ['*.css', '!*.min.css'],
          dest: 'template-src/includable/assets/css/bootstrap',
          ext: '.min.css'
        }]
      },
      blogger: {
        files: [{
          expand: true,
          cwd: 'template-src/includable/assets/css/blogger',
          src: ['*.css', '!*.min.css'],
          dest: 'template-src/includable/assets/css/blogger',
          ext: '.min.css'
        }]
      }
    },

    bake: {
      core: {
        options: {
          basePath: 'template-src',
          content: 'template-src/config.json'
        },
        files: {
          'dist/template.xml': 'template-src/index.xml'
        }
      }
    },

    exec: {
      'docs-lint': {
        command: 'npm run docs-lint'
      }
    },

    copy: {
      docs: {
        expand: true,
        cwd: 'template-src/includable/assets/css',
        src: 'blogger/*',
        dest: 'docs/assets/css'
      }
    },

    watch: {
      css: {
        files: ['scss/**/*.scss'],
        tasks: [
          'clean:dist',
          'clean:css',
          'css-lint',
          'css-compile',
          'css-prefix',
          'css-minify',
          'template-compile',
          'copy:docs'
        ]
      },
      template: {
        files: [
          'template-src/**/*.xml',
          'template-src/**/*.css',
          'template-src/**/*.js',
          'template-src/config.json',
          '!template-src/includable/assets/css/bootstrap/*',
          '!template-src/includable/assets/css/blogger/*'
        ],
        tasks: [
          'clean:dist',
          'template-compile'
        ]
      }
    },

    gitcheckout: {
      compiled: {
        options: {
          branch: [
            'dist/.',
            'template-src/includable/assets/css/bootstrap/.',
            'template-src/includable/assets/css/blogger/.',
            'docs/assets/css/blogger/.'
          ]
        }
      }
    },

    jekyll: {
      options: {
        bundleExec: true,
        config: '_config.yml',
        incremental: false
      },
      docs: {},
      github: {
        options: {
          raw: 'github: true'
        }
      }
    },

    buildcontrol: {
      options: {
        dir: './_gh_pages',
        commit: true,
        push: true,
        message: 'Built %sourceName% from commit %sourceCommit% on branch %sourceBranch%'
      },
      pages: {
        options: {
          remote: 'git@github.com/mcseptian/template-blogger.git',
          branch: 'master'
        }
      }
    },

    compress: {
      main: {
        options: {
          archive: 'blogger-<%= pkg.version %>-dist.zip',
          mode: 'zip',
          level: 9,
          pretty: true
        },
        files: [{
          expand: true,
          cwd: 'dist/',
          src: ['**'],
          dest: 'blogger-<%= pkg.version %>-dist'
        }]
      }
    }

  });

  require('load-grunt-tasks')(grunt, {scope: 'devDependencies'});
  require('time-grunt')(grunt);

  var runSubset = function (subset) {
    return !process.env.blogger_TEST || process.env.blogger_TEST === subset;
  };
  var isUndefOrNonZero = function (val) {
    return val === undefined || val !== '0';
  };

  // CSS task.
  grunt.registerTask('css-lint', ['scsslint:bootstrap', 'scsslint:blogger']);
  grunt.registerTask('css-compile', ['sass:bootstrap', 'sass:blogger']);
  grunt.registerTask('css-prefix', ['postcss:bootstrap', 'postcss:blogger']);
  grunt.registerTask('css-minify', ['cssmin:bootstrap', 'cssmin:blogger']);

  // Template task.
  grunt.registerTask('template-compile', ['bake:core']);

  // Docs task.
  grunt.registerTask('docs-lint', ['jekyll:docs', 'exec:docs-lint']);

  // Test task.
  var testSubtasks = [];
  // Skip core tests if running a different subset of the test suite
  if (runSubset('core')) {
    testSubtasks = testSubtasks.concat([
      'css-lint',
      'css-compile',
      'css-prefix',
      'css-minify',
      'template-compile'
    ]);
  }
  if (runSubset('core') && !(isTravis)) {
    testSubtasks.push('gitcheckout:compiled');
  }
  // Skip HTML validation if running a different subset of the test suite
  if (runSubset('browser') &&
      isTravis &&
      // Skip HTML5 validator when [skip validator] is in the commit message
      isUndefOrNonZero(process.env.blogger_DO_VALIDATOR)) {
    testSubtasks.push('docs-lint');
  }
  grunt.registerTask('test', testSubtasks);

  // Default task.
  grunt.registerTask('default', [
    'clean:dist',
    'clean:css',
    'css-lint',
    'css-compile',
    'css-prefix',
    'css-minify',
    'template-compile',
    'copy:docs'
  ]);

  grunt.registerTask('prep-release', ['default', 'jekyll:github', 'compress']);

  // Publish to GitHub
  grunt.registerTask('publish', ['buildcontrol:pages']);
};
