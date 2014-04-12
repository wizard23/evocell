define([
	"jquery-ui", "Utils", "EvoCell", "story/StoryTeller", "underscore", 
	"backbone", "knockback", "knockout", "data/FileStore", "three", "datgui", 
	"CellSpace/State", "CellSpace/Setup", "CellSpace/GameLoop", "CellSpace/Utils"], 
function($, utils, EC, storyTeller,_ , Backbone, kb, ko, fileStore, THREE, dat, 
	gameState, csSetup, gameLoop, csUtils) {
	"use strict";

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

		var onResized = function(value) {
			gameState.reactor.setRenderSize(gameState.screenW, gameState.screenH);
		};
		screenWCtrl.onFinishChange(onResized);
		screenHCtrl.onFinishChange(onResized);

		var view_model = kb.viewModel(gameState.drawModel);
		//view_model.full_name = ko.computed((->return "#{@first_name()} #{@last_name()}"), view_model)
		ko.applyBindings(view_model, document.getElementById("drawTool"));

		//$( "#toolsMenu" ).hide();
		$( "#toolsMenu" ).accordion({
		collapsible: true,
		heightStyle: "content",
		animate: true,
		active: 0,
		});// .draggable();
		$( "#toolsMenu" ).accordion("option", "active", false);


		// TODO: implement palette
		// $('#colorpicker1').farbtastic('#color1');
		
		$( "#menu" ).menu();
		
		gameState.fpsMonotor = new utils.FPSMonitor("fpsMonitor");

		function handleCanvasMouseDown(evt) {
			var coords = gameState.canvas.relMouseCoords(evt);
			var x = coords.x;
			var y = gameState.screenH - coords.y;

			var activeTool = $( "#toolsMenu" ).accordion( "option", "active" );

			var clickedNDC = utils.getNDCFromMouseEvent(gameState.canvas, evt, gameState.screenW, gameState.screenH);	
			var clickedPoint = utils.intersectClick(clickedNDC, gameState.viewMatrix, gameState.cameraAngle/2);

			if (activeTool === 0) {
					var dish = gameState.dishes[gameState.drawModel.attributes.selectedLayers[0]];

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
			else if (activeTool !== 0) { // || mouseMode == "shoot") {
				csUtils.fireShotAt(gameState.gameW*(clickedPoint.x+1)/2, gameState.gameH*(clickedPoint.y+1)/2);	

				// no autofire for now
				//gameState.autoFireOn = 1 - gameState.autoFireOn;	
			}	
			else if (gameState.mouseMode == "copy") {
				gameState.reactor.mixDish(shaders.copy, dishes.buffer, {
					destinationPos: [0, 0], destinationSize: [gameState.dishes.buffer.width, gameState.dishes.buffer.height],
					texSource: gameState.dishes.enemy, 
					sourcePos: [x-gameState.dishes.buffer.width/2, y-gameState.dishes.buffer.height/2], 
					sourceRes: [gameState.gameW, gameState.gameH],
				}); 
			}		
			else if (gameState.mouseMode == "paste") {
				gameState.reactor.mixDish(shaders.copy, dishes.enemy, {
					destinationPos: [x-gameState.dishes.buffer.width/2, y-gameState.dishes.buffer.height/2], 
					destinationSize: [gameState.dishes.buffer.width, gameState.dishes.buffer.height],
					texSource: gameState.dishes.buffer, sourcePos: [0, 0], 
					sourceRes: [gameState.dishes.buffer.width, gameState.dishes.buffer.height],
				}); 
			}		
			
			evt.preventDefault();
			evt.stopPropagation();
		}
		gameState.canvas.addEventListener('mousedown', handleCanvasMouseDown, false);

		var handleCanvasMouseMove = function(evt)
		{
			gameState.lastMouseNDC = utils.getNDCFromMouseEvent(gameState.canvas, evt, gameState.screenW, gameState.screenH);
		};
		gameState.canvas.addEventListener('mousemove', handleCanvasMouseMove, false);


		var handleMouseWheel = function(e) {
			var maxZoom = 5;
			var delta = Math.max(-maxZoom, Math.min(maxZoom, (e.wheelDelta || -e.detail)));
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
		/*else if (keyboard.isPressed("X".charCodeAt()))
		{
			if (once) {
				once=0;
				csUtils.gamePlayPause();
			}
		}*/
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

		// TODO: should be in step
		// direct movement
		if (false) {
			var dX = 0, dY = 0;
			if (keyboard.isPressed(keyboard.UP)) dY +=1;
			if (keyboard.isPressed(keyboard.DOWN)) dY -= 1;
			if (keyboard.isPressed(keyboard.LEFT)) dX -= 1;
			if (keyboard.isPressed(keyboard.RIGHT)) dX += 1;

			if (dX !== 0 || dY !== 0)
			{
				var dirV = new THREE.Vector4(dX, dY, 0);
				dirV.w=0;
				dirV.normalize().multiplyScalar(0.1);
				dirV.add(new THREE.Vector4(0.5, 0.5, 0));
				dirV.w = 0;

				var moveDir = utils.intersectClick(dirV, gameState.viewMatrix, gameState.cameraAngle/2);

				moveDir.sub(new THREE.Vector4(gameState.shipX/gameState.gameW, gameState.shipY/gameState.gameH, 0));
				moveDir.w = 0;
				moveDir.normalize().multiplyScalar(gameState.stepSize);
				
				// TODO: fix above direction Mapping
				// TODO: Use clifford's NumJS Parer for THREE :)
				//gameState.shipX += moveDir.x;
				//gameState.shipY += moveDir.y;

				gameState.shipX += dX;
				gameState.shipY += dY;
			}
		}
		// inertia based movement
		else {
			var rotSpeed = 0.15;
			var accel = 0.1;
			var minSpeed = 0;
			var maxSpeed = 3;

			if (keyboard.isPressed(keyboard.UP)) {
				gameState.shipSpeed += accel;
				if (gameState.shipSpeed > maxSpeed)
					gameState.shipSpeed = maxSpeed;
			}
			if (keyboard.isPressed(keyboard.DOWN)) {
				gameState.shipSpeed -= accel;
				if (gameState.shipSpeed < minSpeed)
					gameState.shipSpeed = minSpeed;
			}
			if (keyboard.isPressed(keyboard.LEFT)) gameState.shipDir += rotSpeed;
			if (keyboard.isPressed(keyboard.RIGHT)) gameState.shipDir -= rotSpeed;

			gameState.shipSpeedX = gameState.shipSpeed * Math.cos(gameState.shipDir);
			gameState.shipSpeedY = gameState.shipSpeed * Math.sin(gameState.shipDir);

			gameState.shipX += gameState.shipSpeedX;
			gameState.shipY += gameState.shipSpeedY;
			
		}

/*
		if (keyboard.isPressed(keyboard.UP)) gameState.shipY += gameState.stepSize;
		if (keyboard.isPressed(keyboard.DOWN)) gameState.shipY -= gameState.stepSize;
		if (keyboard.isPressed(keyboard.LEFT)) gameState.shipX -= gameState.stepSize;
		if (keyboard.isPressed(keyboard.RIGHT)) gameState.shipX += gameState.stepSize;
*/
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

			dishes.enemy.setAll(0);
			dishes.ship.setAll(0);
			dishes.weapon.setAll(0);
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
		pollUserInteraction: pollUserInteraction
	};
});