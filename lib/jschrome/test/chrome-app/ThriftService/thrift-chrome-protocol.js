/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


/** Promotes ArrayBufferView to a first class obejct so we can execute "inherrits" against it */
var ArrayBufferView = (new Uint8Array(0)).__proto__.__proto__.constructor;

chrome.Thrift.getByteSize = function(name) {
		return window[name + "Array"].BYTES_PER_ELEMENT;
};

chrome.Thrift.Protocol = {
	/** The default size of new dynamic buffers */	
	DynamicBufferDefault : 1024,
	/** The default size of the capacity increase when dynamic buffers are extended */	
	DynamicBufferExtend : 512,
	/** The version mask for version inquiry bit shifts */
	VERSION_MASK : -65536,
    /** The version 1 bit mask */
    VERSION_1 : -2147418112, 
    /** The type mask for version inquiry bit shifts */
    TYPE_MASK : 0x000000ff,
    /** Utility function ti read the byte size of ArrayBuffer native types */
	getByteSize : function(name) {
		return window[name + "Array"].BYTES_PER_ELEMENT;
	},    
    /** The byte sizes of the ArrayBuffer native types */
	BYTE_SIZE : {
		Float32 : chrome.Thrift.getByteSize('Float32'),
		Float64 : chrome.Thrift.getByteSize('Float64'),
		Int8 : chrome.Thrift.getByteSize('Int8'),
		Int16 : chrome.Thrift.getByteSize('Int16'),
		Int32 : chrome.Thrift.getByteSize('Int32'),
		Uint8: 	chrome.Thrift.getByteSize('Uint8'),
		Uint16: chrome.Thrift.getByteSize('Uint16'),
		Uint32: chrome.Thrift.getByteSize('Uint32')
	},
	/** The maximum effective values for array buffer native types */
	MAX_SIZE : {
		Float32 : 16777216,
		Float64 : Number.MAX_VALUE,
		Int8 	: 127,
		Int16 	: 32766,
		Int32 	: 2147483647,
		Uint8 	: 255,
		Uint16  : 65535,
		Uint32  : 4294967297
	},
	/** Converts a string to a UTF-16 array buffer */
	unicode2ab: function(str) {
	  var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
	  var bufView = new Uint16Array(buf);
	  for (var i=0, strLen=str.length; i<strLen; i++) {
	    bufView[i] = str.charCodeAt(i);
	  }
	  return bufView;
	},
	/** Converts a string to a UTF-8 array buffer */
	str2ab: function(str) {
	  var buf = new ArrayBuffer(str.length); // 1 byte for each char
	  var bufView =  new Uint8Array(buf);
	  for (var i=0, strLen=str.length; i<strLen; i++) {
	  	bufView[i] = str.charCodeAt(i);
	  }
	  return bufView;
	},
	/** Converts an array buffer to a string */
	ab2str: function(buf) {
	  return String.fromCharCode.apply(null, new Uint8Array(buf)); // tested up to 1m chars
	},
	/** Determines if the passed string has any 2 byte characters */
	isUnicode: function(str) {
		for(var i = 0, m = str.length; i < m; i++) {
			if(str.charCodeAt(i) > 127) {
				return true;
			}
		}
		return false;
	}
};


chrome.Thrift.TProtocol = function(transport, options) {
	// if(transport==null) throw new Error("The passed transport was null");
	// this.transport = transport;
	// this.options = $.extend({}, options);
};



// ===================================================================================================
//  Binary Protocol
// ===================================================================================================

chrome.Thrift.TBinaryProtocol = function(transport, strictRead, strictWrite, options) {
	if(transport==null) throw new Error("The passed transport was null");
	this.trans = transport;	
	this.strictRead = (strictRead !== undefined ? strictRead : false);
  	this.strictWrite = (strictWrite !== undefined ? strictWrite : true);
  	this.options = $.extend({
  		initialSize : chrome.Thrift.Protocol.DynamicBufferDefault,
  		extendSize : chrome.Thrift.Protocol.DynamicBufferExtend  		
  	}, options);  		
	this.extendSize = this.options.extendSize;
	this.buffer = new ArrayBuffer(this.options.initialSize);
	this.dataView = new DataView(this.buffer);
	this.writableBytes = this.options.initialSize;
	this.readableBytes = 0;		
};



chrome.Thrift.inherits(chrome.Thrift.TBinaryProtocol, chrome.Thrift.TProtocol, 'TBinaryProtocol');

