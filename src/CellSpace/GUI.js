define([
	"jquery-ui", "Utils", "EvoCell", "story/StoryTeller", "underscore", 
	"backbone", "knockback", "knockout", "data/FileStore", "three", "datgui", 
	"CellSpace/State", "CellSpace/Setup", "CellSpace/GameLoop", "CellSpace/Utils"], 
function($, utils, EC, storyTeller,_ , Backbone, kb, ko, fileStore, THREE, dat, 
	gameState, csSetup, gameLoop, csUtils) {
	"use strict";

	// used for breaking to 0 and then reversse
	var allowReturn = 0;
	var oldPauseState = false;
	var buttonWasDown = 0;

	var getActiveDishName = function() {
		return gameState.drawModel.attributes.selectedLayers[0] || "enemy";
	}

	var getActiveDish = function() {
		return gameState.dishes[getActiveDishName()] || gameState.dishes.enemy;
	};

	var updateSelection = function(evt) {
		if (evt.button === 2) buttonWasDown = true;

		if (gameState.selection.active || evt.button === 2)
		{
			var coords = gameState.canvas.relMouseCoords(evt);
			var x = coords.x;
			var y = gameState.screenH - coords.y;
			var clickedNDC = utils.getNDCFromMouseEvent(gameState.canvas, evt, gameState.screenW, gameState.screenH);	
			var clickedPoint = utils.intersectClick(clickedNDC, gameState.viewMatrix, gameState.cameraAngle/2);
			
			var cx = Math.round(gameState.gameW*(clickedPoint.x+1)/2);
			var cy = Math.round(gameState.gameH*(clickedPoint.y+1)/2);

			// start new
			if (!gameState.selection.active) 
			{
				oldPauseState = gameState.pause;
				gameState.pause = true;
				gameState.selection.downPos = [cx, cy];
				gameState.selection.active = 2;
			}

			var dx = gameState.selection.lastPos[0] - cx;
			var dy = gameState.selection.lastPos[1] - cy;

			if (evt.ctrlKey) 
			{
				gameState.selection.downPos[0] += dx;
				gameState.selection.downPos[1] += dy;
			}
			if (evt.shiftKey) 
			{
				gameState.selection.downPos[0] -= dx;
				gameState.selection.downPos[1] -= dy;
			}

			var ox = gameState.selection.downPos[0];
			var oy = gameState.selection.downPos[1];
			
			var minx = Math.min(cx, ox);
			var miny = Math.min(cy, oy);

			gameState.selection.lastPos = [cx, cy];
			gameState.selection.pos = [minx, miny];
			gameState.selection.size = [Math.abs(cx-ox), Math.abs(cy-oy)];
		}
		if (evt.button != 2) { // not pressed
			if (gameState.selection.active && buttonWasDown) {
				gameState.selection.active--;

				if (!gameState.selection.active)
				{
					var dish = getActiveDish();

					gameState.reactor.mixDish(gameState.shaders.copy, gameState.dishes.buffer, {
						destinationPos: [0, 0], 
						destinationSize: gameState.selection.size,
						texSource: dish, 
						sourcePos: gameState.selection.pos, 
						sourceRes: [gameState.gameW, gameState.gameH],
					}); 

					gameState.pause = oldPauseState;
				}
			}
			buttonWasDown = false;
		}
	};

	var setupGui = function() {
		window.addEventListener("resize", function () {
			gameState.screenW = window.innerWidth;
			gameState.screenH = window.innerHeight;
			csUtils.onScreenSizeChanged();
		}, false);

		document.getElementById("assignLayerRule").addEventListener('click', function(evt) {
			var ruleName = gameState.drawModel.get("selectedRules")[0];
			var layerName = gameState.drawModel.get("selectedLayers")[0];
			var dish = gameState.dishes[layerName];

			fileStore.loadRule(ruleName, function(loadedRule) {
				gameState.rules[layerName] = gameState.reactor.compileRule(loadedRule.ruleData, dish);
			});

		}, false);


		document.getElementById("loadPattern").addEventListener('click', function(evt) {
			var ruleName = gameState.drawModel.get("selectedRules")[0];

			fileStore.loadRule(ruleName, function(loadedRule) {
				if (loadedRule.ruleData.containsPattern) {
					var rule = gameState.reactor.compileRule(loadedRule.ruleData);

					gameState.selection.size = [loadedRule.ruleData.patternWidth, loadedRule.ruleData.patternHeight];

					gameState.reactor.mixDish(gameState.shaders.copy, gameState.dishes.buffer, {
						destinationPos:[0, 0], 
						destinationSize: gameState.selection.size,
						texSource: rule.getPatternTexture(), 
						sourcePos: [0, 0], 
						sourceRes: gameState.selection.size,
					}); 
				}
			});
		}, false);


		document.getElementById("savePattern").addEventListener('click', function(evt) {
			var ruleName = prompt('Pattern can haz name?','pattern_');

			if (ruleName) 
			{
				// capture pixel from buffer
				var dish = gameState.dishes.buffer;
				var w = gameState.selection.size[0];
				var h = gameState.selection.size[1];
				var patternDataRGBA = new Uint8Array(w*h*4);
				var gl = gameState.reactor.gl;

				gl.bindFramebuffer(gl.FRAMEBUFFER, dish.getCurrentFramebuffer());
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dish.getCurrentTexture(), 0);
				gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, patternDataRGBA);

				var patternData = new Uint8Array(w*h);
				for (var i = w*h-1; i >= 0; i--) {
					patternData[i] = patternDataRGBA[4*i +3];
				}

				// construct ECFile
				var ruleData = {
					containsPattern: true,
					patternWidth: gameState.selection.size[0],
					patternHeight: gameState.selection.size[1], 
					patternData: patternData,
				};

				fileStore.storeRule(ruleName, ruleData,  function() {
					csUtils.refreshAvailableRules();
				});
			}
		}, false);


		$('#importRule').change(function(evt) {
			var files = evt.target.files; // FileList object

			_.each(files, function(file) {
				var reader = new FileReader();
				reader.onload = function(evt) {	
					var arrayBufferData = evt.target.result;
					var evoCellData = new EC.ECFile(arrayBufferData);
					//alert(evoCellData);
					//alert(file.name);
					fileStore.storeRule(file.name, evoCellData, function() {
						csUtils.refreshAvailableRules();
					});
				};
				reader.readAsArrayBuffer(file); // start async operation
			});
		});

		document.getElementById("deleteRule").addEventListener('click', function(evt) {
			var selectedRules = gameState.drawModel.get("selectedRules");

			var refresh = _.after(selectedRules.length, function() {
				//alert("refresh");
				csUtils.refreshAvailableRules();
			});

			_.each(selectedRules, function(ruleName) {
				fileStore.loadRule(ruleName, function(rule) {
					if (!rule ) {
						alert("cant delete nonextent: " + ruleName);
					}
					fileStore.deleteRule(ruleName, function() {
						//alert("deleted:" + ruleName);
						refresh();
					});
				});
			});
		}, false);

		document.getElementById("stepLink").addEventListener('click', function(evt) {
			csUtils.gameStep();
		}, false);

		document.getElementById("playPause").addEventListener('click', function(evt) {
			csUtils.gamePlayPause();
		}, false);

		document.getElementById("showIntroLink").addEventListener('click', function(evt) {
			storyTeller.RunIntro();
		}, false);

		document.getElementById("initializeDB").addEventListener("click", function(evt) {
			csSetup.initDB();
		}, false);


		// document.getElementById("saveGameState").addEventListener("click", function(evt) {
			
		// 			fileStore.addObject("gameStates", {id: "test23XXXX", state: {txt: "txt", nr: 123} },
		// 				function() { alert("works" + 23); },
		// 				function() { alert("NOT: " + 23); }
		// 			);
			
		// }, false);

		// var works = ["yo", 12];
		// var notworks = ["yo", 12];

		// document.getElementById("saveGameState").addEventListener("click", function(evt) {
		// 	works = [];
		// 	notworks = [];
		// 	_.each(gameState, function(value, key) { 
		// 		var clonedState = {};
		// 		clonedState[key] = value;

		// 		try {
		// 			fileStore.addObject("gameStates", {id: "test23" + key, state: clonedState },
		// 				function() { 
		// 				//	alert("works" + key); 
		// 				},
		// 				function() { 
		// 				// alert("NOT: " + key); 
		// 				}
		// 			);

		// 			works.push("\"" + key + "\"");
		// 		}
		// 		catch (ex) {
		// 			//alert("Except: " + key);
		// 			notworks.push("\"" + key + "\"");
		// 		}

		// 	});		
		// 	alert(notworks);
		// }, false);

		var nonPersistables = [
			"canvas","reactor","gl","gui","keyboard","shaders","dishes","rules","colors","shots",
			"sndInit","snd","sndBomb","sndHit","sndHit2","drawModel","mainLoop"
		];

		document.getElementById("saveGameState").addEventListener("click", function(evt) {
			var clonedState = {};
			_.each(gameState, function(value, key) { 
				if (!_.contains(nonPersistables, key)) {
					clonedState[key] = value;
				}
			});
			fileStore.addObject("gameStates", {id: "test23", state: clonedState });
		}, false);

		document.getElementById("loadGameState").addEventListener("click", function(evt) {
			fileStore.getObject("gameStates", "test23", function(loadedState) {
				_.each(loadedState.state, function(value, key) {
					gameState[key] = value;
				});
			});
		}, false);

		// var idxxxx = -1;
		// document.getElementById("switchLink").addEventListener('click', function(evt) {
		// 	fileStore.loadAllRules(function(rulesModelData) {
		// 			idxxxx++;
		// 			idxxxx %= rulesModelData.length;
		// 			gameState.rules.enemy = gameState.reactor.compileRule(rulesModelData[idxxxx].ruleData, 
		// 				gameState.dishes.enemy);
		// 		});
		// }, false);

		var gui = gameState.gui;

		gui.add(gameState, 'playerEnergy');

		var folder = gui.addFolder('App');
		folder.add(gameState, 'zoom', 0.05, 2).step(0.01);

		// ugly hack to make ro a two decimal nr in datgui
		var oldRot = gameState.rot;
		gameState.rot = 0.01;
		// hack continues below

		var ctrl = folder.add(gameState, 'rot', 0, Math.PI*2).step(0.01);
		//ctrl.__precision = 3; // does not help
		//ctrl.__impliedStep = 0.001; // does not help

		// hack!
		gameState.rot = oldRot;
		csUtils.refreshGUI(["rot"]);
		// end of ugly hack 

		folder.add(gameState, 'frontShots', 1, 12).step(1);
		folder.add(gameState, 'frontShotAngle', 0, 2*Math.PI);
		folder.add(gameState, 'shipRadius', 1, 20);
		folder.add(gameState, 'randomDensity', 0, 1);

		folder.add(gameState, "enemySpeed", 0, 12);
		folder.add(gameState, "weaponExplosionParam");
	
		folder.add(gameState, 'enableScrolling', {yes: 1, no: 0});

		folder.add(gameState, 'shipX');
		folder.add(gameState, 'shipY');
		
		folder.add(gameState, 'scrollX');
		folder.add(gameState, 'scrollY');

		folder.add(gameState, 'gameW').onFinishChange(csUtils.onGameSizeChanged);
		folder.add(gameState, 'gameH').onFinishChange(csUtils.onGameSizeChanged);

		folder = gui.addFolder('Core');
		var screenWCtrl = folder.add(gameState, 'screenW');
		var screenHCtrl = folder.add(gameState, 'screenH');
		folder.add(gameState, 'renderer', {Fast: "Fast", Simple:"Simple", TV:"TV", Cell:"Cell"});

		folder = gui.addFolder('Debug');
		folder.add(gameState, 'perfStartJSTime');
		folder.add(gameState, 'perfRequireTime');
		folder.add(gameState, 'perfFinishedJSTime');
		folder.add(gameState, "showBuffer");
		folder.add(gameState, "showRule");

		var onResized = function(value) {
			gameState.reactor.setRenderSize(gameState.screenW, gameState.screenH);
		};
		screenWCtrl.onFinishChange(onResized);
		screenHCtrl.onFinishChange(onResized);

		var view_model = kb.viewModel(gameState.drawModel);
		//view_model.full_name = ko.computed((->return "#{@first_name()} #{@last_name()}"), view_model)
		ko.applyBindings(view_model, document.getElementById("drawTool"));


		var getActiveWindowId = function() {
			var window = null;
			var windows = document.getElementsByClassName("activeWindow");
			if (windows.length > 0) return windows[0].id;
			return null;	
		};

		String.prototype.replaceAll = function(search, replace) {
			if (replace === undefined) {
			        return this.toString();
			 }
			return this.split(search).join(replace);
		}

		var toggleClass = function(element, className) {
			var classes = element.getAttribute("class");
			if (classes.indexOf(className) >= 0) {
				classes = classes.replace(className, "")
			}
			else {
				classes = classes + " " + className;
			}
			element.setAttribute('class', classes);
		}

		_.each(document.getElementsByClassName("toolWindow"), function(toolWindow) {
			toolWindow.addEventListener("click", function(evt) {
               //toolWindow.parentElement.style.color = "magenta";
               //toolWindow.style.color = "yellow";
               toggleClass(toolWindow, 'activeWindow');
            }, false);
		});

		// //$( "#toolsMenu" ).hide();
		// $( "#toolsMenu" ).accordion({
		// collapsible: true,
		// heightStyle: "content",
		// animate: true,
		// active: 0,
		// });// .draggable();
		// $( "#toolsMenu" ).accordion("option", "active", false);


		// TODO: implement palette
		// $('#colorpicker1').farbtastic('#color1');
		
		//$( "#menu" ).menu();
		
		gameState.fpsMonotor = new utils.FPSMonitor("fpsMonitor");

		function handleCanvasMouseDown(evt) {
			var coords = gameState.canvas.relMouseCoords(evt);
			var x = coords.x;
			var y = gameState.screenH - coords.y;

			var activeTool = getActiveWindowId();

			var clickedNDC = utils.getNDCFromMouseEvent(gameState.canvas, evt, gameState.screenW, gameState.screenH);	
			var clickedPoint = utils.intersectClick(clickedNDC, gameState.viewMatrix, gameState.cameraAngle/2);

			var dish = getActiveDish();

			if (activeTool === "ToolWindow" && evt.button === 0) {
					var state = 0;
					var firstSel = gameState.drawModel.attributes.selectedStates[0];
					if (firstSel) state = firstSel;

					if (dish) {
						if (gameState.drawModel.attributes.selectedDrawShape == "circle") {
							gameState.reactor.mixDish(gameState.shaders.drawCircle, dish, {
								center: [gameState.gameW*(clickedPoint.x+1)/2, gameState.gameH*(clickedPoint.y+1)/2], 
								radius: gameState.drawModel.attributes.drawSizeX/2, state: state/255
							});
						}
						else {
							gameState.reactor.mixDish(gameState.shaders.drawRect, dish, {
								rectPos: [gameState.gameW*(clickedPoint.x+1)/2, gameState.gameH*(clickedPoint.y+1)/2], 
								rectSize: [gameState.drawModel.attributes.drawSizeX, gameState.drawModel.attributes.drawSizeY], 
								state: state/255
							});
						}
					}
				
			}
			else if (evt.button === 0) { // || mouseMode == "shoot") {
				csUtils.fireShotAt(gameState.gameW*(clickedPoint.x+1)/2, gameState.gameH*(clickedPoint.y+1)/2);	
				// no autofire for now
				//gameState.autoFireOn = 1 - gameState.autoFireOn;	
			}	
			// copy
			else if (evt.button === 2) {
				/*
				gameState.reactor.mixDish(gameState.shaders.copy, gameState.dishes.buffer, {
					destinationPos: [0, 0], 
					destinationSize: [gameState.dishes.buffer.width, gameState.dishes.buffer.height],
					texSource: dish, 
					sourcePos: [gameState.gameW*(clickedPoint.x+1)/2-gameState.dishes.buffer.width/2, 
						gameState.gameH*(clickedPoint.y+1)/2-gameState.dishes.buffer.height/2], 
					sourceRes: [gameState.gameW, gameState.gameH],
				}); 
*/

				updateSelection(evt);
			}		
			// paste
			else if (evt.button === 1) {
				var tx = gameState.gameW*(clickedPoint.x+1)/2-gameState.selection.size[0]/2;
				var ty = gameState.gameH*(clickedPoint.y+1)/2-gameState.selection.size[1]/2;

				gameState.reactor.mixDish(gameState.shaders.copy, dish, {
					destinationPos:[tx, ty], 
					destinationSize: gameState.selection.size,
					texSource: gameState.dishes.buffer, 
					sourcePos: [0, 0], 
					sourceRes: [gameState.dishes.buffer.width, gameState.dishes.buffer.height],
				}); 
				// gameState.reactor.mixDish(gameState.shaders.copy, dish, {
				// 	destinationPos:[gameState.gameW*(clickedPoint.x+1)/2-gameState.dishes.buffer.width/2, 
				// 		gameState.gameH*(clickedPoint.y+1)/2-gameState.dishes.buffer.height/2], 
				// 	destinationSize: [gameState.dishes.buffer.width, gameState.dishes.buffer.height],
				// 	texSource: gameState.dishes.buffer, 
				// 	sourcePos: [0, 0], 
				// 	sourceRes: [gameState.dishes.buffer.width, gameState.dishes.buffer.height],
				// }); 
			}		
			
			evt.preventDefault();
			evt.stopPropagation();
		}
		gameState.canvas.addEventListener('mousedown', handleCanvasMouseDown, false);

		var blockContextMenu = function (evt) {
			evt.preventDefault();
		};
		gameState.canvas.addEventListener('contextmenu', blockContextMenu, false);

		var handleCanvasMouseMove = function(evt)
		{
			updateSelection(evt);
			gameState.lastMouseNDC = utils.getNDCFromMouseEvent(gameState.canvas, evt, gameState.screenW, gameState.screenH);
		};
		gameState.canvas.addEventListener('mousemove', handleCanvasMouseMove, false);


		var handleMouseWheel = function(e) {
			var maxZoom = 5;
			var delta = Math.max(-maxZoom, Math.min(maxZoom, (e.wheelDelta || -e.detail)));
			//delta /= 1000;
			csUtils.zoom(delta);
			return false;
		};
		gameState.canvas.addEventListener("mousewheel", handleMouseWheel, false);
		gameState.canvas.addEventListener("DOMMouseScroll", handleMouseWheel, false);
	};

	var once = 1;
	var pollUserInteraction = function() {
		var keyboard = gameState.keyboard;

		csUtils.pollAutoFire();
// USER INPUT Poll Keyboard //////////////////////////////////////////////////
		

		// TODO: move this to animaion independed poll function
		if (keyboard.isPressed("Z".charCodeAt()))
		{
			if (once) {
				once=0;
				csUtils.gameStep();
			}
		}
		else if (keyboard.isPressed("Q".charCodeAt()))
		{
			if (once) {
				once=0;
				csUtils.gamePlayPause();
			}
		}
		else
			once = 1;	

		// shoot straight ahead
		if (keyboard.isPressed("X".charCodeAt()))
		{
			var tx = gameState.shipX + Math.cos(gameState.shipDir);
			var ty = gameState.shipY + Math.sin(gameState.shipDir);
			csUtils.fireShotAt(tx, ty); 
		}


		if (keyboard.isPressed("O".charCodeAt()))
		{
			gameState.zoom -= 0.03;
			csUtils.refreshGUI(["zoom"]);
		}

		if (keyboard.isPressed("L".charCodeAt()))
		{
			gameState.zoom += 0.03;
			csUtils.refreshGUI(["zoom"]);
		}

		if (keyboard.isPressed("N".charCodeAt()))
		{
			gameState.rot += 0.05;
			csUtils.refreshGUI(["zoom"]);
		}

		if (keyboard.isPressed("M".charCodeAt()))
		{
			gameState.rot -= 0.05;
			csUtils.refreshGUI(["zoom"]);
		}


		// direction/speed based controll of ship
		var rotSpeed = 0.15;
		var accel = 0.1;
		var minSpeed = -1;
		var maxSpeed = 3;

		if (keyboard.isPressed(keyboard.UP)) {
			gameState.shipSpeed += accel;
			if (gameState.shipSpeed > maxSpeed)
				gameState.shipSpeed = maxSpeed;
		}
		if (keyboard.isPressed(keyboard.DOWN)) {
			if (gameState.shipSpeed > 0) {
				gameState.shipSpeed -= accel;
				if (gameState.shipSpeed < 0) {
					gameState.shipSpeed = 0;
					allowReturn = 0;
				}
			}
			else if (allowReturn) {
				gameState.shipSpeed -= accel;
				if (gameState.shipSpeed < minSpeed)
					gameState.shipSpeed = minSpeed;
			}
		}
		else {
			allowReturn = 1;
		}

		// direction and speed of layer ship
		if (keyboard.isPressed(keyboard.LEFT)) gameState.shipDir += rotSpeed;
		if (keyboard.isPressed(keyboard.RIGHT)) gameState.shipDir -= rotSpeed;
		gameState.shipSpeedX = gameState.shipSpeed * Math.cos(gameState.shipDir);
		gameState.shipSpeedY = gameState.shipSpeed * Math.sin(gameState.shipDir);		

		// space
		if (keyboard.isPressed(32)) {
			csUtils.resetGame();

			//gameState.dishes.enemyShield.randomize(, gameState.randomDensity);
		}

		if (keyboard.isPressed("S".charCodeAt())) {
			gameState.reactor.mixDish(gameState.shaders.clear, gameState.dishes.enemyShield, 
				{color: [0,0,0,24/255]});
		}

		// escape
		if (keyboard.isPressed(27))
		{
			var dishes = gameState.dishes;

			_.each(dishes, function(dish) {
				dish.setAll(0);
			});

			// TODO: add storing rules
			//fileStore.storeRule("enemy_ludwigBuildships", rules.enemy.ruleData);

			/*fileStore.loadRule("enemy_ludwigBuildships", function(loadedRule) {
				rules.enemy = reactor.compileRule(loadedRule.ruleData, dishes.enemy);
			})
*/				
		}

		if (keyboard.isPressed("I".charCodeAt())) {
			gameState.shotN++;
		}

		if (keyboard.isPressed("K".charCodeAt())) {
			gameState.shotN--;
			if (gameState.shotN <= 0) gameState.shotN = 1;
		}

		if (keyboard.isPressed("B".charCodeAt())) {
			if (!gameState.bombFired) {
				//gameState.bombFired = 1; // allow permanent fire for now
				for (var i = 0; i < gameState.shotN; i++)
				{
					gameState.bAngle += Math.PI * 2 / 1.61803398875;
					gameState.shots.allocateSphere(1, 
						gameState.shipX -1*gameState.scrollX, gameState.shipY -1*gameState.scrollY, 
						gameState.shotSpeed, gameState.bAngle, 
						gameState.shipSpeedX, gameState.shipSpeedY);
				}

				utils.playSound(gameState.sndBomb);
			}
		}
		else {
			gameState.bombFired = 0;
		}

		if (keyboard.isPressed("1".charCodeAt()))
		{
			gameState.mouseMode = "shoot";
		}
		if (keyboard.isPressed("P".charCodeAt()))
		{
			gameState.mouseMode = "paste";
		}
		if (keyboard.isPressed("C".charCodeAt()))
		{
			gameState.mouseMode = "copy";
		}

		var sDX = 0, sDY = 0;			
		if (keyboard.isPressed("D".charCodeAt()))
		{
			sDX = 1;
		}
		if (keyboard.isPressed("A".charCodeAt()))
		{
			sDX = -1;
		}	
		if (keyboard.isPressed("W".charCodeAt()))
		{
			sDY = 1;
		}	
		if (keyboard.isPressed("S".charCodeAt()))
		{
			sDY = -1;
		}
		if (sDX || sDY) {
			if (!gameState.shotDelay)
			{
				gameState.shotDelay = 10;
				var px = (gameState.shipX/gameState.gameW)*2 - 1;
				var py = (gameState.shipY/gameState.gameH)*2 - 1;
				var sX = sDX * gameState.shotSpeed;
				var sY = sDY*gameState.shotSpeed; 

				gameState.shots.allocateParticle(gameState.shipX, gameState.shipY, sX, sY);
			}
			else 
				gameState.shotDelay--;
		}
		else
			gameState.shotDelay = 0;
	};

	return {
		setupGui: setupGui,
		pollUserInteraction: pollUserInteraction,
		getActiveDishName: getActiveDishName,
	};
});