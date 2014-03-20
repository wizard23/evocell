// Example: local resources in the same directory
// var resPath = "./"; 

// resources in res_evocell repository
var resPath = "../res_evocell/";

var libPath = "../" + resPath + "src/libs/";


require.config({
	baseUrl: 'src',
	paths: {
		jquery: libPath + 'jquery-1.10.2',
		"jquery-ui": libPath + 'jquery-ui-1.10.4.custom',
		"underscore": libPath + "underscore",
		backbone: libPath + "backbone",
		knockback: libPath + "knockback",
		knockout: libPath + "knockout-3.0.0",
		meSpeak: libPath + "mespeak/mespeak",
		three: libPath + "three", 
		"jquery-cycle": libPath + "jquery.cycle.all",
		datgui: libPath + "dat.gui.min",
		FileSaver: libPath + "FileSaver",
	},
	shim: {
		datgui: {
			exports: "dat",
		}, 
        "jquery-ui": {
            exports: "$",
            deps: ['jquery', libPath + 'farbtastic']
        },
		"jquery-cycle": {
			deps: ["jquery-ui"]
		},
		underscore : {
			exports: "_",
		},
		backbone : {
			exports: "Backbone",
			deps: ['underscore'],
		},
		knockback: {
			exports: "kb",
			deps: ["backbone"],			
		},
		knockout: {
			exports: "ko",			
		},
		meSpeak: {
			exports: "meSpeak",
		},
		three: {
			exports: "THREE",
		},
    }
});