chrome.Thrift.TBinaryProtocol.prototype = {
	extendSize : 0,
	buffer : null, 
	dataView : null, 
	trans: null,
	options : null,
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
		console.warn("    Extending Buffer By %s to %s", (size || this.extendSize), newSize);
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
	/** Shrinks the array buffer by effectively discarding the read range of bytes at the beginning of the buffer */
	_shrink: function() {
		//  [.....r....w....]  -->  [r....w....]
		var newArrBuff = new ArrayBuffer(this.buffer.byteLength - this.roffset);
		// FIXME
	},
	/** Shrinkwraps the written, but unread range of bytes, returning the range as a new array buffer and then clears */
	_flush: function() {
		// sw return  |<-->|
		//  	[.....r....w....]  -->  [.....rw.........]
		var shrinkWrapped = this.slice(this.roffset, this.woffset);
		this.writableBytes = this.woffset - this.roffset;
		this.woffset = this.roffset;
		return shrinkWrapped;
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
	_writeNumber: function(tp, value) {
		var SZ = chrome.Thrift.Protocol.BYTE_SIZE[tp];
		if(this.writableBytes < SZ) {
			this._extend();
			if(this.writableBytes < SZ) throw new Error("Unexpected set" + tp + " Failure: Still not enough capacity after extend:" + this.writableBytes);
		}
		this.dataView['set' + tp](this.woffset, value);
		this._tick(SZ);
	},	
	writeByte: function writeByte(value) {
		this.writeI8(value);	
	},
	writeBool: function writeBool(value) {
		if(value==null) {
			this.writeByte(0);
		} else if("boolean"==(typeof value)) {
			this.writeByte(value ? 1 : 0);
		} else {
			this.writeByte(1);
		}
	},
	writeI8: function writeI8(value) {
		this._writeNumber('Int8', value);
		
	},
	writeI16: function writeI16(value) {
		this._writeNumber('Int16', value);
		
	},
	writeI32: function writeI32(value) {
		this._writeNumber('Int32', value);
		
	},
	writeI64: function writeI64(value) {		
		this.writeF64(value);
		
	},	
	writeF32: function writeF32(value) {
		this._writeNumber('Float32', value);
		
	},
	writeF64: function writeF64(value) {
		this._writeNumber('Float64', value);
		
	},
	writeDouble: function writeDouble(value) {
		this.writeF64(value);
		
	},
	writeUint8: function writeUint8(value) {
		this._writeNumber('Uint8', value);
		
	},
	writeUint16: function writeUint16(value) {
		this._writeNumber('Uint16', value);
		
	},
	writeUint32: function writeUint32(value) {
		this._writeNumber('Uint32', value);
		
	},
	writeString: function writeString(strings) {
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
		this._appendBuffer(chrome.Thrift.Protocol.str2ab(finalString));		
	},
	writeBinary: function writeBinary(value) {
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
	_readNumber: function(tp) {
		var SZ = chrome.Thrift.Protocol.BYTE_SIZE[tp];				
		//console.debug("Reading [%s] with size [%s] at offset [%s]", tp, SZ, this.roffset);
		if(this.readableBytes < SZ) {
			throw new Error("Buffer underflow. Request: [" + SZ + "], Available: [" + this.readableBytes + "]");
		}
		var value = this.dataView['get' + tp](this.roffset);
		this._tock(SZ);
		return value;
	},

	readBool: function() {
		value = this.readI8(); 
		if(value==0) return false;
		else if(value==1) return true;
		else throw Error("Type error for boolean. Expected 0 or 1 but read [" + value + "]");
	},
	readByte: function() {
		return this.readI8();
	},
	readI8: function() {
		return this._readNumber('Int8');
	},	
	readI16: function() {
		return this._readNumber('Int16');
	},
	readI32: function() {
		return this._readNumber('Int32');
	},
	readI64: function() {
		return this._readNumber('Float64');
	},
	readDouble: function() {
		return this.readI64();
	},
	readString: function() {
		return chrome.Thrift.Protocol.ab2str(this.readBinary());
	},
	readBinary: function() {
		var len = this.readI32();
		var arrBuff = this.slice(this.roffset, this.roffset + len);
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
	  var sz = this.readI32();
	  var type, name, seqid;

	  if (sz < 0) {
	    var version = sz & chrome.Thrift.Protocol.VERSION_MASK;
	    if (version != chrome.Thrift.Protocol.VERSION_1) {
	      console.log("BAD: " + version);
	      throw new TProtocolException(chrome.Thrift.TApplicationExceptionType.PROTOCOL_ERROR, "Bad version in readMessageBegin: " + sz);
	    }
	    type = sz & chrome.Thrift.Protocol.TYPE_MASK;
	    name = this.readString();
	    seqid = this.readI32();
	  } else {
	    if (this.strictRead) {
	      throw new TProtocolException(chrome.Thrift.TApplicationExceptionType.PROTOCOL_ERROR, "No protocol version header");
	    }
	    name = this.trans.read(sz);
	    type = this.readByte();
	    seqid = this.readI32();
	  }
	  return {fname: name, mtype: type, rseqid: seqid};

	},
	readMessageEnd: function() {
		/* No Op */
	},
	readStructBegin: function() {
		return {fname: ''};
	},
	readStructEnd: function() {
		/* No Op */	
	},
	readFieldBegin: function() {
	  var type = this.readByte();
	  if (type == chrome.Thrift.Type.STOP) {
	    return {fname: null, ftype: type, fid: 0};
	  }
	  var id = this.readI16();
	  return {fname: null, ftype: type, fid: id};		
	},
	readFieldEnd: function() {
		/* No Op */
	},	
	flush: function() {
		var flushData = this._flush();
		this.trans.write(flushData);
		return flushData;
	},
};




