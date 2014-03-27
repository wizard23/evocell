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
		"three.parser": "../../three.parser.js/src/THREE.Parser",
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

//require([
//	"jquery-ui", "Utils", "EvoCell", "story/StoryTeller", "underscore", 
// 	"backbone", "knockback", "knockout", "data/FileStore", "three", "three.parser", "datgui"], 
//function($, utils, EC, storyTeller,_ , Backbone, kb, ko, fileStore, THREE, parser, dat) {

require([
	"jquery-ui", "Utils", "EvoCell", "story/StoryTeller", "underscore", 
	"backbone", "knockback", "knockout", "data/FileStore", "three", "datgui"], 
function($, utils, EC, storyTeller,_ , Backbone, kb, ko, fileStore, THREE, dat) {
	"use strict";

// disable parser for now
//	alert(parser.parse(
//			"7*v**(A***B) - c",
//			"a, b, c", { pow: "NumJS.POW" }));

	var OP_REPLACE = 0;
	var OP_ADD = 1;
	
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
		frontShots: 3,
		frontShotAngle: 0.8,
		shotN: 8,
		bombFired: 0,
		bAngle: 0, // direction of bomb fire

		autoFireCounter: 0,
		autoFireOn: 0,
		lastMouseNDC: new THREE.Vector2(),

		shaders: {},
		dishes: {},
		rules: {},
		colors: {},
		shots: null,

		gameW: 400, gameH: 400,
		screenW: 1200,
		screenH: 900,

		zoom: 1/3, // cell/pixel ratio
		rot: 0,

		cameraAngle: 60 * (Math.PI/180),
		viewMatrix: new THREE.Matrix4(),
		projectionMatrix: new THREE.Matrix4(),

		shipX: 0, shipY: 0,
		playerEnergy: 100,
		stepSize: 1.5, 
		
		mouseMode: "shoot",	
		cnt: 0, // used for executing dishes.enemy only every nth tep

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

		var aa = gameState.frontShots > 1 ? -gameState.frontShotAngle/2 : 0;

		for (var i = 0; i < gameState.frontShots; i++) {
			gameState.shots.allocateParticle(gameState.shipX, gameState.shipY, Math.cos(aa)*sX + Math.sin(aa)*sY, -Math.sin(aa)*sX + Math.cos(aa)*sY);
			
			if (gameState.frontShots > 1)
				aa += gameState.frontShotAngle/(gameState.frontShots-1);
		}
		
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

		for (var fIdx in gameState.gui.__folders) {
			var folder = gameState.gui.__folders[fIdx];
			for (i in folder.__controllers) {
				folder.__controllers[i].updateDisplay();
			}
		}
	};

	var resetGame = function() {
		gameState.cnt = 0;
		gameState.dishes.enemy.randomize(gameState.rules.enemy.nrStates, 0.02);
		gameState.dishes.enemy2.randomize(gameState.rules.enemy.nrStates, 0.01);
		if (gameState.shipX < 0 || gameState.shipX > gameState.gameW || 
			gameState.shipY < 0 || gameState.shipY > gameState.gameH) {
			gameState.shipX = gameState.gameW/2;
			gameState.shipY = gameState.gameH/2;
		}
		playSound(gameState.sndInit);
	};

	var gameStep = function() {
		gameState.renderLoop.stop();
		gameState.renderLoop.step();
		updateButtons();
	};

	var gamePlayPause = function() {
		gameState.renderLoop.toggle();
		updateButtons();
	};

	var onGameSizeChanged = function() {
		var reactor = gameState.reactor;

		reactor.setDefaultDishSize(gameState.gameW, gameState.gameH);

		// hack reinit shots
		gameState.shots = new EC.ParticleSystem(reactor, gameState.maxParticles, gameState.gameW, gameState.gameH);

		// reinit instead of resize (we lose state but who cares?)
		var dishes = gameState.dishes;
		dishes.enemy = reactor.compileDish();
		dishes.enemy2 = reactor.compileDish();
		dishes.ship = reactor.compileDish();
		dishes.shipExplosion = reactor.compileDish();
		dishes.weapon = reactor.compileDish();
		dishes.weaponExplosion = reactor.compileDish();
		dishes.copy = reactor.compileDish();
		dishes.buffer = reactor.compileDish(64, 64);
		dishes.render = reactor.compileDish();

		var rules = gameState.rules;
		rules.enemy.setCompileSizeDish(gameState.dishes.enemy);
		rules.enemy2.setCompileSizeDish(gameState.dishes.enemy2);
		rules.ship.setCompileSizeDish(gameState.dishes.ship);
		rules.weapon.setCompileSizeDish(gameState.dishes.enemy);
		rules.shipExplosion.setCompileSizeDish(gameState.dishes.enemy2);
		rules.weaponExplosion.setCompileSizeDish(gameState.dishes.enemy2);

		resetGame();
	}; 
		


	var setupGui = function() {
		document.getElementById("stepLink").addEventListener('click', function(evt) {
			gameStep();
		}, false);

		document.getElementById("playPause").addEventListener('click', function(evt) {
			gamePlayPause();
		}, false);

		document.getElementById("zoomIn").addEventListener('click', function(evt) {
			gameState.zoom+=0.5;
		}, false);

		document.getElementById("zoomOut").addEventListener('click', function(evt) {
			gameState.zoom-=0.5;
		}, false);


		document.getElementById("showIntroLink").addEventListener('click', function(evt) {
			storyTeller.RunIntro();
		}, false);

		var idxxxx = -1;
		document.getElementById("switchLink").addEventListener('click', function(evt) {
			fileStore.loadAllRules(function(rulesModelData) {
					idxxxx++;
					idxxxx %= rulesModelData.length;
					gameState.rules.enemy = gameState.reactor.compileRule(rulesModelData[idxxxx].ruleData, 
						gameState.dishes.enemy);
				});
		}, false);

		var gui = gameState.gui;

		gui.add(gameState, 'playerEnergy');

		var folder = gui.addFolder('App');
		folder.add(gameState, 'zoom', 0.05, 2).step(0.01);

		// ugly hack to make ro a two decimal nr in datgui
		var oldRot = gameState.rot;
		gameState.rot = 0.01;
		// hack continues below

		var ctrl = folder.add(gameState, 'rot', -Math.PI*2, Math.PI*2).step(0.01);
		//ctrl.__precision = 3;
		//ctrl.__impliedStep = 0.001;

		// hack!
		gameState.rot = oldRot;
		refreshGUI();
		// end of ugly hack 

		folder.add(gameState, 'frontShots', 1, 12).step(1);
		folder.add(gameState, 'frontShotAngle', 0, 2*Math.PI);

		folder.add(gameState, 'gameW').onFinishChange(onGameSizeChanged);
		folder.add(gameState, 'gameH').onFinishChange(onGameSizeChanged);

		folder = gui.addFolder('Core');
		var screenWCtrl = folder.add(gameState, 'screenW');
		var screenHCtrl = folder.add(gameState, 'screenH');

		screenWCtrl.onFinishChange(function(value) {
		  gameState.reactor.setRenderSize(gameState.screenW, gameState.screenH);
		});
		screenHCtrl.onFinishChange(function(value) {
		  gameState.reactor.setRenderSize(gameState.screenW, gameState.screenH);
		});


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

					dish = gameState.dishes[gameState.drawModel.attributes.selectedLayers[0]];

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
				fireShotAt(gameState.gameW*(clickedPoint.x+1)/2, gameState.gameH*(clickedPoint.y+1)/2);	

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
			gameState.lastMouseNDC = getNDCFromMouseEvent(gameState.canvas, evt);	
		};
		gameState.canvas.addEventListener('mousemove', handleCanvasMouseMove, false);

	};

	// static
	var loadResources = function(callback) {
		var loader = new EC.ResLoader();
		loader.load("rules.enemy", resPath + "rules/enemy_ludwigBuildships", "ecfile");
		//loader.load("rules.enemy", resPath + "rules/enemy_evil", "ecfile");
		//loader.load("rules.enemy", resPath + "rules/22C3_mirrorsymetric_gliders-randomwaver", "ecfile");
		//loader.load("rules.enemy", "rules/enemy_d54_awesomeships", "ecfile");
		//loader.load("rules.enemy", resPath + "rules/enemy_d52_replicator", "ecfile");
		//loader.load("rules.enemy", resPath + "rules/enemy_holeshooter", "ecfile");
		//loader.load("rules.enemy", "rules/enemy_holeshooter", "ecfile");
		//loader.load("rules.enemy", "rules/gridworld6", "ecfile");
		//loader.load("rules.enemy", "rules/enemy_quaderwelt_moreactive", "ecfile");
		//loader.load("rules.enemy", "rules/enemy_d29", "ecfile");
		//loader.load("rules.enemy", "rules/enemy_linesLounge_moreactive", "ecfile");
		//loader.load("rules.enemy", "rules/enemy_linesLounge_moreactive-mutA_mut", "ecfile");
		

		loader.load("rules.enemy2", resPath + "rules/enemy_linebuilder", "ecfile");
		loader.load("rules.weapon", resPath + "rules/ship_avg4_nice", "ecfile");
		
		loader.load("rules.weaponExplosion", resPath + "rules/cross4-wave-spaceshipshoot", "ecfile");
		//loader.load("rules.weaponExplosion", resPath + "rules/ship_avg4_nice", "ecfile");

		
		loader.load("rules.shipExplosion", resPath + "rules/cross4-wave-spaceshipshoot", "ecfile");
		//loader.load("rules.shipExplosion", resPath + "rules/ship_avg4_nice", "ecfile");

		loader.load("rules.ship", resPath + "rules/ship_avg4_nice", "ecfile");

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

		var dishes = gameState.dishes;
		dishes.enemy = reactor.compileDish();
		dishes.enemy2 = reactor.compileDish();
		dishes.ship = reactor.compileDish();
		dishes.shipExplosion = reactor.compileDish();
		dishes.weapon = reactor.compileDish();
		dishes.weaponExplosion = reactor.compileDish();
		dishes.copy = reactor.compileDish();
		dishes.buffer = reactor.compileDish(64, 64);
		dishes.render = reactor.compileDish();

		gameState.shots = new EC.ParticleSystem(reactor, gameState.maxParticles, gameState.gameW, gameState.gameH);

		gameState.shaders.drawPoints = reactor.compileShader(data.vertexPoints, data.drawAll);
		
		gameState.shaders.clear = reactor.compileShader(data.clear);
		gameState.shaders.scrollingRender = reactor.compileShader(data.rendererVertex, data.rendererFragment);

		gameState.shaders.drawRect = reactor.compileShader(data.drawRect);
		gameState.shaders.drawCircle = reactor.compileShader(data.drawCircle);

		gameState.shaders.mix = reactor.compileShader(data.mixPalette);
		gameState.shaders.intersectSpawn = reactor.compileShader(data.intersectSpawn);
		gameState.shaders.copy = reactor.compileShader(data.copyPaste);

		//fileStore.storeRule(data.rules.enemy2);
		//fileStore.loadRule("starwars", function(loadedRule) {
		//	rules.enemy = reactor.compileRule(loadedRule, dishes.enemy);
		//})

		//data.rules.enemy.MakeStarWarsRule()
		//fileStore.storeRule("starwars", data.rules.enemy);

		var rules = gameState.rules;
		rules.enemy = reactor.compileRule(data["rules.enemy"], gameState.dishes.enemy);
		rules.enemy2 = reactor.compileRule(data["rules.enemy2"], gameState.dishes.enemy2);
		rules.ship = reactor.compileRule(data["rules.ship"], gameState.dishes.ship);
		rules.weapon = reactor.compileRule(data["rules.weapon"], gameState.dishes.enemy);
		rules.shipExplosion = reactor.compileRule(data["rules.shipExplosion"], gameState.dishes.enemy2);
		rules.weaponExplosion = reactor.compileRule(data["rules.weaponExplosion"], gameState.dishes.enemy2);
		
		gameState.colors.enemy = new EC.Palette(reactor, [
			[0, 0, 0, 255],
			[140, 10, 140, 255],
			[255, 255, 255, 255],
			[255, 30, 255, 255],
			[255, 110, 255, 255]
		]);

		gameState.colors.weapon = new EC.Palette(reactor, [
			[0, 0, 0, 255],
			[0, 120, 0, 255],
			[0, 255, 0, 255],
			[120, 255, 0, 255],
			[200, 255, 0, 255],
		]);

		gameState.colors.weaponExplosion = new EC.Palette(reactor, [
			[60, 60, 90, 255],
			[23, 108, 126, 255],
			[18, 164, 195, 255],
			[0, 210, 255, 255],
			[150, 210, 255, 255], 
			[255, 255, 255, 255]
		]);

		var bs = 0.12;
		gameState.colors.enemy2 = new EC.Palette(reactor, [
			[0, 0, 0, 255],
			[bs*10, bs*80, bs*80, 255], 
			[bs*20, bs*170, bs*170, 255],
			[bs*30, bs*255, bs*255, 255]
		]);

		gameState.colors.ship = new EC.Palette(reactor, [
			[0, 0, 0, 255], 
			[0, 0, 255, 255],
			[0, 80, 255, 255],
			[0, 190, 255, 255]
		]);

		gameState.colors.shipExplosion = new EC.Palette(reactor, [
			[0, 0, 0, 255],
			[255, 0, 0, 255],
			[255, 160, 0, 255],
			[255, 255, 0, 255]
		]);

		gameState.colors.copy = new EC.Palette(reactor, [
			[0, 0, 0, 255],
			[0, 130, 0, 255],
			[0, 190, 0, 255],
			[0, 255, 0, 255]
		]);

		gameState.dishes.enemy.randomize(gameState.rules.enemy.nrStates, 0.0005);
		gameState.dishes.enemy2.randomize(gameState.rules.enemy.nrStates, 0.01);
		gameState.dishes.shipExplosion.randomize(gameState.rules.shipExplosion.nrStates, 0.01);
		gameState.shipX = gameState.gameW/2;
		gameState.shipY = gameState.gameH/2;
	};

	var gameLoop = function() {
		var reactor = gameState.reactor;

		// ENEMIES //////////////////////////////////////
		if (gameState.cnt % 2 === 0)
			reactor.step(gameState.rules.enemy, gameState.dishes.enemy);
		if (gameState.cnt % 6 === 0)
			reactor.step(gameState.rules.enemy2, gameState.dishes.enemy2);

		// SHIP ///////////////////////////////////////////
		reactor.step(gameState.rules.weaponExplosion, gameState.dishes.weaponExplosion);
		reactor.step(gameState.rules.weapon, gameState.dishes.weapon);
		reactor.step(gameState.rules.shipExplosion, gameState.dishes.shipExplosion);
		reactor.step(gameState.rules.ship, gameState.dishes.ship);

		// "DRAW" SHIP
		reactor.mixDish(gameState.shaders.drawCircle, gameState.dishes.ship, 
			{center: [gameState.shipX, gameState.shipY], radius: 3.5, state: (gameState.rules.ship.nrStates-1)/255});

		var cb = function(pos) {
			try
			{
				gameState.sndHit.playbackRate = 3.5;
				gameState.sndHit.volume = 0.5;
				playSound(gameState.sndHit);
			} catch(ex) {}
		};

		// too costly
		//gameState.shots.collide(gameState.dishes.enemy, cb);
		gameState.shots.step();
		var enemyPixel = gameState.shots.collide(gameState.dishes.enemy, cb);
		gameState.shots.draw(gameState.shaders.drawPoints, gameState.dishes.weapon);



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

		//				reactor.mixDish(gameState.shaders.drawCircle, gameState.dishes.weapon, 
		//	{center: [gameState.shipX + pX, gameState.shipY + pY], radius: 1.5, state: (gameState.rules.ship.nrStates-1)/255});

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
		reactor.mixDish(gameState.shaders.intersectSpawn, gameState.dishes.weaponExplosion, { 
			tex1: gameState.dishes.weapon, tex2: gameState.dishes.enemy, 
			state: (gameState.rules.weaponExplosion.nrStates-1)/255, 
			operation: OP_REPLACE
		});
		reactor.mixDish(gameState.shaders.intersectSpawn, gameState.dishes.weaponExplosion, 
			{tex1: gameState.dishes.enemy, tex2: gameState.dishes.weaponExplosion, state: 3/255, operation: OP_REPLACE});

		reactor.mixDish(gameState.shaders.intersectSpawn, gameState.dishes.enemy, 
			{tex1: gameState.dishes.enemy, tex2: gameState.dishes.weaponExplosion, state: 0/255, operation: OP_REPLACE});
		reactor.mixDish(gameState.shaders.intersectSpawn, gameState.dishes.weapon, 
			{tex1: gameState.dishes.weapon, tex2: gameState.dishes.weaponExplosion, state: 3/255, operation: OP_REPLACE});	


		// ship to enemy colissions spawn shipExplosions
		reactor.mixDish(gameState.shaders.intersectSpawn, gameState.dishes.shipExplosion, 
			{tex1: gameState.dishes.ship, tex2: gameState.dishes.enemy, 
				state: (gameState.rules.shipExplosion.nrStates-1)/255,
			operation: OP_REPLACE});
		
		// shipExplosions reinforced by enemys
		reactor.mixDish(gameState.shaders.intersectSpawn, gameState.dishes.shipExplosion, 
			{tex1: gameState.dishes.enemy, tex2: gameState.dishes.shipExplosion, state: 3/255, operation: OP_REPLACE});
	
		// dishes.enemy gets slowly killed by shipExplosions
		if (gameState.cnt % 6 === 1)
		reactor.mixDish(gameState.shaders.intersectSpawn, gameState.dishes.enemy, 
			{tex1: gameState.dishes.enemy, tex2: gameState.dishes.shipExplosion, state: -1/255, operation: OP_ADD});

		// ship gets killed by shipExplosions
		reactor.mixDish(gameState.shaders.intersectSpawn, gameState.dishes.ship, 
			{tex1: gameState.dishes.ship, tex2: gameState.dishes.shipExplosion, state: 0/255, operation: OP_REPLACE});	

		// COMPOSE ////////////////////////////////////////////
		reactor.applyShaderOnDish(gameState.shaders.clear, gameState.dishes.render);

		reactor.mixDish(gameState.shaders.mix, gameState.dishes.render, 
			{texNew: gameState.dishes.enemy2, texPalette: gameState.colors.enemy2.getTexture()});
		reactor.mixDish(gameState.shaders.mix, gameState.dishes.render, 
			{texNew: gameState.dishes.enemy, texPalette: gameState.colors.enemy.getTexture()});
		reactor.mixDish(gameState.shaders.mix, gameState.dishes.render, 
			{texNew: gameState.dishes.weapon, texPalette: gameState.colors.weapon.getTexture()});
		reactor.mixDish(gameState.shaders.mix, gameState.dishes.render, 
			{texNew: gameState.dishes.ship, texPalette: gameState.colors.ship.getTexture()});
		reactor.mixDish(gameState.shaders.mix, gameState.dishes.render, 
			{texNew: gameState.dishes.weaponExplosion, texPalette: gameState.colors.shipExplosion.getTexture()});
		reactor.mixDish(gameState.shaders.mix, gameState.dishes.render, 
			{texNew: gameState.dishes.shipExplosion, texPalette: gameState.colors.shipExplosion.getTexture()});			
		

		//reactor.mixDish(gameState.shaders.mix, gameState.dishes.render, 
		//	{texNew: gameState.dishes.enemy, texPalette: gameState.colors.enemy.getTexture()});

		//reactor.mixDish(shaders.mix, dishes.render, {texNew: dishes.copy, texPalette: colors.copy.getTexture()});		






		var camera = new THREE.PerspectiveCamera( 180*gameState.cameraAngle/Math.PI, 1, 0.01, 1000 );
		//camera.lookAt(new THREE.Vector3( 0, 0, -1 )); // what does it do?
		gameState.projectionMatrix = camera.projectionMatrix;

		//viewMatrix = new THREE.Matrix4();
		var quaternion = new THREE.Quaternion();
		quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0.7, 1 ).normalize(), gameState.rot );

		var shipClipX = 2*(gameState.shipX-gameState.dishes.enemy.width/2)/gameState.dishes.enemy.width;
		var shipClipY = 2*(gameState.shipY-gameState.dishes.enemy.height/2)/gameState.dishes.enemy.height;

		var scaleX = gameState.gameW / gameState.screenW;
		var scaleY = gameState.gameH / gameState.screenH;

		var transMatrix = new THREE.Matrix4().compose(new THREE.Vector3(
				-shipClipX, -shipClipY, 0), 
			new THREE.Quaternion(), 
			new THREE.Vector3(scaleX,scaleY,1)
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
		shipPos.add(new THREE.Vector3(0,0, -gameState.zoom)); // move to negative x
		//posPlayer = new THREE.Vector3(0,0, -pixel); // do this to not track ship
		var shipCenterMatrix = new THREE.Matrix4().compose(shipPos, 
			new THREE.Quaternion(), 
			new THREE.Vector3(1,1,1)
		);
		// now Subtract mapped shipPos
		gameState.viewMatrix = new THREE.Matrix4().multiplyMatrices(shipCenterMatrix, gameState.viewMatrix);



		reactor.paintDish(gameState.shaders.scrollingRender, gameState.dishes.render, function(gl, shader) {
			gl.uniform2f(gl.getUniformLocation(shader, "resolution"), gameState.gameW, gameState.gameH);
			gl.uniformMatrix4fv(gl.getUniformLocation(shader, "projectionMatrix"), false, gameState.projectionMatrix.elements);
			gl.uniformMatrix4fv(gl.getUniformLocation(shader, "modelViewMatrix"), false, gameState.viewMatrix.elements);
		});



		gameState.cnt++;
		gameState.fpsMonotor.frameIncrease();
	};

	var once = 1;

	var userInteraction = function() {
		var keyboard = gameState.keyboard;

		pollAutoFire();
// USER INPUT Poll Keyboard //////////////////////////////////////////////////
		

		// TODO: move this to animaion independed poll function
		if (keyboard.isPressed("Z".charCodeAt()))
		{
			if (once) {
				once=0;
				gameStep();
			}
		}
		else if (keyboard.isPressed("X".charCodeAt()))
		{
			if (once) {
				once=0;
				gamePlayPause();
			}
		}
		else
			once = 1;	


		if (keyboard.isPressed("O".charCodeAt()))
		{
			gameState.zoom -= 0.03;
			refreshGUI();
		}

		if (keyboard.isPressed("L".charCodeAt()))
		{
			gameState.zoom += 0.03;
			refreshGUI();
		}

		if (keyboard.isPressed("N".charCodeAt()))
		{
			gameState.rot += 0.05;
			refreshGUI();
		}

		if (keyboard.isPressed("M".charCodeAt()))
		{
			gameState.rot -= 0.05;
			refreshGUI();
		}


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

			var moveDir = intersectClick(dirV);
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

/*
		if (keyboard.isPressed(keyboard.UP)) gameState.shipY += gameState.stepSize;
		if (keyboard.isPressed(keyboard.DOWN)) gameState.shipY -= gameState.stepSize;
		if (keyboard.isPressed(keyboard.LEFT)) gameState.shipX -= gameState.stepSize;
		if (keyboard.isPressed(keyboard.RIGHT)) gameState.shipX += gameState.stepSize;
*/
		// space
		if (keyboard.isPressed(32)) {
			resetGame();
		}

		// escape
		if (keyboard.isPressed(27))
		{
			//dishes.enemy.setAll(0);
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
