"use strict";

var express =   require('express');
var path =      require('path');
var rimraf =    require('rimraf');
var minimist =  require('minimist');

var gulp =      require('gulp');
var rollup =    require('gulp-better-rollup')
var gutil =     require('gulp-util');
var gulpif =    require('gulp-if');
var buffer =    require('gulp-buffer');
var concat =    require('gulp-concat');
var cssmin =    require('gulp-cssmin');
var eslint =    require('gulp-eslint');
var htmlmin =   require('gulp-htmlmin');
var less =      require('gulp-less');
var micro =     require('gulp-micro');
var size =      require('gulp-size');
var terser =    require('gulp-terser')
var zip =       require('gulp-zip');
var source =    require('vinyl-source-stream');

var knownOptions = {
  alias: {'P': 'prod'},
  boolean: true,
  // default: { env: process.env.NODE_ENV || 'production' }
};

var options = minimist(process.argv.slice(2), knownOptions);
var production = options.prod

const build_source = () => {
  return gulp.src("src/main.js")
    .pipe(rollup({
    }, {
      format: "iife",
      name: "IIFE"
    }))
    .pipe(concat('build.js'))
    .pipe(gulpif(production, terser()))
    .pipe(gulp.dest('build'));
};

const build_index = () => {
  return gulp.src('src/index.html')
    .pipe(gulpif(production, htmlmin({
      collapseWhitespace: true,
      removeAttributeQuotes: true,
      removeComments: true,
    })))
    .pipe(gulp.dest('build'));
};

const build_styles = () => {
  return gulp.src('src/styles.less')
    .pipe(less())
    .pipe(concat('build.css'))
    .pipe(gulpif(production, cssmin()))
    .pipe(gulp.dest('build'));
};

const build = gulp.series(build_source, build_index, build_styles)

const clean = (done) => {
  rimraf.sync('build');
  rimraf.sync('dist');
  done();
};

const lint = () => {
  return gulp.src(['*.js', 'src/**/*.js'])
    .pipe(eslint())
    .pipe(eslint.format());
};

const dist = gulp.series(build, function() {
  if (!production) {
    gutil.log(gutil.colors.yellow('WARNING'), gutil.colors.gray('Missing flag --prod'));
    gutil.log(gutil.colors.yellow('WARNING'), gutil.colors.gray('You should generate production assets to lower the archive size'));
  }

  return gulp.src('build/*')
    .pipe(zip('archive.zip'))
    .pipe(size())
    .pipe(micro({limit: 13 * 1024}))
    .pipe(gulp.dest('dist'));
});

const watch = () => {
  gulp.watch('src/**/*.js', gulp.series(lint, build_source));
  gulp.watch('src/styles.less', gulp.series(build_styles));
  gulp.watch('src/index.html', gulp.series(build_index));
};

const serve = gulp.series(build, function() {
  var htdocs = path.resolve(__dirname, 'build');
  var app = express();

  app.use(express.static(htdocs));
  app.listen(3000, function() {
    gutil.log("Server started on '" + gutil.colors.green('http://localhost:3000') + "'");
  });
});


exports.clean = clean
exports.dist = dist
exports.serve = serve
exports.build = build
exports.watch = watch
exports.lint = lint
exports.default = build
