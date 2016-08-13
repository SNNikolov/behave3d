var gulp   = require("gulp");
var babel  = require("gulp-babel");
var minify = require("gulp-babel-minify");

// Default task - build the lib
gulp.task("default", function () {
  return gulp.src("src/*.js")
    .pipe(babel({compact: false}))
    .pipe(gulp.dest("dist"));
});

// minify - Generate minified files in dist/minified from source files in dist/
gulp.task('minify', function() {
  return gulp.src('dist/*.js')
    .pipe(minify())
    .pipe(gulp.dest('dist/minified'));
})