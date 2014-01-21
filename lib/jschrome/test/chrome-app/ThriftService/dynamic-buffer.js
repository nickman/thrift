
var DynamicBufferDefault = 1024;
var DynamicBufferMax = DynamicBufferDefault * 1600;

function  inherits(constructor, superConstructor, name) {
  function F() {}
  F.prototype = superConstructor.prototype;
  constructor.prototype = new F();
  constructor.prototype.name = name || "";
}


var DynamicBuffer =  function(length) {

}
inherits(DynamicBuffer, ArrayBuffer, 'DynamicBuffer');

DynamicBuffer.prototype =  {
	subBuffers: [],
	readIndex: 0,
	writeIndex: 0,
	dataView: null,
	slice: function(begin, end) {

	},
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

	},
	setFloat32: function setFloat32() {

	},
	setFloat64: function setFloat64() {

	},
	setInt8: function setInt8() {

	},
	setInt16: function setInt16() {

	},
	setInt32: function setInt32() {

	},
	setUint8: function setUint8() {

	},
	setUint16: function setUint16() {

	},
	setUint32: function setUint32() {
		
	}	
}





