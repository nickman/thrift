

/**
 * Initializes a Thrift JSON protocol instance.
 * @constructor
 * @param {Thrift.Transport} transport - The transport to serialize to/from.
 * @classdesc Apache Thrift Protocols perform serialization which enables cross 
 * language RPC. The Protocol type is the JavaScript browser implementation 
 * of the Apache Thrift TJSONProtocol.
 * @example
 *     var protocol  = new Thrift.Protocol(transport);
 */
chrome.Thrift.Protocol = function(transport) {
    this.transport = transport;
};
