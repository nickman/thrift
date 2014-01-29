self.onmessage = function(event) {
	var x = eval(event.data);
	self.postMessage("Evaled: [" + x + "]");
}