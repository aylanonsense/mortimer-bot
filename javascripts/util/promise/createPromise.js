define(function() {
	//this is a super silly class that just returns a function that fulfills
	// itself... it's helpful for a couple reasons but I can't say that I'm
	// proud of it or that it's a good idea
	return function createPromise() {
		return new Promise(function(fulfill, reject) { fulfill(); });
	};
});