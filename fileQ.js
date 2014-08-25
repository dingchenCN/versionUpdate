var admzip = require('adm-zip'),
    fs = require('fs'),
    rmdir = require('rimraf'),
    Q = require('q');


function extractZip(sourcePath, destPath){
    var deferred = Q.defer();

    setTimeout(function(){
        try{
            var zip = new admzip(sourcePath);
            zip.extractAllTo(destPath, true);
            deferred.resolve(destPath);
        }catch(err){
            deferred.reject(err);
        }
    }, 200);
    
    return deferred.promise;
};

function addToZip(sourcePath, destPath){    
    var deferred = Q.defer();

    setTimeout(function(){
        try{
            var zip = new admzip();
            zip.addLocalFolder(sourcePath);
            zip.writeZip(destPath);
            deferred.resolve();
        }catch(err){
            deferred.reject(err);
        }
    }, 200);
    
    return deferred.promise;
};

function rmFolder(sourcePath){
    var deferred = Q.defer();
    rmdir(sourcePath, function(err){
        deferred.resolve();
        deferred.reject(err);
    });

    return deferred.promise;
};

function rmFile(sourcePath){
    var deferred = Q.defer();
    fs.unlink(sourcePath, function(err){
	if(err) {
	  deferred.reject(err);
	 } else {
        deferred.resolve();
        }
    });

    return deferred.promise;
};

function rename(oldPath, newPath){
    var deferred = Q.defer();
    fs.rename(oldPath, newPath, function(err){
        deferred.resolve();
        deferred.reject(err);
    });
    return deferred.promise;
}

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
            if(filter){
                if(filter(file)) results.push(file);
            } else {
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

    setTimeout(function(){
        walk(dir, filter, function(err, data){
            if(err) deferred.reject(err);
            else deferred.resolve(data);
        });    
    }, 200);

    return deferred.promise;
};


var readFileQ = Q.denodeify(fs.readFile),
    writeFileQ = Q.denodeify(fs.writeFile);



exports.extractZip = extractZip;
exports.addToZip = addToZip;
exports.readFile = readFileQ;
exports.writeFile = writeFileQ;
exports.rmFolder = rmFolder;
exports.rmFile = rmFile;
exports.walk = walkQ;
exports.rename = rename;