define([
	'winston',
	'dateformat'
], function(
	winston,
	dateFormat
) {
	//log levels: error/warn/info/verbose/debug/silly
	return new (winston.Logger)({
		transports: [
			new (winston.transports.Console)({
				level: 'info',
				prettyPrint: true,
				colorize: true,
				align: true,
				timestamp: function() {
					return dateFormat(Date.now(), 'ddd mmm dd yyyy hh:MM:ss TT');
				}
			}),
			new (winston.transports.File)({
				filename: 'logs/verbose.log',
				level: 'verbose',
				prettyPrint: true,
				json: false,
				timestamp: function() {
					return dateFormat(Date.now(), 'ddd mmm dd yyyy hh:MM:ss TT');
				}
			})
		]
	});
});