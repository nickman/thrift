chrome.Thrift.Test = {
	testWriteFunctions : ['writeByte','writeBool','writeI8','writeI16','writeI32','writeI64','writeDouble','writeString'],  // 'writeUint8','writeUint16','writeUint32', 'writeF32','writeF64'
	maxNumerics : {
		writeByte : chrome.Thrift.Protocol.MAX_SIZE.Int8,
		writeBool : 1,
		writeI8 : chrome.Thrift.Protocol.MAX_SIZE.Int8,
		writeI16 : chrome.Thrift.Protocol.MAX_SIZE.Int16,
		writeI32 : chrome.Thrift.Protocol.MAX_SIZE.Int32,
		writeI64 : chrome.Thrift.Protocol.MAX_SIZE.Float64,
		writeDouble : chrome.Thrift.Protocol.MAX_SIZE.Float64
	},
	writeFunctions : {},
	writeFunctionCount : 0,
	indexWriteFunctions: function() {
		this.writeFunctions = {};
		var index = 0;
		console.group("Indexed Write Functions");
		var ftable = this.writeFunctions;
		var f = this.testWriteFunctions;
		$.each(chrome.Thrift.TBinaryProtocol.prototype, function(key, val) { 
			if(f.indexOf(key)>=0) {
				ftable[index] = val;
				console.info("%s - %s", index, key);
				index++;
			}			
		});
		this.writeFunctionCount = index;
		console.groupEnd();
	}
};

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

function protocolRecordingTest() {
	chrome.Thrift.Test.indexWriteFunctions();
	var prot = new chrome.Thrift.TBinaryProtocol({}, false, false, {record: true});
	var samples = [];
	var WRITES = 200;
	for(var i = 0; i < WRITES; i++) {
		samples.push(randomWrite(prot));
	}
	console.info("==================================");
	console.info("Writes complete:  %O", prot);
	console.info("==================================");
	var fails = 0, passes = 0;
	for(var i = 0; i < WRITES; i++) {
		var rev = samples.shift();
		var readValue = prot[rev.op]();
		if(rev.v==readValue) passes++;
		else {
			fails++;
			console.error("Got [%s], Expected [%s] for [%s]", readValue, rev.v, rev.op);
		}
	}
	console.info("==================================");
	console.info("protocolRecordingTest: pass: %s, fail: %s", passes, fails);
	console.info("==================================");


}

function randomWrite(prot) {
	var fIndex = randomNumber(chrome.Thrift.Test.writeFunctionCount);

	var fx = chrome.Thrift.Test.writeFunctions[fIndex];
	var data = null;
	if("writeString"==fx.name) {
		data = randomString(1024, true);
	} else {
		if("writeBool"==fx.name) {
			data = randomNumber(1)==0 ? false : true;
		} else {
			data = randomNumber(chrome.Thrift.Test.maxNumerics[fx.name]);
		}
	}
	prot[fx.name](data);
	//fx.apply(prot, data);
	return {op: fx.name.replace('write', 'read'), v:data};
}

function randomNumber(upto) {
	return Math.round(Math.random()*10000)%upto;
}

function randomString(maxLength, noEol) {
	if(maxLength==null || !$.isNumeric(maxLength)) maxLength = 256;
	if(noEol==null) noEol = false;
	var x  = Math.round((Math.random()*100))%maxLength;
	var arr = new Array(x);
	for(var i = 0; i < x; i++) {
		var ch = Math.round((Math.random()*100))%127;
		while(noEol && ch==10) {
			ch = Math.round((Math.random()*100))%127;
		}
		arr[i] = Math.abs(ch);
	}	
	return String.fromCharCode.apply(null, new Uint8Array(arr));
}




function netConnectTests() {
	testTCP().always(testUDP);
	//testUDP();
}

function allTests() {
	protocolRecordingTest();
	netConnectTests();
}