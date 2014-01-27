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

chrome.Thrift.Protocol {
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
		Float32 : this.getByteSize('Float32'),
		Float64 : this.getByteSize('Float64'),
		Int8 : this.getByteSize('Int8'),
		Int16 : this.getByteSize('Int16'),
		Int32 : this.getByteSize('Int32'),
		Uint8: 	this.getByteSize('Uint8'),
		Uint16: this.getByteSize('Uint16'),
		Uint32: this.getByteSize('Uint32')
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
	  return String.fromCharCode(new Uint8Array(buf)); // tested up to 1m chars
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
  	this.options = $.extend({}, options);  	
};

chrome.Thrift.inherits(chrome.Thrift.TBinaryProtocol, chrome.Thrift.TProtocol, 'TBinaryProtocol');

chrome.Thrift.TBinaryProtocol.prototype = {
	flush : function() {
  		return this.trans.flush();
	},
	writeByte : function(byte) {
	  this.trans.write(new Buffer([byte]));
	},

	writeI16 : function(i16) {
	  this.trans.write(binary.writeI16(new Buffer(2), i16));
	},

	writeI32 : function(i32) {
	  this.trans.write(binary.writeI32(new Buffer(4), i32));
	},

	writeI64 : function(i64) {
	  if (i64.buffer) {
	    this.trans.write(i64.buffer);
	  } else {
	    this.trans.write(new Int64(i64).buffer)
	  }
	},

	writeDouble : function(dub) {
	  this.trans.write(binary.writeDouble(new Buffer(8), dub));
	},

	writeString : function(arg) {
	  if (typeof(arg) === 'string') {
	    this.writeI32(Buffer.byteLength(arg, 'utf8'))
	    this.trans.write(arg, 'utf8');
	  } else if (arg instanceof Buffer) {
	    this.writeI32(arg.length)
	    this.trans.write(arg);
	  } else {
	    throw new Error('writeString called without a string/Buffer argument: ' + arg)
	  }
	},

	writeMessageBegin : function(name, type, seqid) {
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
};
$.extend(true, chrome.Thrift.TBinaryProtocol.prototype, chrome.Thrift.TProtocol.prototype);



