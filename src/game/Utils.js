define(["jquery"], function($) {

	var ResLoader = function() {
		this.queue = {};
		this.types = {};
		this.objs = {};
	};

	ResLoader.prototype.load = function(id, url, type) {
		this.queue[id] = url;
		this.types[id] = type;
		var o = {};
		this.objs[id] = o;
		return o;
	}

	ResLoader.prototype.start = function(cb) {
		var item;
		var data = {};
		var loaderCtx = this;
		var itemsToLoad = Object.keys(this.queue).length;
		var loadedCount = 0;

		//alert(Object.keys(this.queue));

		for (var key in this.queue) {
			var type = this.types[key] || "arraybuffer";
			getFromURL(this.queue[key], type, function(key) {
				return function(result) {
					data[key] = result;
					loadedCount++;
					loaderCtx.objs[key].value = result;

					if (loadedCount == itemsToLoad) {
						cb(data);
					}
				}
			}(key));
		}
	}
	
	function getArrayBufferFromURL(url, cb) {
		getFromURL(url, "arraybuffer", cb);
	}

	function getFromURL(url, responseType, cb) {
		var r = new XMLHttpRequest();
		r.open("GET", url, true);  
		// "arraybuffer", "blob", "document", "json", and "text".
		r.responseType = responseType;
		r.onload = function() {   // XHR2
			if (cb) cb(r.response); // XHR2
		}      
		r.send();            
	}

	requestAnimFrame = (function(){
		return  window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		function(callback, element){ setTimeout(callback, 1000 / 60); }
	})();

	var AnimationLoop = function(callback) {
		this.callback = callback;
		this.pauseRequested = false;
	};

	AnimationLoop.prototype.start = function() {
		var loopContext = this;
		var myFn = function() {
			if (!loopContext.pauseRequested) {
				loopContext.callback();
				requestAnimFrame(myFn);
			}
		}
		this.pauseRequested = false;
		myFn();
	}

	AnimationLoop.prototype.stop = function() {
		this.pauseRequested = true;
	}

	var FPSMonitor = function(elementID) {
		this.frames = 0;

		var delayMs = 1000;
		var time;
		var monitorContext = this;

		function fr(){
			var ti = new Date().getTime();
			var fps = Math.round(1000*monitorContext.frames/(ti - time));
			document.getElementById(elementID).innerHTML = fps.toString();
			monitorContext.frames = 0;  
			time = ti;
		}
		var timer = setInterval(fr, delayMs);
		time = new Date().getTime();
	};
	FPSMonitor.prototype.frameIncrease = function() {
		this.frames++;
	}

	var Keyboard = {
	  _pressed: {},

	  LEFT: 37,
	  UP: 38,
	  RIGHT: 39,
	  DOWN: 40,
	  
	  isPressed: function(keyCode) {
		 return this._pressed[keyCode];
	  },
	  
	  onKeydown: function(event) {
		 this._pressed[event.keyCode] = true;
	  },
	  
	  onKeyup: function(event) {
		 delete this._pressed[event.keyCode];
	  }
	};
	function setupKeyboard()
	{
		window.addEventListener('keyup', function(event) { Keyboard.onKeyup(event); }, false);
		window.addEventListener('keydown', function(event) { Keyboard.onKeydown(event); }, false);
	}
	setupKeyboard();
	

	return {
		getArrayBufferFromURL : getArrayBufferFromURL, 
		ResLoader : ResLoader, 
		AnimationLoop : AnimationLoop,
		FPSMonitor : FPSMonitor,
		keyboard : Keyboard
	};
});
