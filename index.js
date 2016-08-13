//get dependencies
var path = require('path');
var requirejs = require('requirejs');

//configure requirejs
requirejs.config({
	baseUrl: path.join(__dirname, 'javascripts'),
	nodeRequire: require
});
require = requirejs;

//run server application
require('main')(process.env.SLACK_API_TOKEN || '');