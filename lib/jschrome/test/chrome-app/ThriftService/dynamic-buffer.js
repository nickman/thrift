
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

// from:  http://stackoverflow.com/questions/6965107/converting-between-strings-and-arraybuffers
function unicode2ab(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}

// from:  http://stackoverflow.com/questions/6965107/converting-between-strings-and-arraybuffers
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

function appendBuffer(source, target, spaceAvail, targetOffset, sourceOffset) {
	if(source==null || target==null) return 0;
	if(spaceAvail==null || !($.isNumeric(spaceAvail)) || spaceAvail < 0) throw new Error("Invalid available space [" + spaceAvail + "]" );
	if(targetOffset==null) targetOffset = 0;
	if(sourceOffset==null) sourceOffset = 0;	
	if(!($.isNumeric(targetOffset))) throw new Error("Invalid target offset [" + targetOffset + "]" );
	if(spaceAvail < 1 || source.byteLength < 1) return 0;
	var bytesToCopy = (spaceAvail >= source.byteLength) ? source.byteLength : spaceAvail;
	console.debug("Copying [%s] bytes.", bytesToCopy);
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

	this.woffset = new Array(this.maxBuffers);   // write offset: bufferIndex -> offset
	for(var i = 0; i < this.woffset.length; i++) { this.woffset[i] = 0; }

	this.currentBuff = -1;
	this.writableBytesInBuff = this.buffSize;
	this.writableBytesAll = this.byteLength;
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
		this.writableBytesInBuff = this.buffSize;
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
	_write: function(str) {
		if(str!=null && typeof(str)=="string") {
			var arr = str2ab(str);  // Uint16Array
			$.each(arr, function(x, y) { console.dir(arguments); });			
		}
	},
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
		this.woffset[this.currentBuff] += writeSize;
		this.writableBytesInBuff -= writeSize;
		this.writableBytesAll -= writeSize;
	}
	slice: function(begin, end) {

	},
	// ====================================================================
	//		Set Ops
	// ====================================================================	
	setFloat32: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Float32) {
			this._dv().setFloat32(this._dvo(), value);
			this._tick(BYTE_SIZE.Float32);
		} else {
			this._write(new Float32Array([value]));
		}
	},
	setFloat64: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Float64) {
			this._dv().setFloat64(this._dvo(), value);
			this._tick(BYTE_SIZE.Float64);
		} else {
			this._write(new Float64Array([value]));
		}
	},
	setInt8: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Int8) {
			this._dv().setInt8(this._dvo(), value);
			this._tick(BYTE_SIZE.Int8);
		} else {
			this._write(new Int8Array([value]));
		}
	},
	setInt16: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Int16) {
			this._dv().setInt16(this._dvo(), value);
			this._tick(BYTE_SIZE.Int16);
		} else {
			this._write(new Int16Array([value]));
		}
	},
	setInt32: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Int32) {
			this._dv().setInt32(this._dvo(), value);
			this._tick(BYTE_SIZE.Int32);
		} else {
			this._write(new Int32Array([value]));
		}
	},
	setUint8: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Uint8) {
			this._dv().setUint8(this._dvo(), value);
			this._tick(BYTE_SIZE.Uint8);
		} else {
			this._write(new Uint8Array([value]));
		}
	},
	setUint16: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Uint16) {
			this._dv().setUint16(this._dvo(), value);
			this._tick(BYTE_SIZE.Uint16);
		} else {
			this._write(new Uint16Array([value]));
		}
	},
	setUint32: function(value) {
		if(this.writableBytesInBuff >= BYTE_SIZE.Uint32) {
			this._dv().setUint32(this._dvo(), value);
			this._tick(BYTE_SIZE.Uint32);
		} else {
			this._write(new Uint32Array([value]));
		}
	},
	setString: function(strings) {
		if(strings==null) return;
		var content = null;
		if($.isArray(strings)) {
			content = strings;
		} else {
			content = [strings];
		}
		$.each(content, function _write_content_(index, item){
			if(item!=null) {
				if("string" != typeof item)  item = item.toString();

			}
		});
	}
	// ====================================================================
	//		Get Ops
	// ====================================================================
	getFloat32: function getFloat32() {

	},
	getFloat64: function getFloat64() {

	},
	getInt8: function getInt8() {

	},
	getInt16: function getInt16() {

	},
	getInt32: function getInt32() {

	},
	getUint8: function getUint8() {

	},
	getUint16: function getUint16() {

	},
	getUint32: function getUint32() {

	}
}





