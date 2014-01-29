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



window.arrEntrySizes = {
	'setFloat32': 4,
	'setFloat64': 8,
	'setInt8': 1,
	'setInt16': 2,
	'setInt32': 4,
	'setUint8': 1,
	'setUint16': 2,
	'setUint32': 4
}



function randomData(size, opName) {	
	var fOp = opName==null ? DataView.prototype.setInt8 : DataView.prototype[opName];
	var fSize = arrEntrySizes[fOp.name];
	var data = new ArrayBuffer(size * fSize);
	var dv = new DataView(data, 0);
	var offset = 0;
	for(var x = 0; x < size; x++) {
		fOp.call(dv, offset, Math.round(Math.random() * 100));
		offset += fSize;
	}
	return data;
}


function testTCP() {
	var d = $.Deferred();
	var t = new chrome.Thrift.Transport("tcp://localhost:3333");
	t.open().then(function(){
		console.info("TCP Connection Opened");
		t.write(randomData(100, 'setFloat64')).then(function(bytesWritten){
			console.info("TCP Data Written:%O", bytesWritten);
			t.bytesWritten = bytesWritten;  // Unauthorized Hack. Only works for echo.
		}).then(function(){
			t.read(t.bytesWritten).then(function(){
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
		t.write(randomData(100, 'setFloat64')).then(function(bytesWritten){
			console.info("UDP Data Written:%s", bytesWritten);
			t.bytesWritten = bytesWritten;  // Unauthorized Hack. Only works for echo.
		}).then(function(){
			t.read(t.bytesWritten).then(function(){
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