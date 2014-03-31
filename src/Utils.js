define(["jquery", "FileSaver"], function($, saveAs) {
	function relMouseCoords(event){
		var totalOffsetX = 0;
		var totalOffsetY = 0;
		var canvasX = 0;
		var canvasY = 0;
		var currentElement = this;

		do{
		  totalOffsetX += currentElement.offsetLeft;
		  totalOffsetY += currentElement.offsetTop;
		}
		while(currentElement = currentElement.offsetParent)

		canvasX = event.pageX - totalOffsetX;
		canvasY = event.pageY - totalOffsetY;

		return {x:canvasX, y:canvasY}
	}
	HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

	var getNDCFromMouseEvent = function(canvas, evt, screenW, screenH) {
		var coords = canvas.relMouseCoords(evt);
		return new THREE.Vector2(coords.x/screenW, (screenH - coords.y)/screenH);
	};


	// static
	var playSound = function(snd) {
		try {
			snd.currentTime=0;
			snd.play();
		} catch(ex) {}
	};

	// TODO: gamestate access, otherwise static
	// gets NDC (0 to 1) of clicked postion
	// itersects line form eye (0, 0, 0) to cliked position of a viewMatrix transformed plane in x/y plane
	// returns computed object coordinates (-1 to 1 for x and y, 0 for z)
	var intersectClick = function(clickedNDC, viewMatrix, camAH) {
		var invMV = new THREE.Matrix4().getInverse(viewMatrix);

		var planeNormal = new THREE.Vector4(0, 0, -1, 0);
		var planePoint = new THREE.Vector4(0, 0, 0, 1);

		// here the projection matrix is used or at least the cameraAngle
		var sf = Math.sin(camAH)/Math.cos(camAH);
		var lineDir = new THREE.Vector4(sf*(2*clickedNDC.x - 1), sf*(2*clickedNDC.y - 1), -1, 0);
		var linePoint = new THREE.Vector4();

		planeNormal.applyMatrix4(viewMatrix);
		planePoint.applyMatrix4(viewMatrix);

		var a = new THREE.Vector4().subVectors(planePoint, linePoint).dot(planeNormal);
		var b = lineDir.dot(planeNormal);

		var pointPos = a / b;

		var point = new THREE.Vector4().addVectors(linePoint, lineDir.clone().multiplyScalar(pointPos));
		var deltaPoint = point.clone().applyMatrix4(invMV);

		return deltaPoint;
	};

	function getFromURL(url, responseType, cb) {
		var r = new XMLHttpRequest();
		r.open("GET", url, true);  
		// "arraybuffer", "blob", "document", "json", and "text".
		r.responseType = responseType;
		r.onload = function() {   // XHR2
			if (cb) cb(r.response); // XHR2
		};    
		r.send();            
	}

	var requestAnimFrame = (function(){
		return  window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		function(callback, element){ setTimeout(callback, 1000 / 60); };
	})();

	// if ms == 0 use AbimationLoop otherwise fixed timing
	var AnimationLoop = function(ms, callback) {
		this.ms = ms;
		this.callback = callback;
		this.pauseRequested = true;
	};

	AnimationLoop.prototype.start = function() {
		var loopContext = this;
		this.pauseRequested = false;
		var myFn = function() {
			if (!loopContext.pauseRequested) {
				loopContext.callback();
				if (loopContext.ms)
					setTimeout(myFn, loopContext.ms);
				else
					requestAnimFrame(myFn);
			}
		};
		myFn();
	};

	AnimationLoop.prototype.step = function() {
		this.callback();
	}

	AnimationLoop.prototype.stop = function() {
		this.pauseRequested = true;
	}

	AnimationLoop.prototype.toggle = function() {
		if (this.pauseRequested) {
			this.start();
		}
		else {
			this.stop();
		}
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
		AnimationLoop : AnimationLoop,
		FPSMonitor : FPSMonitor,

		getFromURL: getFromURL,
		saveAs: saveAs,

		playSound: playSound,
		intersectClick: intersectClick,
		getNDCFromMouseEvent: getNDCFromMouseEvent, 		

		keyboard : Keyboard		
	};
});
