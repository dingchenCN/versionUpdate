var Q = require('q'),
    fs = require('fs'),
    fileQ = require('./fileQ');

// Make sure we got the fileName and version on the command line.
if (process.argv.length < 4) {
    console.log('Usage: node ' + process.argv[2] + ' FILENAME');
    process.exit(1);
}

console.log('Start to process ' + process.argv[2] + ', upgrade to revision ' + process.argv[3]);

function Param(bundleFile, revision){
    this.bundleFile = bundleFile;

    var terms = revision.match(/([0-9]\.[0-9]\.[0-9])\.([0-9]+)/);
    this.revision = terms[0];
    this.releaseRevision = terms[1];
    this.svnRevision = terms[2];

    return this;
};

Param.prototype.getAbbrRevision = function(){
    return this.releaseRevision.replace(/\./g, '');
};

Param.prototype.getRevisionInComma = function(){
    return this.revision.replace(/\./g, ',');
};

Param.prototype.exclude = function(path){
    var excludeFiles = ['fs_home.jar', 'fs_multiserv.jar'];

    for(var i in excludeFiles){
        if(path.indexOf(excludeFiles[i]) > -1 ){
            return true;
        }
    }
    return false;
};

var params = new Param(process.argv[2], process.argv[3]);

params.bundleTMP = params.bundleFile + '.tmp';
params.abbrRevision = params.getAbbrRevision();
params.destBundlePath = params.bundleFile.replace(/[0-9]+/, params.abbrRevision);

var Handler = function(regex, process){
    this.regex = regex;
    this.process = process;
    return this;
};

var handlerChain = [new Handler(/deploy\.info/, function(file){
        return fileQ.readFile(file, 'utf8')
        .then(function(data){
            var result = data.replace(/DEPENDS_ON_VERSION=([0-9],[0-9],[0-9],[0-9]+)/g, 'DEPENDS_ON_VERSION=' + params.getRevisionInComma());

            return fileQ.writeFile(file, result, 'utf8');
        })
        .then(function(){
            //console.log('Finish Update ' + file);
        });
    }), 
    
    new Handler(/solution\.properties/, function(file){
        return fileQ.readFile(file, 'utf8')
        .then(function(data){
            var result = data.replace(/CORE_VERSION:([0-9].[0-9].[0-9])/g, 'CORE_VERSION:' + params.releaseRevision);

            return fileQ.writeFile(file, result, 'utf8');
        })
        .then(function(){
            //console.log('Finish Update ' + file);
        });
    }),
    
    new Handler(/kacc\_accelerators\_1\.sql/, function(file){
        return fileQ.readFile(file, 'utf8')
        .then(function(data){
            var result = data.replace(/([0-9].[0-2].[0-2])/g, '' + params.releaseRevision);
            
            return fileQ.writeFile(file, result, 'utf8');
        })
        .then(function(){
            //console.log('Finish Update ' + file);
        });
    }),

    new Handler(/([^\\]*)(\.[zip]+)$/, function(file){
        var tmpFolder =  file + '.tmp',
            sourceDesp = tmpFolder + '\\Source_Descriptor.xml';

        return fileQ.extractZip(file, tmpFolder)
            .then(function(destPath){
                //console.log('fileQ.exists======================= ' + fs.existsSync(sourceDesp));
                if (fs.existsSync(sourceDesp)){
                    return fileQ.readFile(sourceDesp, 'utf8');
                } else {
                    return "";
                }
            })
            .then(function(data){
                //console.log('data======================= ' + data);
                if (data !== ""){
                    var result = data.replace(/KINTANA_VERSION="([0-9]\.[0-9]\.[0-9]\.[0-9]+)"/g, 'KINTANA_VERSION="' + params.revision + '"');
                    return fileQ.writeFile(sourceDesp, result, 'utf8');
                } else {
                    return null;
                }
                
            })
            .then(function(){
                return fileQ.rmFile(file);
            })
            .then(function(){
                return fileQ.addToZip(tmpFolder, file);
            })
            .then(function(){
                //console.log('Finish Update ==========' + file);
            })
            .then(function(){
                return fileQ.rmFolder(tmpFolder);
            })
            .fail(function (error) {
                // We get here with either foo's error or bar's error
                console.log(error);
            });
    })
    ];

fileQ.rmFolder(params.bundleTMP)
    .then(function(){
        return fileQ.extractZip(params.bundleFile, params.bundleTMP)
    })
    .then(function(destPath){
        //console.log(destPath);
        return fileQ.walk(params.bundleTMP);
    })
    .then(function(fileList){
        //console.log('fileList============' + fileList);
        var processList = fileList.map(function(file){
            for(var i in  handlerChain){
                if(file.match(handlerChain[i].regex)) return handlerChain[i].process(file); 
            }

            return null;
        });

        return Q.all(processList);
    }).then(function(){
        return fileQ.rename(params.bundleTMP + '\\deploy\\920', params.bundleTMP + '\\deploy\\' + params.abbrRevision);   
    }).then(function(){
        return fileQ.addToZip(params.bundleTMP, params.destBundlePath);
    }).then(function(){
    //     return fileQ.rmFolder(params.bundleTMP);
    // }).then(function(){
        console.log('All done');
    }, function(err){
        console.log(err);
        //throw err;
    });




