var ArrayBufferView = (new Uint8Array(0)).__proto__.__proto__.constructor;
var DynamicBufferDefault = 1024;
var DynamicBufferArrMax = 10;

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
  var bufView = new Uint8Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
  	bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function appendBuffer(source, target, spaceAvail, sourceOffset, targetOffset) {
	if(source==null || target==null) return 0;
	if(spaceAvail==null || !($.isNumeric(spaceAvail)) || spaceAvail < 0) throw new Error("Invalid available space [" + spaceAvail + "]" );
	if(targetOffset==null) targetOffset = 0;
	if(sourceOffset==null) sourceOffset = 0;	
	if(!($.isNumeric(targetOffset))) throw new Error("Invalid target offset [" + targetOffset + "]" );
	if(spaceAvail < 1 || source.byteLength < 1) return 0;
	var bytesToCopy = (spaceAvail >= source.byteLength) ? source.byteLength : spaceAvail;
	console.debug("Copying [%s] bytes. srcoff:%s, taroff:%s", bytesToCopy, sourceOffset, targetOffset);
	sourceArrView = new Uint8Array(source, sourceOffset, bytesToCopy);	
	targetArrView = new Uint8Array(target, targetOffset, bytesToCopy);	
	targetArrView.set(sourceArrView);

	return bytesToCopy;
}

function test() {
	var source = str2ab("Hello World [" + new Date() + "]");
	console.log("Size:" + source.byteLength);
	var target = new ArrayBuffer(source.byteLength);
	appendBuffer(source, target, source.byteLength);
	console.log("target:%s", ab2str(target));
}


var DynamicBuffer =  function(buffSize, maxBuffers) {
	this.buffSize = buffSize || DynamicBufferDefault;
	this.maxBuffers = maxBuffers || DynamicBufferArrMax;
	this.byteLength = this.maxBuffers * this.buffSize;
	this.subBuffers = new Array(this.maxBuffers);
	this.subDataViews = new Array(this.maxBuffers);

	this.woffset = new Int32Array(this.maxBuffers);   // write offset: bufferIndex -> offset
	this.roffset = new Int32Array(this.maxBuffers);   // read offset: bufferIndex -> offset

	this.currentBuff = -1;
	this.writableBytesInBuff = this.buffSize-1;
	this.writableBytesAll = this.byteLength-1;
	this._initNextSlot();
}



