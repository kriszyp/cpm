var LazyArray = require("./lazy-array").LazyArray,
    defer = require("./promise").defer;
/*for(var i in File){
	exports[i] = File[i];
}*/
exports.readFileSync = exports.read = function(path){
	return convertStreamToString(new java.io.FileInputStream(path));
};
function convertStreamToString(is){
	var writer = new java.io.StringWriter();
	var chars = java.lang.reflect.Array.newInstance(java.lang.Character.TYPE, 4096);
	var reader = new java.io.BufferedReader(new java.io.InputStreamReader(is, "UTF-8"));
	var n;
	while ((n = reader.read(chars)) != -1) {
		writer.write(chars, 0, n);
	}
	is.close();
	return writer.toString();
};
exports.writeFileSync = exports.write = function(path, source, encoding){
	var os = new java.io.FileOutputStream(path);
	if(encoding == "binary"){
		os.write(source);
	}else{
		var writer = new java.io.OutputStreamWriter(os, encoding || "UTF-8");
		writer.write(source);
		writer.flush();
		writer.close();
	}
	os.close();
};
exports.mkdirSync = function(path){
	return new java.io.File(path).mkdir();
};
exports.rmdirSync = exports.unlinkSync = function(path){
	return new java.io.File(path)["delete"]();
};
exports.move = function(path, target){
	return new java.io.File(path).renameTo(new java.io.File(target));
};
exports.readdir = exports.list = function(path){
	return new java.io.File(path).list();
}
exports.stat = exports.statSync = function(path) {
	try{
		var file = new java.io.File(path);
	    var stat = {
	    	mtime: new Date(file.lastModified() || undefined),
	    	size: file.length(),
	    	isDirectory: function(){
	    		return file.isDirectory();
	    	}
	    }
	}catch(e){
    	var deferred = defer();
    	deferred.reject(e);
    	return deferred.promise;
	}
    stat.isFile = function() {
        return file.isFile();
    }
    if(!stat.mtime){
    	var deferred = defer();
    	deferred.reject("File not found");
    	return deferred.promise;
    }
    return stat;
}

//exports.makeTree = File.mkdirs;
//exports.makeDirectory = File.mkdir;

exports.open = function(){
	var file = File.open.apply(this, arguments);
	var array = LazyArray({
		some: function(callback){
			while(true){
				var buffer = file.read(4096);
				if(buffer.length <= 0){
					return;
				}
				if(callback(buffer)){
					return;
				}
			}
		}
	});
	for(var i in array){
		file[i] = array[i];
	}
	return file;
}
exports.createWriteStream = function(path, options) {
    options = options || {};
    options.flags = options.flags || "w";
    var flags = options.flags || "w",
        f = File.open(path, flags);
    return {
        writable: true,
        write: function() {
            var deferred = defer();
            try {
                f.write.apply(this, arguments);
                f.flush();
            }
            catch (e) {
                return stream.writable = false;
            }
            deferred.resolve();
            return deferred.promise;
        },
        end: f.close,
        destroy: f.close
    }
}
