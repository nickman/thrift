var ArrayBufferView = (new Uint8Array(0)).__proto__.__proto__.constructor;
var DynamicBufferDefault = 1024;
var DynamicBufferExtend = 512;

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





var DynamicBuffer =  function(buffSize, extendSize) {
	this.buffSize = buffSize || DynamicBufferDefault;
	this.extendSize = extendSize || DynamicBufferExtend;
	this.buffer = new ArrayBuffer(this.buffSize);
	this.dataView = new DataView(this.buffer);
	this.writableBytes = this.buffSize;
}





DynamicBuffer.prototype =  {
	buffSize : 0,
	buffer : null, 
	dataView : null, 
	woffset : 0,
	roffset : 0,
	writableBytes : 0,
	redableBytes : 0,
	// ====================================================================
	//		Buffer Allocation Ops
	// ====================================================================	
	/**
	 *	Extends the size of the data buffer
	 *	@param the number of bytes of capacity to add, optional, defaults to {DynamicBufferDefault}
	 * 	@return the capacity of the new buffer
	 */
	_extend: function(size) {

		var newSize = (size || DynamicBufferExtend) + this.buffSize;
		console.warn("=================================================");
		console.warn("    Extending Buffer By %s to %s", (size || DynamicBufferExtend), newSize);
		console.warn("=================================================");
		this._appendBuffer(new ArrayBuffer(newSize));
		return newSize;
	},
	/**
	 * Creates a new buffer with the combined capacity of the current buffer plus the passed buffer and the content of both.
	 */
	_appendBuffer: function(arrBuff) {
		var newBuff = new ArrayBuffer(this.woffset + arrBuff.byteLength);
		// Append current to new
		var targetArrView = new Uint8Array(newBuff, 0, newBuff.byteLength);		
		console.debug("_append:  srcview: woff: %s,  len: %s", this.woffset, this.buffer.byteLength);
		var sourceArrView = new Uint8Array(this.buffer, 0, this.woffset);
		targetArrView.set(sourceArrView);
		// Append passed to new
		targetArrView = new Uint8Array(newBuff, this.buffer.byteLength, arrBuff.byteLength);		
		sourceArrView = new Uint8Array(arrBuff, 0, arrBuff.byteLength);
		targetArrView.set(sourceArrView);
		// Update references, but not any offsets, since we don't know what they are here.
		this.buffer = newBuff;
		this.dataView = new DataView(this.buffer);
		this.buffSize = newBuff.byteLength;
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
		console.debug("_tick: woff: %s, wb: %s, ts: %s", this.woffset, this.writableBytes, this.buffSize);
	},
	/*
	 * Updates read tracking after a read
	 * @param the number of bytes read
	 */
	_tock: function(byteLength) {
		this.roffset += byteLength;
		this.redableBytes -= byteLength;
		console.debug("_tock: roff: %s, rb: %s", this.roffset, this.redableBytes);
	},
	slice: function(begin, end) {
		return this.buffer.slice(begin, end);
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