require([
	"jquery-ui", "Utils", "EvoCell", "story/StoryTeller", "underscore", 
	"backbone", "knockback", "knockout", "data/FileStore", "three", "datgui"], 
function($, utils, EC, storyTeller,_ , Backbone, kb, ko, fileStore, THREE, dat) {
	"use strict";
	
	var gameState = {
		// APPSTATE ///////////
		canvas: null,
		reactor: null,
		gl: null,
		renderLoop: null,
		gui: new dat.GUI(),
		//fpsMonotor: null,
		keyboard: utils.keyboard,
		
		// GAMESTATE //////////
		// shots
		maxParticles: 2800,
		shotSpeed: 2.3,
		shotN: 8,
		bombFired: 0,
		bAngle: 0, // direction of bomb fire

		autoFireCounter: 0,
		autoFireOn: 0,
		lastMouseNDC: new THREE.Vector2(),

		//var shots;
		//var enemyDish, enemy2Dish, shipDish, shipExplosionDish, copyDish, bufferDish, renderDish, weaponDish, weaponExplosionDish;
		//var drawPointsShader, clearShader, scrollingRenderShader, drawRectShader, drawCircleShader, mixShader, intersectSpawnShader, copyShader;
		//var enemyRule, enemy2Rule, shipRule, shipExplosionRule, weaponRule, weaponExplosionRule;
		//var enemyColors, enemy2Colors, shipColors, shipExplosionColors, weaponColors, weaponExplosionColors, copyColors;

		gameW: 300, gameH: 300,
		screenW: 1024,
		screenH: 1024,

		pixel: 1.5,
		rot: 0.0,

		cameraAngle: 60 * (Math.PI/180),
		viewMatrix: new THREE.Matrix4(),
		projectionMatrix: new THREE.Matrix4(),

		shipX: 0, shipY: 0,
		playerEnergy: 100,
		stepSize: 1.5, 
		
		mouseMode: "shoot",	
		cnt: 0, // used for executing enemyDish only every nth tep

		sndInit: new Audio(resPath + "sound/Digital_SFX_Set/laser3.mp3"), 
		snd: new Audio(resPath + "sound/Digital_SFX_Set/laser6.mp3"), 
		sndBomb: new Audio(resPath + "sound/Digital_SFX_Set/laser4.mp3"), 
		sndHit: new Audio(resPath + "sound/Digital_SFX_Set/laser9.mp3"), 
		sndHit2: new Audio(resPath + "sound/Digital_SFX_Set/laser9.mp3"),

		// game model
		civX: 0.1,
		civY: 0.1,
		civZ: 0.1,
		civW: 0.1,

		clipX: 0.1,
		clipY: 0.1,

		drawModel: new Backbone.Model({
			availableLayers: ["enemy", "enemy2", "ship", "shipExplosion", "weapon", "weaponExplosion"],
			availableStates: [0, 1, 2, 3, 4, 5],

			drawSizeX: 100,
			drawSizeY: 30,
			selectedDrawShape : "rectangle",
			selectedStates : [3],
			selectedLayers : ["ship"],
		}), 
	};	

	///////

	// "static"
	var playSound = function(snd) {
		try {
			snd.currentTime=0;
			snd.play();
		} catch(ex) {}
	};

	// access to gamestate
	var getNDCFromMouseEvent = function(canvas, evt) {
		var coords = canvas.relMouseCoords(evt);
		return new THREE.Vector2(coords.x/gameState.screenW, (gameState.screenH - coords.y)/gameState.screenH);
	};

	// access to gamestate
	var pollAutoFire = function() {		
		if (gameState.autoFireOn) {
			if (gameState.autoFireCounter === 0) {
				var clickedPoint = intersectClick(gameState.lastMouseNDC);
				fireShotAt(gameState.gameW*(clickedPoint.x+1)/2, gameState.gameH*(clickedPoint.y+1)/2);	

				gameState.autoFireCounter = 5;
			}
			else {
				gameState.autoFireCounter--;
			}
		}
	};

	// TODO: gamestate access
	// gets NDC (0 to 1) of clicked postion
	// itersects line form eye (0, 0, 0) to cliked position of a viewMatrix transformed plane in x/y plane
	// returns computed object coordinates (-1 to 1 for x and y, 0 for z)
	var intersectClick = function(clickedNDC) {
		var invMV = new THREE.Matrix4();
		invMV.getInverse(gameState.viewMatrix);

		var planeNormal = new THREE.Vector4(0, 0, -1, 0);
		var planePoint = new THREE.Vector4(0, 0, 0, 1);

		// here the projection matrix is used or at least the cameraAngle
		var camAH = gameState.cameraAngle/2;
		var sf = Math.sin(camAH)/Math.cos(camAH);
		var lineDir = new THREE.Vector4(sf*(2*clickedNDC.x - 1), sf*(2*clickedNDC.y - 1), -1, 0);
		var linePoint = new THREE.Vector4();

		planeNormal.applyMatrix4(gameState.viewMatrix);
		planePoint.applyMatrix4(gameState.viewMatrix);

		var a = new THREE.Vector4().subVectors(planePoint, linePoint).dot(planeNormal);
		var b = lineDir.dot(planeNormal);

		var pointPos = a / b;

		var point = new THREE.Vector4().addVectors(linePoint, lineDir.clone().multiplyScalar(pointPos));
		var deltaPoint = point.clone().applyMatrix4(invMV);

		gameState.civX = deltaPoint.x;
		gameState.civY = deltaPoint.y;
		gameState.civZ = deltaPoint.z;
		gameState.civW = deltaPoint.w;

		refreshGUI();

		return deltaPoint;
	};

	// TODO: gameState access
	var fireShotAt = function(tx, ty) {
		// spawn shot
		var dX = tx-gameState.shipX;
		var dY = ty-gameState.shipY;
		var dL = Math.sqrt(dX*dX+dY*dY);
		var sX = gameState.shotSpeed * dX/dL;
		var sY = gameState.shotSpeed * dY/dL;

		var aa = 0.2;
		gameState.shots.allocateParticle(gameState.shipX, gameState.shipY, 1.05*sX, 1.05*sY);
		gameState.shots.allocateParticle(gameState.shipX, gameState.shipY, Math.cos(aa)*sX + Math.sin(aa)*sY, -Math.sin(aa)*sX + Math.cos(aa)*sY);
		aa = -aa;
		gameState.shots.allocateParticle(gameState.shipX, gameState.shipY, Math.cos(aa)*sX + Math.sin(aa)*sY, -Math.sin(aa)*sX + Math.cos(aa)*sY);

		playSound(gameState.snd);
	};

	// TODO: could be done in backbone via a conceptual model ;)
	var updateButtons = function() {
		if (gameState.renderLoop.pauseRequested) {
			document.getElementById("playPause").children[0].className = "fa fa-play fa-2x";
		}
		else {
			document.getElementById("playPause").children[0].className = "fa fa-pause fa-2x";
		}
	};

	var refreshGUI = function() {
		for (var i in gameState.gui.__controllers) {
			gameState.gui.__controllers[i].updateDisplay();
		}
	};

	var resetGame = function() {
		gameState.cnt = 0;
		gameState.enemyDish.randomize(gameState.enemyRule.nrStates, 0.02);
		gameState.enemy2Dish.randomize(gameState.enemyRule.nrStates, 0.01);
		if (gameState.shipX < 0 || gameState.shipX > gameState.gameW || 
			gameState.shipY < 0 || gameState.shipY > gameState.gameH) {
			gameState.shipX = gameState.gameW/2;
			gameState.shipY = gameState.gameH/2;
		}
		playSound(gameState.sndInit);
	};

	var setupGui = function() {
		document.getElementById("stepLink").addEventListener('click', function(evt) {
			gameState.renderLoop.stop();
			gameState.renderLoop.step();
			updateButtons();
		}, false);

		document.getElementById("playPause").addEventListener('click', function(evt) {
			gameState.renderLoop.toggle();
			updateButtons();
		}, false);

		document.getElementById("zoomIn").addEventListener('click', function(evt) {
			gameState.pixel+=0.5;
		}, false);

		document.getElementById("zoomOut").addEventListener('click', function(evt) {
			gameState.pixel-=0.5;
		}, false);


		document.getElementById("showIntroLink").addEventListener('click', function(evt) {
			storyTeller.RunIntro();
		}, false);

		var idxxxx = -1;
		document.getElementById("switchLink").addEventListener('click', function(evt) {
			fileStore.loadAllRules(function(rulesModelData) {
					idxxxx++;
					idxxxx %= rulesModelData.length;
					gameState.enemyRule = gameState.reactor.compileRule(rulesModelData[idxxxx].ruleData, 
						gameState.enemyDish);
				});
		}, false);

		gameState.gui.add(gameState, 'playerEnergy');
		gameState.gui.add(gameState, 'civX');
		gameState.gui.add(gameState, 'civY');
		gameState.gui.add(gameState, 'civZ');
		gameState.gui.add(gameState, 'civW');
		gameState.gui.add(gameState, 'clipX');
		gameState.gui.add(gameState, 'clipY');

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


		$('#colorpicker1').farbtastic('#color1');
		$( "#menu" ).menu();
		
		gameState.fpsMonotor = new utils.FPSMonitor("fpsMonitor");

		function handleCanvasMouseDown(evt) {
			var coords = gameState.canvas.relMouseCoords(evt);
			var x = coords.x;
			var y = gameState.screenH - coords.y;

			var activeTool = $( "#toolsMenu" ).accordion( "option", "active" );

			var clickedNDC = getNDCFromMouseEvent(gameState.canvas, evt);	
			var clickedPoint = intersectClick(clickedNDC);

			if (activeTool === 0) {
					var dish;

					dish = gameState[gameState.drawModel.attributes.selectedLayers[0] + "Dish"];

/*
					if (gameState.drawModel.attributes.selectedLayers.indexOf("enemy") >= 0) dish = gameState.enemyDish;
					else if (gameState.drawModel.attributes.selectedLayers.indexOf("enemy2") >= 0) dish = gameState.enemy2Dish;
					else if (gameState.drawModel.attributes.selectedLayers.indexOf("ship") >= 0) dish = gameState.shipDish;
					else if (gameState.drawModel.attributes.selectedLayers.indexOf("shipExplosion") >= 0) dish = gameState.shipExplosionDish;
*/
					var state = 0;
					var firstSel = gameState.drawModel.attributes.selectedStates[0];
					if (firstSel) state = firstSel;

					if (dish) {
						if (gameState.drawModel.attributes.selectedDrawShape == "circle") {
							gameState.reactor.mixDish(gameState.drawCircleShader, dish, {
								center: [gameState.gameW*(clickedPoint.x+1)/2, gameState.gameH*(clickedPoint.y+1)/2], 
								radius: gameState.drawModel.attributes.drawSizeX/2, state: state/255
							});
						}
						else {
							gameState.reactor.mixDish(gameState.drawRectShader, dish, {
								rectPos: [gameState.gameW*(clickedPoint.x+1)/2, gameState.gameH*(clickedPoint.y+1)/2], 
								rectSize: [gameState.drawModel.attributes.drawSizeX, gameState.drawModel.attributes.drawSizeY], 
								state: state/255
							});
						}
					}
				
			}
			else if (activeTool !== 0) { // || mouseMode == "shoot") {
				fireShotAt(gameState.gameW*(clickedPoint.x+1)/2, gameState.gameH*(clickedPoint.y+1)/2);	

				// no autofire for now
				//gameState.autoFireOn = 1 - gameState.autoFireOn;	
			}	
			else if (gameState.mouseMode == "copy") {
				gameState.reactor.mixDish(copyShader, bufferDish, {
					destinationPos: [0, 0], destinationSize: [gameState.bufferDish.width, gameState.bufferDish.height],
					texSource: gameState.enemyDish, 
					sourcePos: [x-gameState.bufferDish.width/2, y-gameState.bufferDish.height/2], 
					sourceRes: [gameState.gameW, gameState.gameH],
				}); 
			}		
			else if (gameState.mouseMode == "paste") {
				gameState.reactor.mixDish(copyShader, enemyDish, {
					destinationPos: [x-gameState.bufferDish.width/2, y-gameState.bufferDish.height/2], 
					destinationSize: [gameState.bufferDish.width, gameState.bufferDish.height],
					texSource: gameState.bufferDish, sourcePos: [0, 0], 
					sourceRes: [gameState.bufferDish.width, gameState.bufferDish.height],
				}); 
			}		
			
			evt.preventDefault();
			evt.stopPropagation();
		}
		gameState.canvas.addEventListener('mousedown', handleCanvasMouseDown, false);

		var handleCanvasMouseMove = function(evt)
		{
			gameState.lastMouseNDC = getNDCFromMouseEvent(gameState.canvas, evt);	
		};
		gameState.canvas.addEventListener('mousemove', handleCanvasMouseMove, false);

	};

	// static
	var loadResources = function(callback) {
		var loader = new EC.ResLoader();
		loader.load("enemyRule", resPath + "rules/enemy_ludwigBuildships", "ecfile");
		//loader.load("enemyRule", resPath + "rules/moore5-coolspaceships", "ecfile");
		//loader.load("enemyRule", resPath + "rules/22C3_mirrorsymetric_gliders-randomwaver", "ecfile");
		//loader.load("enemyRule", "rules/enemy_d54_awesomeships", "ecfile");
		//loader.load("enemyRule", resPath + "rules/enemy_d52_replicator", "ecfile");
		//loader.load("enemyRule", resPath + "rules/enemy_holeshooter", "ecfile");
		//loader.load("enemyRule", "rules/enemy_holeshooter", "ecfile");
		//loader.load("enemyRule", "rules/gridworld6", "ecfile");
		//loader.load("enemyRule", "rules/enemy_quaderwelt_moreactive", "ecfile");
		//loader.load("enemyRule", "rules/enemy_d29", "ecfile");
		//loader.load("enemyRule", "rules/enemy_linesLounge_moreactive", "ecfile");
		//loader.load("enemyRule", "rules/enemy_linesLounge_moreactive-mutA_mut", "ecfile");
		

		loader.load("enemy2Rule", resPath + "rules/enemy_linebuilder", "ecfile");
		loader.load("weaponRule", resPath + "rules/ship_avg4_nice", "ecfile");
		loader.load("weaponExplosionRule", resPath + "rules/cross4-wave-spaceshipshoot", "ecfile");
		
		loader.load("shipExplosionRule", resPath + "rules/cross4-wave-spaceshipshoot", "ecfile");
		//loader.load("shipExplosionRule", resPath + "rules/ship_avg4_nice", "ecfile");

		loader.load("shipRule", resPath + "rules/ship_avg4_nice", "ecfile");

		// rules/ship_avg4_nice rules/ship_avg4_schweif

		loader.load("vertexPoints", "src/shaders/vertexPoints.vshader", "text");
		loader.load("drawAll", "src/shaders/drawAll.shader", "text");

		loader.load("clear", "src/shaders/clear.shader", "text");
		loader.load("mixPalette", "src/shaders/mixPalette.shader", "text");	

		loader.load("drawRect", "src/shaders/drawRect.shader", "text");
		loader.load("drawCircle", "src/shaders/drawCircle.shader", "text");

		//loader.load("painter", "src/shaders/primitiveRenderer.shader", "text");
		loader.load("rendererVertex", "src/shaders/scrollingRendererMatrix.vshader", "text");
		loader.load("rendererFragment", "src/shaders/scrollingRenderer.shader", "text");

		loader.load("intersectSpawn", "src/shaders/intersectSpawn.shader", "text");

		loader.load("copyPaste", "src/shaders/copyPasteRect.shader", "text");

		loader.start(callback);
	};


		
	var setupGame = function (data, canvas) { 
		// Setup core
		var reactor = new  EC.Reactor(canvas, gameState.gameW, gameState.gameH);
		gameState.reactor = reactor;
		gameState.gl = reactor.gl;
		gameState.canvas = reactor.canvas;

		gameState.reactor.setRenderSize(gameState.screenW, gameState.screenH);

		gameState.enemyDish = reactor.compileDish();
		gameState.enemy2Dish = reactor.compileDish();
		gameState.shipDish = reactor.compileDish();
		gameState.shipExplosionDish = reactor.compileDish();
		gameState.weaponDish = reactor.compileDish();
		gameState.weaponExplosionDish = reactor.compileDish();
		gameState.copyDish = reactor.compileDish();
		gameState.bufferDish = reactor.compileDish(64, 64);
		gameState.renderDish = reactor.compileDish();

		gameState.shots = new EC.ParticleSystem(reactor, gameState.maxParticles, gameState.gameW, gameState.gameH);

		gameState.drawPointsShader = reactor.compileShader(data.vertexPoints, data.drawAll);
		
		gameState.clearShader = reactor.compileShader(data.clear);
		gameState.scrollingRenderShader = reactor.compileShader(data.rendererVertex, data.rendererFragment);

		gameState.drawRectShader = reactor.compileShader(data.drawRect);
		gameState.drawCircleShader = reactor.compileShader(data.drawCircle);

		gameState.mixShader = reactor.compileShader(data.mixPalette);
		gameState.intersectSpawnShader = reactor.compileShader(data.intersectSpawn);
		gameState.copyShader = reactor.compileShader(data.copyPaste);

		//fileStore.storeRule(data.enemy2Rule);
		//fileStore.loadRule("starwars", function(loadedRule) {
		//	enemyRule = reactor.compileRule(loadedRule, enemyDish);
		//})

		//data.enemyRule.MakeStarWarsRule()
		//fileStore.storeRule("starwars", data.enemyRule);

		gameState.enemyRule = reactor.compileRule(data.enemyRule, gameState.enemyDish);
		gameState.enemy2Rule = reactor.compileRule(data.enemy2Rule, gameState.enemy2Dish);
		gameState.shipRule = reactor.compileRule(data.shipRule, gameState.shipDish);
		gameState.weaponRule = reactor.compileRule(data.weaponRule, gameState.enemyDish);
		gameState.shipExplosionRule = reactor.compileRule(data.shipExplosionRule, gameState.enemy2Dish);
		gameState.weaponExplosionRule = reactor.compileRule(data.weaponExplosionRule, gameState.enemy2Dish);
		
		gameState.enemyColors = new EC.Palette(reactor, [
			[0, 0, 0, 255],
			[140, 10, 140, 255],
			[255, 255, 255, 255],
			[255, 30, 255, 255],
			[255, 110, 255, 255]
		]);

		gameState.weaponColors = new EC.Palette(reactor, [
			[0, 0, 0, 255],
			[0, 120, 0, 255],
			[0, 255, 0, 255],
			[120, 255, 0, 255],
			[200, 255, 0, 255],
		]);

		gameState.weaponExplosionColors = new EC.Palette(reactor, [
			[60, 60, 90, 255],
			[23, 108, 126, 255],
			[18, 164, 195, 255],
			[0, 210, 255, 255],
			[150, 210, 255, 255], 
			[255, 255, 255, 255]
		]);

		var bs = 0.12;
		gameState.enemy2Colors = new EC.Palette(reactor, [
			[0, 0, 0, 255],
			[bs*10, bs*80, bs*80, 255], 
			[bs*20, bs*170, bs*170, 255],
			[bs*30, bs*255, bs*255, 255]
		]);

		gameState.shipColors = new EC.Palette(reactor, [
			[0, 0, 0, 255], 
			[0, 0, 255, 255],
			[0, 80, 255, 255],
			[0, 190, 255, 255]
		]);

		gameState.shipExplosionColors = new EC.Palette(reactor, [
			[0, 0, 0, 255],
			[255, 0, 0, 255],
			[255, 160, 0, 255],
			[255, 255, 0, 255]
		]);

		gameState.copyColors = new EC.Palette(reactor, [
			[0, 0, 0, 255],
			[0, 130, 0, 255],
			[0, 190, 0, 255],
			[0, 255, 0, 255]
		]);

		gameState.enemyDish.randomize(gameState.enemyRule.nrStates, 0.0005);
		gameState.enemy2Dish.randomize(gameState.enemyRule.nrStates, 0.01);
		gameState.shipExplosionDish.randomize(gameState.shipExplosionRule.nrStates, 0.01);
		gameState.shipX = gameState.gameW/2;
		gameState.shipY = gameState.gameH/2;
	};

	var gameLoop = function() {
		var reactor = gameState.reactor;

		// ENEMIES //////////////////////////////////////
		if (gameState.cnt % 2 === 0)
			reactor.step(gameState.enemyRule, gameState.enemyDish);
		if (gameState.cnt % 6 === 0)
			reactor.step(gameState.enemy2Rule, gameState.enemy2Dish);

		// SHIP ///////////////////////////////////////////
		reactor.step(gameState.weaponExplosionRule, gameState.weaponExplosionDish);
		reactor.step(gameState.weaponRule, gameState.weaponDish);
		reactor.step(gameState.shipExplosionRule, gameState.shipExplosionDish);
		reactor.step(gameState.shipRule, gameState.shipDish);

		// "DRAW" SHIP
		reactor.mixDish(gameState.drawCircleShader, gameState.shipDish, 
			{center: [gameState.shipX, gameState.shipY], radius: 3.5, state: (gameState.shipRule.nrStates-1)/255});

		var cb = function(pos) {
			try
			{
				gameState.sndHit.playbackRate = 3.5;
				gameState.sndHit.volume = 0.5;
				playSound(gameState.sndHit);
			} catch(ex) {}
		};

		// too costly
		//gameState.shots.collide(gameState.enemyDish, cb);
		gameState.shots.step();
		var enemyPixel = gameState.shots.collide(gameState.enemyDish, cb);
		gameState.shots.draw(gameState.drawPointsShader, gameState.weaponDish);



		// collide ship
		if (gameState.cnt > 40) {
			var shipR = 3;
			var pX, pY;

			var oldEnergy = gameState.playerEnergy;

			for (pX = -shipR; pX <= shipR; pX++) {
				for (pY = -shipR; pY <= shipR; pY++) {

					var xxx = Math.round(gameState.shipX + pX);
					var yyy = Math.round(gameState.shipY + pY);

					if (enemyPixel[(xxx+yyy*gameState.gameW)*4 + 3] !== 0) {
						gameState.playerEnergy -= 1;

		//				reactor.mixDish(gameState.drawCircleShader, gameState.weaponDish, 
		//	{center: [gameState.shipX + pX, gameState.shipY + pY], radius: 1.5, state: (gameState.shipRule.nrStates-1)/255});

					}
				}
			}

			if (oldEnergy !== gameState.playerEnergy) {
				refreshGUI();
				//storyTeller.RunDeath();
			}

			// did we just die?
			if (gameState.playerEnergy < 0) {
				gameState.renderLoop.stop();
				
				storyTeller.RunDeath(function() {
					gameState.playerEnergy = 200;
					resetGame();
					gameState.renderLoop.start();
				});
				
			}
		}
		

		// Dish INTERACTION ///////////////////////////////////

		// weapon + enemy -> weaponExplosion
		reactor.mixDish(gameState.intersectSpawnShader, gameState.weaponExplosionDish, 
			{tex1: gameState.weaponDish, tex2: gameState.enemyDish, state: (gameState.weaponExplosionRule.nrStates-1)/255});
		reactor.mixDish(gameState.intersectSpawnShader, gameState.weaponExplosionDish, 
			{tex1: gameState.enemyDish, tex2: gameState.weaponExplosionDish, state: 3/255});

		reactor.mixDish(gameState.intersectSpawnShader, gameState.enemyDish, 
			{tex1: gameState.enemyDish, tex2: gameState.weaponExplosionDish, state: 0/255});
		reactor.mixDish(gameState.intersectSpawnShader, gameState.weaponDish, 
			{tex1: gameState.weaponDish, tex2: gameState.weaponExplosionDish, state: 3/255});	


		// ship to enemy colissions spawn shipExplosions
		reactor.mixDish(gameState.intersectSpawnShader, gameState.shipExplosionDish, 
			{tex1: gameState.shipDish, tex2: gameState.enemyDish, state: (gameState.shipExplosionRule.nrStates-1)/255});
		
		// shipExplosions reinforced by enemys
		reactor.mixDish(gameState.intersectSpawnShader, gameState.shipExplosionDish, 
			{tex1: gameState.enemyDish, tex2: gameState.shipExplosionDish, state: 3/255});
	
		// enemyDish gets killed by shipExplosions
		reactor.mixDish(gameState.intersectSpawnShader, gameState.enemyDish, 
			{tex1: gameState.enemyDish, tex2: gameState.shipExplosionDish, state: 1/255});

		// ship gets killed by shipExplosions
		reactor.mixDish(gameState.intersectSpawnShader, gameState.shipDish, 
			{tex1: gameState.shipDish, tex2: gameState.shipExplosionDish, state: 0/255});	

		// COMPOSE ////////////////////////////////////////////
		reactor.applyShaderOnDish(gameState.clearShader, gameState.renderDish);

		reactor.mixDish(gameState.mixShader, gameState.renderDish, 
			{texNew: gameState.enemy2Dish, texPalette: gameState.enemy2Colors.getTexture()});
		reactor.mixDish(gameState.mixShader, gameState.renderDish, 
			{texNew: gameState.enemyDish, texPalette: gameState.enemyColors.getTexture()});
		reactor.mixDish(gameState.mixShader, gameState.renderDish, 
			{texNew: gameState.weaponDish, texPalette: gameState.weaponColors.getTexture()});
		reactor.mixDish(gameState.mixShader, gameState.renderDish, 
			{texNew: gameState.shipDish, texPalette: gameState.shipColors.getTexture()});
		reactor.mixDish(gameState.mixShader, gameState.renderDish, 
			{texNew: gameState.weaponExplosionDish, texPalette: gameState.shipExplosionColors.getTexture()});
		reactor.mixDish(gameState.mixShader, gameState.renderDish, 
			{texNew: gameState.shipExplosionDish, texPalette: gameState.shipExplosionColors.getTexture()});			
		//reactor.mixDish(mixShader, renderDish, {texNew: copyDish, texPalette: copyColors.getTexture()});		



		var camera = new THREE.PerspectiveCamera( 180*gameState.cameraAngle/Math.PI, 1, 0.01, 1000 );
		//camera.lookAt(new THREE.Vector3( 0, 0, -1 )); // what does it do?
		gameState.projectionMatrix = camera.projectionMatrix;

		//viewMatrix = new THREE.Matrix4();
		var quaternion = new THREE.Quaternion();
		quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0.7, 1 ).normalize(), gameState.rot );

		var shipClipX = 2*(gameState.shipX-gameState.enemyDish.width/2)/gameState.enemyDish.width;
		var shipClipY = 2*(gameState.shipY-gameState.enemyDish.height/2)/gameState.enemyDish.height;

		gameState.clipX = shipClipX;
		gameState.clipY = shipClipY;
		refreshGUI();

		var transMatrix = new THREE.Matrix4().compose(new THREE.Vector3(
				-shipClipX, -shipClipY, 0), 
			new THREE.Quaternion(), 
			new THREE.Vector3(1,1,1)
		);
		var rotMatrix = new THREE.Matrix4().compose(new THREE.Vector3(0,0,0), 
			quaternion, 
			new THREE.Vector3(1,1,1)
		);

		// correct order is firts translate then rotate
		gameState.viewMatrix = new THREE.Matrix4().multiplyMatrices(rotMatrix, transMatrix);

		// subtract mapped ship position to center player shi
		var shipPos = new THREE.Vector4(shipClipX, shipClipY, 0, 1);
		shipPos.applyMatrix4(gameState.viewMatrix);
		shipPos.multiplyScalar(-1);
		shipPos.add(new THREE.Vector3(0,0, -gameState.pixel)); // move to negative x
		//posPlayer = new THREE.Vector3(0,0, -pixel); // do this to not track ship
		var shipCenterMatrix = new THREE.Matrix4().compose(shipPos, 
			new THREE.Quaternion(), 
			new THREE.Vector3(1,1,1)
		);
		// now Subtract mapped shipPos
		gameState.viewMatrix = new THREE.Matrix4().multiplyMatrices(shipCenterMatrix, gameState.viewMatrix);



		reactor.paintDish(gameState.scrollingRenderShader, gameState.renderDish, function(gl, shader) {
			gl.uniform2f(gl.getUniformLocation(shader, "resolution"), gameState.gameW, gameState.gameH);
			gl.uniformMatrix4fv(gl.getUniformLocation(shader, "projectionMatrix"), false, gameState.projectionMatrix.elements);
			gl.uniformMatrix4fv(gl.getUniformLocation(shader, "modelViewMatrix"), false, gameState.viewMatrix.elements);
		});



		gameState.cnt++;
		gameState.fpsMonotor.frameIncrease();
	};

	var userInteraction = function() {
		var keyboard = gameState.keyboard;

		pollAutoFire();
// USER INPUT Poll Keyboard //////////////////////////////////////////////////
		if (keyboard.isPressed("O".charCodeAt()))
		{
			gameState.pixel -= 0.03;
		}

		if (keyboard.isPressed("L".charCodeAt()))
		{
			gameState.pixel += 0.03;
		}

		if (keyboard.isPressed("N".charCodeAt()))
		{
			gameState.rot += 0.05;
		}

		if (keyboard.isPressed("M".charCodeAt()))
		{
			gameState.rot -= 0.05;
		}

		if (keyboard.isPressed(keyboard.UP)) gameState.shipY += gameState.stepSize;
		if (keyboard.isPressed(keyboard.DOWN)) gameState.shipY -= gameState.stepSize;
		if (keyboard.isPressed(keyboard.LEFT)) gameState.shipX -= gameState.stepSize;
		if (keyboard.isPressed(keyboard.RIGHT)) gameState.shipX += gameState.stepSize;

		// space
		if (keyboard.isPressed(32)) {
			resetGame();
		}

		// escape
		if (keyboard.isPressed(27))
		{
			//enemyDish.setAll(0);
			//fileStore.storeRule("enemy_ludwigBuildships", enemyRule.ruleData);

			/*fileStore.loadRule("enemy_ludwigBuildships", function(loadedRule) {
				enemyRule = reactor.compileRule(loadedRule.ruleData, enemyDish);
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
					gameState.shots.allocateSphere(1, gameState.shipX, gameState.shipY, gameState.shotSpeed, gameState.bAngle);
				}

				playSound(gameState.sndBomb);
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

	// game must be less than 20 LOC :
	// MAIN GAME LOOP

	// TODO: should we not put this in backbone ready function?
	// is jquery redy better?
	//$(window).load(function(e) { 
		var canvas = document.getElementById('c');

		loadResources(function (data) {
			setupGame(data, canvas);
			setupGui();
			gameState.renderLoop = new utils.AnimationLoop(function() {
				userInteraction();
				gameLoop();
			});
			gameState.renderLoop.start();
		});
	//});
});
