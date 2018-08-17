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

var browserSync = require('browser-sync').create();
browserSync.init({
    server: "./dist"
});
browserSync.stream();

gulp.task('copy-index', function(done){
    gulp.src('index.html')
    .pipe(gulp.dest('./dist'));
    done();
});
gulp.task('copy-restaurant', function(done){
    gulp.src('restaurant.html')
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

gulp.task('main-js-concat', function(done){
    gulp.src(['js/dbhelper.js' , 'js/main.js' , 'js/sw-registration.js'])
    .pipe(concat('concat-main.js'))
    .pipe(gulp.dest('dist/js/'));
    done();
 });
 gulp.task('info-js-concat', function(done){
    gulp.src(['js/dbhelper.js' , 'js/restaurant_info.js' , 'js/sw-registration.js'])
    .pipe(concat('concat-info.js'))
    .pipe(gulp.dest('dist/js/'));
    done();
 });
 
 gulp.task('main-script-dist', gulp.series('main-js-concat' , function () {
    // app.js is your main JS file with all your module inclusions
    return browserify({entries: './dist/js/concat-main.js', debug: true})
        .transform("babelify", { presets: ['env'] })
        .bundle()
        .pipe(source('main.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist/js'))
        .pipe(livereload());
}));
gulp.task('info-script-dist', gulp.series('info-js-concat' , function () {
    // app.js is your main JS file with all your module inclusions
    return browserify({entries: './dist/js/concat-info.js', debug: true})
        .transform("babelify", { presets: ['env'] })
        .bundle()
        .pipe(source('info.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init())
        .pipe(uglify())
        .pipe(sourcemaps.write())
        .pipe(gulp.dest('./dist/js'))
        .pipe(livereload());
}));
 gulp.task('style-dist', function(done){
    gulp.src('css/*.css')
    .pipe(sourcemaps.init())
    .pipe(minify())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist/css/'));
    done();
 });
 
 gulp.task('default', gulp.series('copy-index','copy-restaurant','copy-images','style-dist', 'main-script-dist', 'info-script-dist', function(done) {
    gulp.watch('index.html', gulp.series('copy-index'));
    gulp.watch('restaurant.html', gulp.series('copy-restaurant'));
    gulp.watch('css/*.css', gulp.series('style-dist'));
    gulp.watch('js/*.js', gulp.series('main-script-dist' , 'info-script-dist'));
    gulp.watch('./dist/index.html').on('change', browserSync.reload);
    gulp.watch('./dist/restaurant.html').on('change', browserSync.reload);
    done();
 }));