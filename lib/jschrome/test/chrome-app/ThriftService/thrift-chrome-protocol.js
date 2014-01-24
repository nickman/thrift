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


chrome.Thrift.TProtocol = function(transport, options) {
	// if(transport==null) throw new Error("The passed transport was null");
	// this.transport = transport;
	// this.options = $.extend({}, options);
};

chrome.Thrift.Protocol.prototype = {
	transport: null,
	options: null,


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
	flush = function() {
  		return this.trans.flush();
	},

	writeMessageBegin = function(name, type, seqid) {
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

writeString =:function(arg) {
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
