var ArrayBufferView = (new Uint8Array(0)).__proto__.__proto__.constructor;
var DynamicBufferDefault = 1024;
var DynamicBufferExtend = 512;
// NastyHaxx. JavaScript forces hex constants to be
// positive, converting this into a long. If we hardcode the int value
// instead it'll stay in 32 bit-land.
var VERSION_MASK = -65536, // 0xffff0000
    VERSION_1 = -2147418112, // 0x80010000
    TYPE_MASK = 0x000000ff;


function getByteSize(name) {
	return window[name + "Array"].BYTES_PER_ELEMENT;
}

var BYTE_SIZE = {
	Float32 : getByteSize('Float32'),
	Float64 : getByteSize('Float64'),
	Int8 : getByteSize('Int8'),
	Int16 : getByteSize('Int16'),
	Int32 : getByteSize('Int32'),
	Uint8: 	getByteSize('Uint8'),
	Uint16: getByteSize('Uint16'),
	Uint32: getByteSize('Uint32')
};

var MAX_SIZE = {
	Float32 : 16777216,
	Float64 : Number.MAX_VALUE,
	Int8 	: 127,
	Int16 	: 32766,
	Int32 	: 2147483647,
	Uint8 	: 255,
	Uint16  : 65535,
	Uint32  : 4294967297
};


