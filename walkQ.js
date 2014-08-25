var fs = require("fs"),
    Q = require("q");


function walk(dir, filter, done) {
  var results = [];

  fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);

    list.forEach(function(file) {
      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          walk(file, filter, function(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
            });
          } else {
            if(filter(file)){
              results.push(file);
            }
            
            if (!--pending) done(null, results);
          }
      });
    });
  });
};


function walkQ(dir, filter){
  var deferred = Q.defer();
  walk(dir, filter, function(err, data){
    if(err) deferred.reject(err);
    else deferred.resolve(data);
  });

  return deferred.promise;
}

exports.walk = walkQ;

// walkQ('ppm-922-APM', function(file){
//   return file.match(/([^\\]*)(\.[zip|jar]+)$/);
// }).then(console.log, console.err);