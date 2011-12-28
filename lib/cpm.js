/**
 * CommonJS Package Manager
 * This will install packages into another package, using CommonJS mappings
 * node /path/to/cpm/lib/cpm.js install alias url
 * or
 * node /path/to/cpm/lib/cpm.js install url
 */
if(typeof require == "undefined"){
	// presumably this would only happen from a direct start in rhino
	// bootstrap require
	Packages.org.mozilla.javascript.Context.getCurrentContext().setOptimizationLevel(-1);
	var cpmPath = java.lang.System.getenv("CPM_PATH");	 
	require= makeRequire((cpmPath ? cpmPath + '/' : "") + "lib/");
	require.main = module = {};
}


var Unzip = require("./cpm-utils/unzip").Unzip,
	promiseModule = require("./cpm-utils/promise"),
	when = promiseModule.when,
	system = require("./cpm-utils/process"),
	print = system.print,
	zipInflate = require("./cpm-utils/inflate").zipInflate,
	Path = require("./cpm-utils/path").Path;
	
system.parseOptions(arguments);

function makeRequire(context){
	function readFile(path){
		return convertStreamToString(new java.io.FileInputStream(path));
	}
	function convertStreamToString(is){
		var writer = new java.io.StringWriter();
		var bytes = java.lang.reflect.Array.newInstance(java.lang.Character.TYPE, 4096);
		var reader = new java.io.BufferedReader(new java.io.InputStreamReader(is, "UTF-8"));
		var n;
		while ((n = reader.read(bytes)) != -1) {
			writer.write(bytes, 0, n);
		}
		reader.close();
		return writer.toString();
	}
	var modules = {};

	return function(id){
		if(id.charAt(0) === '.'){
			id = context.substring(0, context.lastIndexOf('/') + 1) + id;
			var lastId;
			while(lastId !== id){
				lastId = id;
				id = id.replace(/\/[^\/]*\/\.\.\//,'/');
			}
			id = id.replace(/\/\.\//g,'/') + ".js";
		}
		if(!modules[id]){
			var currentContext = Packages.org.mozilla.javascript.Context.getCurrentContext();
			var factory = currentContext.compileFunction(global,"function(require,exports){" + readFile(id) +
				"}", id, 1, null);
			factory(makeRequire(id), modules[id] = {});
		}
		return modules[id];
	};
}

var request, fs;
if(typeof process === "undefined"){
	request = require("./cpm-utils/rhino-http-client").request;
	fs = require("./cpm-utils/rhino-fs");
}else{
	request = require("./cpm-utils/node-http-client").request;
	fs = require("./cpm-utils/node-fs");
}

var targetPackage = Path(system.options["packages-path"] || system.env.PACKAGES_PATH || ".");
var registry = (system.options.registry || system.env.CPM_REGISTRY || "http://packages.dojotoolkit.org/").trim();

function readPackage(target){
	try{
		var packageJson = fs.read(target + "/package.json");
	}catch(e){ 
		//print("failed to read package.json " + e);
		return null;
	}
	if(packageJson){
		return JSON.parse(packageJson);
	}
}
function writeCurrentPackage(){
	targetPackage.join("package.json").write(JSON.stringify(packageData, null, 4));
	/*fs.write(targetPackage + "/packages.js", "require(" + 
			JSON.stringify(requireConfig) + 
			");\ndefine('packages',[],{load: function(id, parentRequire, onLoad){require([id], onLoad);}});"); 
}
function readPackagesConfig(){
	try{
		var define = function(){};
		var require = function(config){
			requireConfig = config;
		};
		eval(" " +fs.read(targetPackage + "/packages.js"));
	}catch(e){
		print("Failed to read packages.js " + e);
	}
	*/
}
var requireConfig = {}, 
	packageData = readPackage(".") || {
		directories:{
		}
	},
	targetLib = targetPackage.join(packageData.directories && packageData.directories.lib || '.');
//readPackagesConfig();

function main(action, url, version, location){
	switch(action){
		case "install": 
			installPackage(url, version, location);
			break;
		case "upgrade": 
			installPackage(url, "current");
			break;
		default: 
			print("Usage: cpm action [package-to-install] [version] [target-location]");
			print("");
			print("Valid actions are:");
			print("  install   Installs the given package (by URL) into the given location (location is optional)");
			print("  upgrade   Upgrades the given package to the latest");
			print("");
			print("Packages are installed into the current directory package or the PACKAGES_PATH env variable if it exists");
	}
}
function scoreVersion(version){
	if(!version){
		return -2;
	}
	var parts = version.match(/^v?(^[0-9])(\.([0-9]+))?(\.([0-9]+)(.*([0-9]+))?)?$/);
	if(!parts){
		return -1;
	}
	var num = Number(parts[1]);
	if(parts[3]){
		num += Number(parts[3])/10000;
	}
	if(parts[5]){
		num += Number(parts[5])/100000000;
	}
	if(parts[7]){
		num--; // sub-minor tag indicates not stable
		num += Number(parts[7])/100000000000;
	}
	return num;
} 
function installPackage(url, version, location, orNewer){
	if(!location){
		relocate = true; 
		location = encodeURIComponent(url);
	}
	if(!needsUpgrade(url, true)){
		return;
	}
	print("Installing " + url + (relocate ? "" : " into " + location) + (version ? " version " + version : "") + (orNewer ? " or newer" : ""));
	var relocate, registryData, canonicalUrl = url;
	if(!url.match(/\w+:/)){
		url = getUri(registry + encodeURIComponent(url)).then(function(data){
			if(data == null){
				throw new Error("Package \"" + url + "\"not found");
			}
			registryData = JSON.parse(data);
			var versions = registryData.versions;
			var dist;
			if(version && version != "current" && !orNewer){
				if(!versions[version]){
					throw new Error("Version " + version + " is not available on package " + url); 
				}
				dist = versions[version].dist.zip;
			}else{
				var bestVersion = false;
				for(var newVersion in versions){
					// choose the best version
					if(versions[newVersion].dist &&
							(scoreVersion(newVersion) >= scoreVersion(bestVersion)) && (!version || version == "current" || compatible(version, newVersion) == -1)){
						bestVersion = newVersion;
						dist = versions[newVersion].dist.zip;
					}
				}
				version = bestVersion;
			}
			for(var i in versions[version]){
				registryData[i] = versions[version][i];
			}
			if(!dist){
				if(bestVersion === false){
					print("Already current");
					return;
				}
				throw new Error("No version available for package " + url);
			}
			if(!dist.match(/^\w+:/)){
				if(dist.charAt(0)=='/'){
					dist = dist.substring(1);
				}
				dist = registry + dist;
			}
			return dist; 
		});
	}
	when(url, function(url){
		if(!url){
			return;
		}
		
		var downloadPackagePath = targetPackage.join(location);
		when(downloadAndUnzipArchive(url, downloadPackagePath), function(){
			var installedPackageData = readPackage(downloadPackagePath) || {name:url};
			var packageName = installedPackageData.name.replace(/\.?js$/, ''); // strip off any trailing .js or js, 
			targetLib.ensureDirectory();
			if(installedPackageData.main){
				var main = installedPackageData.main.replace(/\.js$/,'');
				// references a module that should have been copied, reference, but don't copy it so it's references stay correct
				main = packageName + '/' + main;
				targetLib.join(packageName + ".js").write('define(["' +main + '"], function(main){return main;});');
			}
/*			["lib", "doc", "test", "bin"].forEach(function(type){
				var sourceDirectory = downloadPackagePath + ((installedPackageData.directories && installedPackageData.directories[type]) || type);
				var targetDirectory = (packageData.directories && packageData.directories[type] || [type]) + '/' + packageName;
				try{
					var isDirectory = fs.statSync(sourceDirectory).isDirectory();
				}catch(e){}
				if(isDirectory){
					ensurePath(targetDirectory + '/');
					var listing = fs.list(sourceDirectory);
					for(var i = 0; i < listing.length; i++){
						var filename = listing[i];
						fs.move(sourceDirectory + '/' + filename, targetDirectory + '/' + filename);
					}
				}
			});*/
			if(relocate && packageName){
				var oldLocation = location;
				location = packageName;
/*				print("needsUpgrade(url) " + needsUpgrade(url) + " " + downloadPackagePath + " " + targetPackage + "/packages/" + packageName);
				if(needsUpgrade(url)){
					fs.move(downloadPackagePath, targetPackage + "/packages/" + packageName);
				}*/
			}
			var toInstall = [];
			var dependencies = installedPackageData.dependencies || (registryData && registryData.dependencies);
			if(dependencies){
				for(var alias in dependencies){
					var target  = dependencies[alias];
					toInstall.push([alias, target, null, true]);
				}
			}else{
				for(var alias in installedPackageData.mappings){
					var target  = installedPackageData.mappings[alias];
					toInstall.push([alias, null, target]);
				}
			}
			// add it to the mappings of the target package
			packageData.dependencies = packageData.dependencies|| {};
			packageData.dependencies[location] = version;
			var pkgConfig = {
				name: location,
				location: "packages/" + location
			};
			if(installedPackageData.directories && installedPackageData.directories.lib){
				pkgConfig.lib = installedPackageData.directories.lib;
			}
			if(installedPackageData.main){
				pkgConfig.main = installedPackageData.main;
			}
			/*requireConfig.packages = requireConfig.packages || []; 
			requireConfig.packages.push(pkgConfig);*/
			writeCurrentPackage();
			toInstall.forEach(function(args){
				print("\nInstalling dependency: " + args[0]);
				installPackage.apply(this, args);
			});
		});
	
	});
	function downloadAndUnzipArchive(url, target){
		
		return when(getUri(url, 1, true), function(source){
			if(source === null){
				throw new Error("Archive not found " + url);
			}
			print("Unzipping " + url);
			var unzip = new Unzip(source);
			unzip.readEntries();
			if(unzip.entries.length == 0){
				throw new Error("Empty archive");
			}
			var rootPath = unzip.entries[0].fileName;
			if(rootPath.charAt(rootPath.length-1) != '/'){
				rootPath = rootPath.substring(0, rootPath.lastIndexOf("/") + 1);
			}
			unzip.entries.some(function(entry){
				if(entry.fileName.substring(0, rootPath.length) !== rootPath){
					rootPath = "";
					return true;
				}
			});
			unzip.entries.forEach(function(entry){
				var fileName = entry.fileName.substring(rootPath.length); 
				var path = target.join(fileName);
				if (entry.compressionMethod <= 1) {
					// Uncompressed
					var contents = entry.data; 
				} else if (entry.compressionMethod === 8) {
					// Deflated
					var contents = zipInflate(entry.data);
				}else{
					throw new Error("Unknown compression format");
				}
				if(fileName && fileName.charAt(fileName.length-1) != '/'){
					// its a file
					path.ensure();
					path.write(contents, "binary");
				}else{
					path.ensureDirectory();
				}
			});
			print("Done unzipping");
		});
	}
	function needsUpgrade(url, verbose){
		var existing = packageData.dependencies && packageData.dependencies[location];
		if(existing){
			existing = existing.replace(/[<>= |]/g,''); // for now just strip out these operators 
			if(targetPackage.join(location).exists()){
				if(!version){
					// compatible package
					if(verbose){
						print(location + " already installed");
					}
					return; 				
				}
				if(version == "current"){
					return true;
				}
				var compatibility = compatible(version, existing, verbose); 
				if(compatibility){
					return compatibility == 1;
				}else{
					if(verbose){
						print("Incompatible package " + existing + " installed as " + location + " not compatible with " + version);
					}
					return true;
				}
			}
		} 
		return true;
	}
}
function compatible(version, existing, verbose){
	var semVerUrl = version.match(/(.*?)\.(\d+)\.(.*)/);
	var semVerExisting = existing.match(/(.*?)\.(\d+)\.(.*)/);
	if(semVerUrl && ((semVerExisting && semVerUrl[1] == semVerExisting[1] && 
			(semVerUrl[2] < semVerExisting[2] || (semVerUrl[2] == semVerExisting[2] && semVerUrl[3] <= semVerExisting[3]))) ||
			existing == version)){
		// compatible package
		if(verbose){
			print("Compatible version " + existing + " already installed");
		}
		return -1;
	}
	else if(existing == version || (semVerUrl && semVerExisting && semVerUrl[1] == semVerExisting[1] && 
			(semVerUrl[2] > semVerExisting[2] || (semVerUrl[2] == semVerExisting[2] && semVerUrl[3] > semVerExisting[3])))){
		// upgrade needed
		if(verbose){
			print("Upgrading " + existing + " to " + version);
		}
		return 1;
	}
	return false;
}
function getUri(uri, tries, returnInputStream){
	tries = tries || 1;
	print("Downloading " + uri + (tries > 1 ? " attempt #" + tries : ""));
	return request({url:uri, headers: {"user-agent": "CommonJS Package Manager 0.1", accept: "application/json"}, encoding:"binary"}).then(function(response){
		if(response.status == 302 || response.status == 301){
			return getUri(response.headers.location, tries, returnInputStream);
		}
		if(response.status < 300){
			if(returnInputStream && response.body.inputStream){
				return response.body.inputStream;
			}
			var body = "";
			return when(response.body.forEach(function(part){
				if(!body){
					body = part;
				}else{
					body += part;
				}
			}), function(){
				return body;
			});
		}
		if(response.status == 404){
			return null;
		}
		throw new Error("Error, server returned HTTP response status: " + response.status);
	}, function(error){
		tries++;
		if(tries > 3){
			throw error;
		}
		// try again
		return getUri(uri, tries, returnInputStream);
	});
}

if(require.main == module){
	main.apply(this, system.args);
}
