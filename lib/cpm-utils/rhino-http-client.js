/**
* HTTP Client using the JSGI standard objects
*/

var defer = require("./promise").defer,
	LazyArray = require("./lazy-array").LazyArray;

// configurable proxy server setting, defaults to http_proxy env var
exports.proxyServer = require("./process").env.http_proxy;

exports.request = function(request){
	var url = new java.net.URL(request.url),
		connection = url.openConnection(),
		method = request.method || "GET",
		is = null,
		promised = true;
		
	var ctx = javax.net.ssl.SSLContext.getInstance("TLS");
    ctx.init([], [new javax.net.ssl.X509TrustManager({
    	checkClientTrusted: function(){},
    	checkServerTrusted: function(){},
    	getAcceptedIssuers: function(){
    		return null;
    	},
    })], new java.security.SecureRandom());
    javax.net.ssl.SSLContext.setDefault(ctx);
    
	if(request.url.match(/^https/)){
		connection.setHostnameVerifier(new javax.net.ssl.HostnameVerifier({
			verify: function(a, b){
				return true;
			}
		}));
	}
	
	if (request.jsgi && "async" in request.jsgi) promised = request.jsgi.async;
	
	for (var header in request.headers) {
		var value = request.headers[header];
		connection.addRequestProperty(String(header), String(value));
	}
	connection.setDoInput(true);
	connection.setRequestMethod(method);
	if (request.body && typeof request.body.forEach === "function") {
		connection.setDoOutput(true);
		var writer = new java.io.OutputStreamWriter(connection.getOutputStream());
		request.body.forEach(function(chunk) {
			writer.write(chunk);
			writer.flush();
		});
	}
	if (typeof writer !== "undefined") writer.close();
	
	try {
		connection.connect();
		is = connection.getInputStream();
	}
	catch (e) {
		is = connection.getErrorStream();
	}
	
	var status = Number(connection.getResponseCode()),
		headers = {};
	for (var i = 0;; i++) {
		var key = connection.getHeaderFieldKey(i),
			value = connection.getHeaderField(i);
		if (!key && !value)
			break;
		// returns the HTTP status code with no key, ignore it.
		if (key) {
			key = String(key).toLowerCase();
			value = String(value);
			if (headers[key]) {
				if (!Array.isArray(headers[key])) headers[key] = [headers[key]];
				headers[key].push(value);
			}
			else {
				headers[key] = value;
			}
		}
	}
	
	// TODO bytestrings?
	var reader = new java.io.InputStreamReader(is, "UTF-8"),
		deferred = defer(),
		bodyDeferred = defer(),
		response = {
			status: status,
			headers: headers
		}
	
	response.body = LazyArray({
		some: function(callback) {
			try {
        		var bytes = java.lang.reflect.Array.newInstance(java.lang.Character.TYPE, 4096);
				var n;
				while ((n = reader.read(bytes)) != -1) {
					callback(String(new java.lang.String(bytes, 0, n)));
				}
				reader.close();
				bodyDeferred.resolve();
			}
			catch (e) {
				bodyDeferred.reject(e);
				reader.close();
			}
			// FIXME why doesn't this work?!
			if (promised) return bodyDeferred.promise;
		}
	});
	response.body.inputStream = is;
	
	deferred.resolve(response);
	if (promised) return deferred.promise;
	return response;
};