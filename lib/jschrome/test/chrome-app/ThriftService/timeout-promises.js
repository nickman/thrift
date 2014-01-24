/**
 * Deferred/Promise wrapper for jQuery with timeout support
 * Whitehead, 2014
 */


 chrome.TimeoutTask = {
	/** The default timeout in ms. */
	TimeoutTaskDefaultTimeout : 1000,
	/** A counter for unique alarm ids */
	TimeoutTaskIDCounter : 0
 };

/**
 * Creates a new timeout task
 * @param {number} timeout - The timeout for the task in ms.
 * @param {function} beforeStart - An optional function that is called just before the constructor returns. 
 */
 chrome.TimeoutTask = function(timeout, beforeStart) {
 	t = (timeout!=null && typeof timeout = "number") ? timeout : chrome.TimeoutTask.Ctx.TimeoutTaskDefaultTimeout;
 	aId = "TimeoutTask:" + new Date().getTime() + "-" + chrome.TimeoutTask.Ctx.TimeoutTaskIDCounter++;
 	d = $.Deferred(beforeStart);
 	chrome.alarms.create(this.aId, {when: Date.now() + this.t}});
 	chrome.alarms.onAlarm.addListener(this.timeoutHandler); 
 };

 chrome.TimeoutTask.Ctx = {
	/** The default timeout in ms. */
	TimeoutTaskDefaultTimeout : 1000,
	/** A counter for unique alarm ids */
	TimeoutTaskIDCounter : 0
 };

/**
 * Prototype definition for TimeoutTask
 */
chrome.TimeoutTask.prototype = {
	t: null,
	aId: null,
	d: null,
	timedOutState: false,
	timeoutHandler: function(alarm) {
		if(alarm!=null && alarm.name!=null) {
			if(aId==alarm.name) {
				this.timedout(this.t);
			}
		}		
	},
	timedout: function(elapsed) {
		this.timedOutState = true;
		this.reject();
	},
	wasTimedOut: {
		return this.timedOutState;
	},
	resolve: function(args) {
		chrome.alarms.clear(aId);
		return this.d.resolve(args);	
	},
	reject: function(args) {
		chrome.alarms.clear(aId);
		return this.d.reject(args);	
	},
	resolve: function(args) {
		chrome.alarms.clear(aId);
		return this.d.resolve(args);	
	},
	progress: function(args) {
		chrome.alarms.clear(aId);
		chrome.alarms.create(this.aId, {when: Date.now() + this.t}});
		return this.d.progress(args);	
	},
	promise: function(obj) {
		return this.d.promise(obj);
	}

};

