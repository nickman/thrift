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

function netConnectTests() {
	testTCP().then(testUDP);
	//testUDP();
}

function allTests() {
	netConnectTests();
}