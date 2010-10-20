if(typeof console !== "undefined"){
	exports.print = function(){
		console.log.apply(console, arguments);
	}
}
else{
	try{
		exports.print = require("sys").puts;
	}catch(e){
		exports.print = function(text){
			java.lang.System.out.println(text);
		};
	}
}
if(typeof process !== "undefined"){
	exports.args = process.argv;
	exports.env = process.env;	
}
else{
	var iter = java.lang.System.getenv().entrySet().iterator();
	exports.env = {};
	while(iter.hasNext()){
		var nameValue = iter.next();
		exports.env[nameValue.getKey()] = nameValue.getValue();
	}
}