DynamicBuffer.prototype =  {
	subBuffers: null,
	subDataViews: null,
	woffset : null,  		// write offset [bufferIndex, offset]  
	roffset : null,
	writableBytesInBuff: -1,
	writableBytesAll: -1,
	readIndex: 0,
	writeIndex: 0,
	dataView: null,
	byteLength: 0,


	// ====================================================================
	//		Buffer Matrix Ops
	// ====================================================================	
	_initSlot: function(index) {
		this.subBuffers[index] = new ArrayBuffer(this.buffSize);
		this.subDataViews[index] = new DataView(this.subBuffers[index], 0);
	},
	_initNextSlot: function() {
		if(this.currentBuff==this.maxBuffers) throw new Error("DynamicBuffer is at maximum number of subBuffers:" + this.currentBuff);
		this.currentBuff++;
		this._initSlot(this.currentBuff);
		this.writableBytesInBuff = this.buffSize-1;
	},
	_preWrite: function(writeSize) { // writeSize of < 1 means we have no idea what the size is so the write will have to figure it out.
		if(writeSize > -1 && writeSize > this.writableBytesAll) throw new Error("DynamicBuffer has insufficient space for a write of size:" + this.writableBytesAll);
		if(this.currentBuff<0) {
			this.currentBuff = 0;
			this._initSlot(0);
		} else {
			if(this.writableBytesInBuff < writeSize) {
				// mark the rest of current buffer as written
				this.writableBytesAll -= (this.buffSize - this.woffset[this.currentBuff]);
				// roll into next buffer
				this._initNextSlot();
			}
		}
	},
	/*
	 * Writes the full capacity of the passed ArrayBuffer and updates the allocation tracking
	 */
	_write: function(arrBuff) {
		if(arrBuff==null) return;
		var byteLength = arrBuff.byteLength;
		if(byteLength > this.writableBytesAll) throw new Error("DynamicBuffer has insufficient space for a write of size:" + byteLength);
		var bytesWritten = 0;  // also the read offset for arrBuff
		while(bytesWritten < byteLength) {
			if(this.writableBytesInBuff==0) this._initNextSlot();
			bytesWritten += appendBuffer(arrBuff, this.subBuffers[this.currentBuff], this.writableBytesInBuff, bytesWritten, this.woffset[this.currentBuff]);
			this._tick(bytesWritten);
		}
		return bytesWritten;
	},

	// appendBuffer(source, target, spaceAvail, sourceOffset, targetOffset) 
	//  <---  returns bytesWriten


	_dv: function() {
		return this.subDataViews[this.currentBuff];
	},
	_dvo: function() {
		return this.woffset[this.currentBuff];
	},
	/*
	 * Updates allocation tracking after a native number write
	 * @param the number of bytes written
	 */
	_tick: function(byteLength) {
		this.woffset[this.currentBuff] += byteLength;
		this.writableBytesInBuff -= byteLength;
		this.writableBytesAll -= byteLength;
		console.debug("_tick: woff: %s, bw: %s, aw: %s, bi: %s", this.woffset[this.currentBuff], this.writableBytesInBuff, this.writableBytesAll, this.currentBuff);
	},
	/*
	 * Calculates the internal coordinates for the passed logical offset
	 * @param the logical offset
	 * @return the coordinates of the logical offset as Number[buffIndex, buffOffset]
	 */
	_offset: function(offset) {
		if(offset==null) throw new Error("Offset was null");
		if(!$.isNumeric(offset)) throw new Error("Invalid offset [" + offset + "]");
		var off = parseInt(offset);
		if(off < 0) throw new Error("Offset underflow [" + off + "]");
		if(off > (this.byteLength-1)) throw new Error("Offset overflow [" + off + "]");
		return [
			Math.floor(offset/this.byteLength),
			offset % this.buffSize
		];
	},
	slice: function(begin, end) {

	},
	// ====================================================================
	//		Set Ops
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
	writeFl32: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Float32) {
			this._dv().setFloat32(this._dvo(), value);
			this._tick(BYTE_SIZE.Float32);
		} else {
			this._write(new Float32Array([value]));
		}
	},
	writeF64: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Float64) {
			this._dv().setFloat64(this._dvo(), value);
			this._tick(BYTE_SIZE.Float64);
		} else {
			this._write(new Float64Array([value]));
		}
	},
	writeI8: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Int8) {
			this._dv().setInt8(this._dvo(), value);
			this._tick(BYTE_SIZE.Int8);
		} else {
			this._write(new Int8Array([value]));
		}
	},
	writeI16: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Int16) {
			this._dv().setInt16(this._dvo(), value);
			this._tick(BYTE_SIZE.Int16);
		} else {
			this._write(new Int16Array([value]));
		}
	},
	writeI32: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Int32) {
			this._dv().setInt32(this._dvo(), value);
			this._tick(BYTE_SIZE.Int32);
		} else {
			this._write(new Int32Array([value]));
		}
	},
	writeI64: function(value) {
		this.writeF64(value);
	},
	writeDouble: function(value) {
		this.writeF64(value);
	},

	writeUint8: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Uint8) {
			this._dv().setUint8(this._dvo(), value);
			this._tick(BYTE_SIZE.Uint8);
		} else {
			this._write(new Uint8Array([value]));
		}
	},
	writeUint16: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Uint16) {
			this._dv().setUint16(this._dvo(), value);
			this._tick(BYTE_SIZE.Uint16);
		} else {
			this._write(new Uint16Array([value]));
		}
	},
	writeUint32: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Uint32) {
			this._dv().setUint32(this._dvo(), value);
			this._tick(BYTE_SIZE.Uint32);
		} else {
			this._write(new Uint32Array([value]));
		}
	},
	writeString: function(strings) {
		if(strings==null) return;
		var content = null;
		var length = 0;
		if($.isArray(strings)) {
			content = strings;
			$.each(content, function(index, str){ 
				if(str!=null) {
					if("string" != typeof str) {
					 	content[index] = str.toString();
					}
					length += content[index].length; 
				}
			});
		} else {
			content = [strings];
			length = strings.length;
		}
		this.writeI32(length);
		var self = this;
		$.each(content, function _write_content_(index, item){
			if(item!=null) {
				if("string" != typeof item)  item = item.toString();
				self._write(str2ab(item));
			}
		});
	},
	writeBinary: function(value) {
		if (typeof(value) === 'string') {
			this.writeString(value);
		} else if(value instanceof ArrayBuffer) {
			this._write(value);
		} else if(value instanceof ArrayBufferView) {
			this._write(value.bufferIndex);
		} else {
			throw new Error("Unsupported Binary Type:" + typeof(value));
		}
	},
	// ====================================================================
	//		Read Ops
	// ====================================================================
	readBool: function() {

	},
	readByte: function() {

	},
	readI16: function() {

	},
	readI32: function() {

	},
	readI64: function() {

	},
	readDouble: function() {

	},
	readString: function() {

	},
	readBinary: function() {

	}
}



function isUnicode(str) {
	for(var i = 0, m = str.length; i < m; i++) {
		if(str.charCodeAt(i) > 255) {
			return true;
		}
	}
	return false;
}


