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


function testTCP() {
	var d = $.Deferred();
	var t = new chrome.Thrift.Transport("tcp://localhost:3333");
	t.open().then(function(){
		console.info("TCP Connection Opened");
		t.write("Hello [" + new Date() + "]").then(function(result){
			console.info("TCP Data Written:%O", result);
		}).then(function(){
			t.read(47).then(function(){
				t.close();
				console.info("TCP Connection Closed");
				console.info("==================================");
				console.info("testTCP Successful");
				console.info("==================================");
				d.resolve();
			});
		});
	});
	return d.promise();
}
function testUDP() {
	var d = $.Deferred();
	var t = new chrome.Thrift.Transport("udp://127.0.0.1:3434");
	t.open().then(function(){
		console.info("UDP Connection Opened");
		t.write("Hello [" + new Date() + "]").then(function(result){
			console.info("UDP Data Written:%O", result);
		}).then(function(){
			t.read(47).then(function(){
				t.close();
				console.info("UDP Connection Closed");
				console.info("==================================");
				console.info("testUDP Successful");
				console.info("==================================");
				d.resolve();
			});
		});
	});
	return d.promise();
}

function test() {
	testTCP().then(testUDP);
	//testUDP();
}