/*
 *	Apache Chrome Thrift js:chrome Test Background Service 
 *  Whitehead, 2014
 */

chrome.bootThrift = function(restarted) {
	if(restarted) {
		console.info("Restarted Thrift background.js  <------------");
	} else {
		console.info("Launched Thrift background.js  <------------");
	}
};

chrome.app.runtime.onLaunched.addListener(function() {  
	chrome.bootThrift(false);
});  

chrome.app.runtime.onRestarted.addListener(function() {
	chrome.bootThrift(true);
});  
