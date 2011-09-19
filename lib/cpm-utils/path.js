var system = require("./process"),
	fs = typeof process == "undefined" ?
		require("./rhino-fs") :
		require("./node-fs"),
	print = system.print,
	joinPath, homeDir, dirname, exists, separator;

if(typeof process == "undefined"){
	separator = java.lang.System.getProperty("file.separator");
	// Rhino
	joinPaths = function(arr){
		var path = new java.io.File(arr.join(separator));

		return path.getCanonicalPath();
	};

	dirname = function(p){
		return new java.io.File(p).getParent();
	};

	exists = function(path){
		return new java.io.File(path).exists();
	};

	homeDir = function(){
		return java.lang.System.getProperty("user.home");
	};
}else{
	var os = require("os");
	separator = os.type() == "Windows_NT" ? "\\" : "/";

	// Node
	(function(){
		var path = require("path");

		joinPaths = function(arr){
			return path.resolve(path.normalize(path.join.apply(null, arr)));
		};

		dirname = function(p){
			return path.dirname(p);
		};

		exists = function(p){
			return path.existsSync(p);
		};

		homeDir = function(){
			if(system.env.HOMEPATH && system.env.HOMEDRIVE){
				return path.join(system.env.HOMEDRIVE, system.env.HOMEPATH);
			}else{
				return system.env.HOME;
			}
		};
	})();
}

function Path(p){
	if(!(this instanceof Path)){
		return new Path(p);
	}
	var parts = typeof p == "string" ?
		p.split(separator) :
		p;

	if(parts[0] == '~'){
		parts.splice(0, 1, homeDir());
	}else if(parts[0] === ''){
		parts.splice(0, 1, '/');
	}

	this._parts = parts;
	this._p = joinPaths(parts);
}

Path.prototype.toString = function(){
	return this._p;
};

Path.prototype.join = function(path){
	return new Path(this._parts.concat(path.split(separator)));
};

Path.prototype.exists = function(){
	return exists(this._p);
};

Path.prototype.isFile = function(){
	return fs.statSync(this._p).isFile();
};

Path.prototype.isDirectory = function(){
	return fs.statSync(this._p).isDirectory();
};

function ensure(p){
	function doesntExist(){
		ensure(p);
		fs.mkdirSync(p, 0777);
	}

	var index = p.lastIndexOf(separator);
	if(index < 0){
		return;
	}
	p = p.substring(0, index);
	!exists(p) && doesntExist();
}
Path.prototype.ensure = function(){
	ensure(this._p);
};
Path.prototype.ensureDirectory = function(){
	ensure(this._p + separator);
};

Path.prototype.mkdir = function(ensure){
	ensure && this.ensure();
	return fs.mkdirSync(this._p, 0777);
};

function getPath(p){
	if(p instanceof Path){
		return p.toString();
	}else{
		return p;
	}
}

Path.prototype.copyTo = function(target){
	try{
		return fs.write(getPath(target), fs.read(this._p));
	}catch(e){
		print("Failed to copy " + e);
	}
};

Path.prototype.moveTo = function(target){
	try{
		return fs.move(this._p, getPath(target));
	}catch(e){
		print ("Failed to move " + e);
	}
};

Path.prototype.list = function(){
	return fs.list(this._p);
};

Path.prototype.listPaths = function(){
	return this.list().map(function(p){
		return this.join(p);
	}, this);
};

Path.prototype.rmdir = function(){
	this.listPaths().forEach(function(path){
		if(path.isDirectory()){
			path.rmdir();
		}else{
			path.unlink();
		}
	});
	fs.rmdirSync(this._p);
};

Path.prototype.unlink = function(){
	fs.unlinkSync(this._p);
};

Path.prototype.write = function(source, encoding){
	fs.write(this._p, source, encoding);
};

exports.Path = Path;
