//configure requirejs
var path = require('path');
var requirejs = require('requirejs');
requirejs.config({
	baseUrl: path.join(__dirname, 'javascripts'),
	nodeRequire: require
});
require = requirejs;

//fix mongoose deprecation warnings
var mongoose = require('mongoose');
mongoose.Promise = global.Promise;

//get application arguments either from the config or the commandline
var params = {
	SLACK_TOKEN: '',
	MONGO_URI: '',
	LOG_LEVEL: 'info'
};
var config;
try {
	config = require('config');
}
catch(err) {
	config = null;
}
for(var k in params) {
	params[k] = process.env[k] || (config && config[k]) || params[k];
}

//run server application
require('main')(params);