function unicode2ab(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

function str2ab(str) {
  var buf = new ArrayBuffer(str.length); // 1 byte for each char
  var bufView =  new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
  	bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}





var DynamicBuffer =  function(initialSize, extendSize, strictRead, strictWrite) {
	var iSize = initialSize || DynamicBufferDefault;
	this.extendSize = extendSize || DynamicBufferExtend;
	this.buffer = new ArrayBuffer(iSize);
	this.dataView = new DataView(this.buffer);
	this.writableBytes = iSize;
	this.readableBytes = 0;
	this.strictRead = (strictRead !== undefined ? strictRead : false);
	this.strictWrite = (strictWrite !== undefined ? strictWrite : true);

}





DynamicBuffer.prototype =  {
	extendSize : 0,
	buffer : null, 
	dataView : null, 
	woffset : 0,
	roffset : 0,
	writableBytes : 0,
	readableBytes : 0,
	strictRead: false,
	strictWrite: false,
	// ====================================================================
	//		Buffer Allocation Ops
	// ====================================================================	
	/**
	 *	Extends the size of the data buffer
	 *	@param the number of bytes of capacity to add, optional, defaults to {DynamicBufferDefault}
	 * 	@return the capacity of the new buffer
	 */
	_extend: function(size) {
		var newSize = (size || this.extendSize) + this.buffer.byteLength;
		console.warn("=================================================");
		console.warn("    Extending Buffer By %s to %s", (size || DynamicBufferExtend), newSize);
		console.warn("=================================================");
		var newBuffer = new ArrayBuffer(newSize);
		var rawTarget = new Uint8Array(newBuffer);
		var rawSource = new Uint8Array(this.buffer);
		rawTarget.set(rawSource);
		this.buffer = newBuffer;
		this.dataView = new DataView(this.buffer);
		this.writableBytes = newSize - this.woffset;
		return newSize;
	},
	/**
	 * Creates a new buffer with the combined capacity of the current buffer plus the passed buffer and the content of both.
	 * @param the new ArrayBuffer to append
	 * @param the number of bytes already written in the new buffer. Optional, defaults to zero.
	 */
	_appendBuffer: function(arrBuff, usedBytes) {
		if(arrBuff==null) return;
		
		var used = usedBytes || arrBuff.byteLength;
		var byteLength = arrBuff.byteLength;
		//console.debug("Appending ArrBuff: size: %s, used: %s", arrBuff.byteLength, used);

		var added = 0;
		while(this.writableBytes < byteLength) {			
			added += this._extend();
		}

		var rawTarget = new Uint8Array(this.buffer, this.woffset);
		var rawSource = new Uint8Array(arrBuff);
		rawTarget.set(rawSource);

		this.woffset += used;		
		this.writableBytes  = this.buffer.byteLength - this.woffset;
		this.readableBytes += used;
		//console.debug("_tick: woff: %s, wb: %s, ts: %s", this.woffset, this.writableBytes, this.buffer.byteLength);
	},

	// ====================================================================
	//		Buffer Matrix Ops
	// ====================================================================	

	/*
	 * Updates allocation tracking after a write
	 * @param the number of bytes written
	 */
	_tick: function(byteLength) {
		this.woffset += byteLength;
		this.writableBytes -= byteLength;
		this.readableBytes += byteLength;
		console.debug("_tick: bl: %s, woff: %s, wb: %s, rb: %s, ts: %s", byteLength, this.woffset, this.writableBytes, this.readableBytes, this.buffer.byteLength);
	},
	/*
	 * Updates read tracking after a read
	 * @param the number of bytes read
	 */
	_tock: function(byteLength) {
		this.roffset += byteLength;
		this.readableBytes -= byteLength;
		console.debug("_tock: roff: %s, rb: %s", this.roffset, this.readableBytes);
	},
	slice: function(begin, end) {
		return this.buffer.slice(begin, end);
	},
	// ====================================================================
	//		Base Type Write Ops
	// ====================================================================	
	writeByte: function(value) {
		this.writeI8(value);
	},
	writeBool: function(value) {
		if(value==null) {
			this.writeByte(0);
		} else if("boolean"==(typeof value)) {
			this.writeByte(value ? 1 : 0);
		} else {
			this.writeByte(1);
		}
	},
	_writeNumber: function(tp, value) {
		var SZ = BYTE_SIZE[tp];
		if(this.writableBytes < SZ) {
			this._extend();
			if(this.writableBytes < SZ) throw new Error("Unexpected set" + tp + " Failure: Still not enough capacity after extend:" + this.writableBytes);
		}
		this.dataView['set' + tp](this.woffset, value);
		this._tick(SZ);

	},
	writeI8: function(value) {
		this._writeNumber('Int8', value);
	},
	writeI16: function(value) {
		this._writeNumber('Int16', value);
	},
	writeI32: function(value) {
		this._writeNumber('Int32', value);
	},
	writeI64: function(value) {		
		this.writeF64(value);
	},	
	writeFl32: function(value) {
		this._writeNumber('Float32', value);
	},
	writeF64: function(value) {
		this._writeNumber('Float64', value);
	},
	writeDouble: function(value) {
		this.writeF64(value);
	},
	writeUint8: function(value) {
		this._writeNumber('Uint8', value);
	},
	writeUint16: function(value) {
		this._writeNumber('Uint16', value);
	},
	writeUint32: function(value) {
		this._writeNumber('Uint32', value);
	},
	writeString: function(strings) {
		if(strings==null) return;
		var content = null;
		
		if($.isArray(strings)) {
			content = strings;
			$.each(content, function(index, str){ 
				if(str!=null) {
					if("string" != typeof str) {
					 	content[index] = str.toString();
					}		
				}
			});
		} else {
			content = [strings];
		}
		var finalString = content.join("");
		this.writeI32(finalString.length);
		this._appendBuffer(str2ab(finalString));
	},
	writeBinary: function(value) {
		if (typeof(value) === 'string') {
			this.writeString(value);
		} else if(value instanceof ArrayBuffer) {
			this.writeI32(value.byteLength);
			this._appendBuffer(value);
		} else if(value instanceof ArrayBufferView) {
			this.writeI32(value.buffer.byteLength);
			this._appendBuffer(value.buffer);			
		} else {
			throw new Error("Unsupported Binary Type:" + typeof(value));
		}
	},
	// ====================================================================
	//		Container Write Ops
	// ====================================================================	
	writeMapBegin: function(ktype, vtype, size) {
	  this.writeByte(ktype);
	  this.writeByte(vtype);
	  this.writeI32(size);
	},
	writeMapEnd: function() {
		/* No Op */
	},
	writeListBegin: function(etype, size) {
	  this.writeByte(etype);
	  this.writeI32(size);
	},
	writeListEnd: function() {
		/* No Op */
	},
	writeSetBegin: function(etype, size) {
	  this.writeByte(etype);
	  this.writeI32(size);
	},
	writeSetEnd: function() {
		/* No Op */
	},
	// ====================================================================
	//		Structure Write Ops
	// ====================================================================	
	writeMessageBegin: function(name, type, seqid) {
	    if (this.strictWrite) {
	      this.writeI32(VERSION_1 | type);
	      this.writeString(name);
	      this.writeI32(seqid);
	    } else {
	      this.writeString(name);
	      this.writeByte(type);
	      this.writeI32(seqid);
	    }
	},
	writeMessageEnd: function() {
		/* No Op */
	},
	writeStructBegin: function() {
		/* No Op */
	},
	writeStructEnd: function() {
		/* No Op */
	},
	writeFieldBegin: function(name, type, id) {
	  this.writeByte(type);
	  this.writeI16(id);
	},
	writeFieldEnd: function() {
		/* No Op */
	},
	writeFieldStop: function() {
		this.writeByte(chrome.Thrift.Type.STOP);
	},

	// ====================================================================
	//		Base Type Read Ops
	// ====================================================================
	_readNumber: function(tp, offset) {
		var SZ = BYTE_SIZE[tp];		
		if(offset==null) offset = this.roffset;
		console.debug("Reading [%s] with size [%s] at offset [%s]", tp, SZ, offset);
		if(this.readableBytes < SZ) {
			throw new Error("Buffer underflow. Request: [" + SZ + "], Available: [" + this.readableBytes + "]");
		}
		var value = this.dataView['get' + tp](offset);
		this._tock(SZ);
		return value;
	},

	readBool: function(offset) {
		value = this.readI8(offset); 
		if(value==0) return false;
		else if(value==1) return true;
		else throw Error("Type error for boolean. Expected 0 or 1 but read [" + value + "]");
	},
	readByte: function(offset) {
		return this.readI8(offset);
	},
	readI8: function(offset) {
		return this._readNumber('Int8', offset);
	},	
	readI16: function(offset) {
		return this._readNumber('Int16', offset);
	},
	readI32: function(offset) {
		return this._readNumber('Int32', offset);
	},
	readI64: function(offset) {
		return this._readNumber('Float64', value);
	},
	readDouble: function(offset) {
		return this.readI64(offset);
	},
	readString: function(offset) {
		return ab2str(this.readBinary(offset));
	},
	readBinary: function(offset) {
		var len = this.readI32(offset);
		console.debug("Reading VarBytes with length: [%s]", len);		// FIXME or ditch optional offset
		var arrBuff = this.slice(offset!=null ? (offset+4) : this.roffset, this.roffset + len);
		this._tock(len);
		return arrBuff;
	},
	// ====================================================================
	//		Container Read Ops
	// ====================================================================	
	readMapBegin: function() {
	  var ktype = this.readByte();
	  var vtype = this.readByte();
	  var size = this.readI32();
	  return {ktype: ktype, vtype: vtype, size: size};
	},
	readMapEnd: function() {
		/* No Op */
	},
	readListBegin: function() {
	  var etype = this.readByte();
	  var size = this.readI32();
	  return {etype: etype, size: size};
	},
	readListEnd: function() {
		/* No Op */
	},
	readSetBegin: function() {
	  var etype = this.readByte();
	  var size = this.readI32();
	  return {etype: etype, size: size};
	},
	readSetEnd: function() {
		/* No Op */
	},
	// ====================================================================
	//		Structure Read Ops
	// ====================================================================	
	readMessageBegin: function() {

	},
	readMessageEnd: function() {

	},
	readStructBegin: function() {

	},
	readStructEnd: function() {

	},
	readFieldBegin: function() {

	},
	readFieldEnd: function() {

	},
	

}



function isUnicode(str) {
	for(var i = 0, m = str.length; i < m; i++) {
		if(str.charCodeAt(i) > 127) {
			return true;
		}
	}
	return false;
}

function randomStringTest(maxLength, noEol) {
	var samples = [];
	var d = new DynamicBuffer();
	for(var i = 0; i < 500; i++) {
		var str = randomString(maxLength, noEol);
		d.writeString(str);
		samples.push(str);
	}
	console.log("Writes Complete");
	var passes = 0;
	var fails = 0;
	for(var i = 0; i < 500; i++) {
		var rs = d.readString();
		var samp = samples.shift();
		if(samp==rs) passes++;
		else fails++;
	}
	console.info("randomStringTest: passes: %s, fails: %s", passes, fails);
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


function ab2StringTest() {
	for(var i = 100; i < 1000000;) {
		var arr = new Array(i);
		for(var x = 0; x < i; x++) {
			arr[x] = Math.round((Math.random()*100))%127;
		}
		console.time("ToArrBuffer(" + i + ")");
		var str = String.fromCharCode(new Uint8Array(arr));
		console.debug("Uni:%s", isUnicode(str));
		console.timeEnd("ToArrBuffer(" + i + ")");				
		i+=10000;
	}
}


