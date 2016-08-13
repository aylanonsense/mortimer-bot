//configure requirejs
var path = require('path');
var requirejs = require('requirejs');
requirejs.config({
	baseUrl: path.join(__dirname, 'javascripts'),
	nodeRequire: require
});
require = requirejs;

//run server application
var config = require('config');
require('main')(process.env.SLACK_TOKEN || config.SLACK_TOKEN,
	process.env.MONGO_URI || config.MONGO_URI);