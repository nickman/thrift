
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
function str2ab(str) {
  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i<strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
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
	_preWrite: function(writeSize) {
		if(writeSize > this.writableBytesAll) throw new Error("DynamicBuffer has insufficient space for a write of size:" + this.writableBytesAll);
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
	_write: function(str) {
		if(str!=null && typeof(str)=="string") {
			var arr = str2ab(str);  // Uint16Array
			$.each(arr, function(x, y) { console.dir(arguments); });			
		}
	},
	_postWrite: function(writeSize) {
		this.woffset[this.currentBuff] += writeSize;
		this.writableBytesInBuff -= writeSize;
		this.writableBytesAll -= writeSize;
	},
	_dv: function() {
		return this.subDataViews[this.currentBuff];
	},
	_dvo: function() {
		return this.woffset[this.currentBuff];
	},
	slice: function(begin, end) {

	},
	// ====================================================================
	//		Set Ops
	// ====================================================================	
	setFloat32: function(value) {
		this._preWrite(BYTE_SIZE.Float32);
		this._dv().setFloat32(this._dvo(), value);
		this._postWrite(BYTE_SIZE.Float32);
	},
	setFloat64: function(value) {
		this._preWrite(BYTE_SIZE.Float64);
		this._dv().setFloat64(this._dvo(), value);
		this._postWrite(BYTE_SIZE.Float64);
	},
	setInt8: function(value) {
		this._preWrite(BYTE_SIZE.Int8);
		this._dv().setInt8(this._dvo(), value);
		this._postWrite(BYTE_SIZE.Int8);
	},
	setInt16: function(value) {
		this._preWrite(BYTE_SIZE.Int16);
		this._dv().setInt16(this._dvo(), value);
		this._postWrite(BYTE_SIZE.Int16);
	},
	setInt32: function(value) {
		this._preWrite(BYTE_SIZE.Int32);
		this._dv().setInt32(this._dvo(), value);
		this._postWrite(BYTE_SIZE.Int32);
	},
	setUint8: function(value) {
		this._preWrite(BYTE_SIZE.Uint8);
		this._dv().setUint8(this._dvo(), value);
		this._postWrite(BYTE_SIZE.Uint8);
	},
	setUint16: function(value) {
		this._preWrite(BYTE_SIZE.Uint16);
		this._dv().setUint16(this._dvo(), value);
		this._postWrite(BYTE_SIZE.Uint16);
	},
	setUint32: function(value) {
		this._preWrite(BYTE_SIZE.Uint32);
		this._dv().setUint32(this._dvo(), value);
		this._postWrite(BYTE_SIZE.Uint32);		
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





