var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var minify = require('gulp-minify-css');
var babel = require('gulp-babel');
var sourcemaps = require('gulp-sourcemaps');
// var changed = require('gulp-changed');
var imagemin = require('gulp-imagemin');
var browserify  = require('browserify');
var babelify    = require('babelify');
var source      = require('vinyl-source-stream');
var buffer      = require('vinyl-buffer');
var livereload  = require('gulp-livereload');
const webp = require('gulp-webp');
const $ = require('gulp-load-plugins')();
var gzip = require('gulp-gzip');
var htmlmin = require('gulp-htmlmin');

var browserSync = require('browser-sync').create();
browserSync.init({
    server: "./dist"
});
browserSync.stream();

gulp.task('copy-index', function(done){
    gulp.src('index.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('./dist'));
    done();
});
gulp.task('copy-restaurant', function(done){
    gulp.src('restaurant.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('./dist'));
    done();
});


 gulp.task('copy-images', function(done) {
    var imgSrc = 'img/*',
    imgDst = 'dist/img';
    
    gulp.src(imgSrc)
    .pipe(imagemin())
    .pipe(gulp.dest(imgDst));
    done();
 });

// convert images to webP.
gulp.task('webp-images', () =>
  gulp.src('img/*.jpg')
  .pipe(webp())
  .pipe(gulp.dest('img'))
);
// image responsive
gulp.task('images-resize', function () {
  return gulp.src('img/*')
    .pipe($.responsive({
      // Resize all JPEG/WebP images to sizes: 300, 433, 552, 653, 752, 800.
      '*.{jpg,webp}': [{
        width: 300,
        rename: { suffix: '_300' },
      }, {
        width: 433,
        rename: { suffix: '_433' },
      }, {
        width: 552,
        rename: { suffix: '_552' },
      }, {
        width: 653,
        rename: { suffix: '_653' },
      }, {
        width: 752,
        rename: { suffix: '_752' },
      }, {
        width: 800,
        rename: { suffix: '_800' },
      }],
    }, {
      quality: 70,
      progressive: true,
      compressionLevel: 6,
      withMetadata: false,
    }))
    .pipe(gulp.dest('dist/img'));
});
  
gulp.task('main-js-concat', function(done){
    gulp.src(['js/main-dbhelper.js' , 'js/main.js' , 'js/sw-registration.js'])
    .pipe(concat('concat-main.js'))
    .pipe(gulp.dest('dist/js/'));
    done();
 });
gulp.task('main-script-dist', gulp.series('main-js-concat' , function () {
  
  return browserify({entries: './dist/js/concat-main.js', debug: true})
      .transform("babelify", { presets: ['env'] })
      .bundle()
      .pipe(source('main.js'))
      .pipe(buffer())
      .pipe(sourcemaps.init())
      .pipe(uglify())
      //.pipe(gzip())
      .pipe(sourcemaps.write())
      .pipe(gulp.dest('./dist/js'))
      .pipe(livereload());
}));
 gulp.task('info-js-concat', function(done){
    gulp.src(['js/restaurant-dbhelper.js' , 'js/restaurant_info.js' , 'js/sw-registration.js'])
    .pipe(concat('concat-info.js'))
    .pipe(gulp.dest('dist/js/'));
    done();
 });
 
gulp.task('info-script-dist', gulp.series('info-js-concat' , function () {

    return browserify({entries: './dist/js/concat-info.js', debug: true})
        .transform("babelify", { presets: ['env'] })
        .bundle()
        .pipe(source('info.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init())
        .pipe(uglify())
        //.pipe(gzip())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist/js'))
        .pipe(livereload());
}));

 gulp.task('style-dist', function(done){
    gulp.src('css/*.css')
    .pipe(sourcemaps.init())
    .pipe(minify())
    //.pipe(gzip())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/css/'));
    done();
 });
 gulp.task('sw-dist', function(done){
  return browserify({entries: 'sw.js', debug: true})
  .transform("babelify", { presets: ['env'] })
  .bundle()
  .pipe(source('sw.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init())
  .pipe(uglify())
  .pipe(sourcemaps.write())
  .pipe(gulp.dest('./dist'))
  .pipe(livereload());
});

 
 gulp.task('default', gulp.series('copy-index','copy-restaurant','copy-images' , 'webp-images' , 'images-resize','style-dist', 'main-script-dist', 'info-script-dist', 'sw-dist' , function(done) {
    gulp.watch('index.html', gulp.series('copy-index'));
    gulp.watch('restaurant.html', gulp.series('copy-restaurant'));
    gulp.watch('css/*.css', gulp.series('style-dist'));
    gulp.watch('js/*.js', gulp.series('main-script-dist' , 'info-script-dist'));
    gulp.watch('./dist/index.html').on('change', browserSync.reload);
    gulp.watch('./dist/restaurant.html').on('change', browserSync.reload);
    done();
 }));