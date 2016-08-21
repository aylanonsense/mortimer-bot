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
var slackToken = '';
var mongoUri = '';
try {
	var config = require('config');
	slackToken = config.SLACK_TOKEN;
	mongoUri = config.MONGO_URI;
}
catch(err) {}
slackToken = process.env.SLACK_TOKEN || slackToken;
mongoUri = process.env.MONGO_URI || mongoUri;

//run server application
require('main')(slackToken, mongoUri);