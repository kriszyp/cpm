if(typeof console !== "undefined"){
	exports.print = function(){
		console.log.apply(console, arguments);
	};
}else{
	try{
		exports.print = require("sys").puts;
	}catch(e){
		exports.print = function(text){
			java.lang.System.out.println(text);
		};
	}
}
var optionRE = /^--/;
function optionParser(args){
	args = args.slice();
	var i = 0,
		options = {};
	while(i<args.length){
		var arg = args[i];
		if(arg.match(optionRE)){
			args.splice(i, 1);
			var values = arg.split("=");
			options[values[0].slice(2)] = values[1]||true;
		}else{
			i++;
		}
	}

	return {
		args: args,
		options: options
	};
}
if(typeof process !== "undefined"){
	exports.env = process.env;	
	exports.parseOptions = function(){
		var result = optionParser(process.argv.slice(2));
		exports.args = result.args;
		exports.options = result.options;
	};
}else{
	var iter = java.lang.System.getenv().entrySet().iterator();
	exports.env = {};
	while(iter.hasNext()){
		var nameValue = iter.next();
		exports.env[nameValue.getKey()] = nameValue.getValue();
	}

	exports.parseOptions = function(args){
		var result = optionParser(args);
		exports.args = result.args;
		exports.options = result.options;
	};
}
