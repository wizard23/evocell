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

	var appState = {
		canvas: null,
		reactor: null,
		gl: null,
		renderLoop: null,
	};

	var gameState = {
		bombFired: 0,
	};	

	var enemyDish, enemy2Dish, shipDish, shipExplosionDish, copyDish, bufferDish, renderDish, weaponExplosionDish;
	var shots;
	var drawPointsShader, clearShader, scrollingRenderShader, drawRectShader, drawCircleShader, mixShader, intersectSpawnShader, copyShader;
	var enemyRule, enemy2Rule, shipRule, weaponRule, shipExplosionRule;
	var enemyColors, enemy2Colors, shipColors, shipExplosionColors, copyColors;

	var keyboard = utils.keyboard;
	var gameW = 300, gameH = 300;

	var screenW = 1024;
	var screenH = 1024;

	var pixel = 1.5;
	var rot = 0.0;

	var shotN = 8;

	var cameraAngle = 60 * (Math.PI/180);
	var viewMatrix = new THREE.Matrix4();
	var projectionMatrix = new THREE.Matrix4();

	var shipX, shipY;
	var shotSpeed = 2.3;

	var maxParticles = 2800;
	var mouseMode = "shoot";	
	var cnt = 0; // used for executing enemyDish only every nth tep
	var bAngle = 0; // direction of bomb fire

		// guistate
	var uiDrawShape = "rectangle";
	var selectedState = 3;
	var selectedLayer = 0;
	var fpsMonotor;

	var sndInit = new Audio(resPath + "sound/Digital_SFX_Set/laser3.mp3"); // buffers automatically when created
	var snd = new Audio(resPath + "sound/Digital_SFX_Set/laser6.mp3"); 
	var sndBomb = new Audio(resPath + "sound/Digital_SFX_Set/laser4.mp3"); 
	var sndHit = new Audio(resPath + "sound/Digital_SFX_Set/laser9.mp3");
	var sndHit2 = new Audio(resPath + "sound/Digital_SFX_Set/laser9.mp3");

	var gameModel = {
		speed: 0,
		civX: 0.1,
		civY: 0.1,
		civZ: 0.1,
		civW: 0.1,

		clipX: 0.1,
		clipY: 0.1,

		ljlkjl: null,
		lhkjhkjh: null, 
		hlkjhjkh: null,
	};

 	var gui = new dat.GUI();
	gui.add(gameModel, 'civX');
	gui.add(gameModel, 'civY');
	gui.add(gameModel, 'civZ');
	gui.add(gameModel, 'civW');

	gui.add(gameModel, 'clipX');
	gui.add(gameModel, 'clipY');

	var drawModel = new Backbone.Model({
		availableLayers: ["enemy", "enemy2", "ship", "shipExplosion"],
		availableStates: [0, 1, 2, 3, 4, 5],

		drawSizeX: 50,
		drawSizeY: 30,
		selectedDrawShape : "rectangle",
		selectedStates : [3],
		selectedLayers : ["ship"],
	});

	var view_model = kb.viewModel(drawModel);
	//view_model.full_name = ko.computed((->return "#{@first_name()} #{@last_name()}"), view_model)
	ko.applyBindings(view_model, document.getElementById("drawTool"));

	///////

	var playSound = function(snd) {
		try {
			snd.currentTime=0;
			snd.play();
		} catch(ex) {}
	} 

	var getNDCFromMouseEvent = function(canvas, evt) {
		var coords = canvas.relMouseCoords(evt);
		return new THREE.Vector2(coords.x/screenW, (screenH - coords.y)/screenH);
	}

	var lastMouseNDC = new THREE.Vector2();
	var autoFireCounter = 0;
	var autoFireOn = 0;
	var pollAutoFire = function() {		
		if (autoFireOn) {
			if (autoFireCounter == 0) {
				var clickedPoint = intersectClick(lastMouseNDC);
				fireShotAt(gameW*(clickedPoint.x+1)/2, gameH*(clickedPoint.y+1)/2);	

				autoFireCounter = 5;
			}
			else {
				autoFireCounter--;
			}
		}
	}

	// gets NDC (0 to 1) of clicked postion
	// itersects line form eye (0, 0, 0) to cliked position of a viewMatrix transformed plane in x/y plane
	// returns computed object coordinates (-1 to 1 for x and y, 0 for z)
	var intersectClick = function(clickedNDC) {
		var invP = new THREE.Matrix4();
		invP.getInverse(projectionMatrix);

		var invMV = new THREE.Matrix4();
		invMV.getInverse(viewMatrix);

		var planeNormal = new THREE.Vector4(0, 0, -1, 0);
		var planePoint = new THREE.Vector4(0, 0, 0, 1);

		var sf = Math.sin(cameraAngle/2)/Math.cos(cameraAngle/2);
		var lineDir = new THREE.Vector4(sf*(2*clickedNDC.x - 1), sf*(2*clickedNDC.y - 1), -1, 0);
		var linePoint = new THREE.Vector4();

		planeNormal.applyMatrix4(viewMatrix);
		planePoint.applyMatrix4(viewMatrix);

		var a = new THREE.Vector4().subVectors(planePoint, linePoint).dot(planeNormal);
		var b = lineDir.dot(planeNormal);

		var pointPos = a / b;

		var point = new THREE.Vector4().addVectors(linePoint, lineDir.clone().multiplyScalar(pointPos));
		var deltaPoint = point.clone().applyMatrix4(invMV);

		gameModel.civX = deltaPoint.x;
		gameModel.civY = deltaPoint.y;
		gameModel.civZ = deltaPoint.z;
		gameModel.civW = deltaPoint.w;

		refreshGUI();

		return deltaPoint;
	}
	var fireShotAt = function(tx, ty) {
		// spawn shot
		var dX = tx-shipX;
		var dY = ty-shipY;
		var dL = Math.sqrt(dX*dX+dY*dY);
		var sX = shotSpeed * dX/dL;
		var sY = shotSpeed * dY/dL;

		var aa = 0.2;
		shots.allocateParticle(shipX, shipY, 1.05*sX, 1.05*sY);
		shots.allocateParticle(shipX, shipY, Math.cos(aa)*sX + Math.sin(aa)*sY, -Math.sin(aa)*sX + Math.cos(aa)*sY);
		aa = -aa;
		shots.allocateParticle(shipX, shipY, Math.cos(aa)*sX + Math.sin(aa)*sY, -Math.sin(aa)*sX + Math.cos(aa)*sY);

		playSound(snd);
	}
	// TODO: could be done in backbone via a conceptual model ;)
	var updateButtons = function() {
		if (appState.renderLoop.pauseRequested) {
			document.getElementById("playPause").children[0].className = "fa fa-play fa-2x";
		}
		else {
			document.getElementById("playPause").children[0].className = "fa fa-pause fa-2x";
		}
	}
	var refreshGUI = function() {
		for (var i in gui.__controllers) {
			gui.__controllers[i].updateDisplay();
		}
	}


	var setupGui = function() {
		document.getElementById("stepLink").addEventListener('click', function(evt) {
			appState.renderLoop.stop();
			appState.renderLoop.step();
			updateButtons();
		}, false);

		document.getElementById("playPause").addEventListener('click', function(evt) {
			appState.renderLoop.toggle();
			updateButtons();
		}, false);

		document.getElementById("zoomIn").addEventListener('click', function(evt) {
			pixel+=0.5;
		}, false);

		document.getElementById("zoomOut").addEventListener('click', function(evt) {
			pixel-=0.5;
		}, false);


		document.getElementById("showIntroLink").addEventListener('click', function(evt) {
			storyTeller.GetIntro()();
		}, false);

		var idxxxx = -1;
		document.getElementById("switchLink").addEventListener('click', function(evt) {
			fileStore.loadAllRules(function(rulesModelData) {
					idxxxx++;
					idxxxx %= rulesModelData.length;
					enemyRule = appState.reactor.compileRule(rulesModelData[idxxxx].ruleData, enemyDish);
				})
		}, false);

		//$( "#toolsMenu" ).hide();
		$( "#toolsMenu" ).accordion({
		collapsible: true,
		heightStyle: "content",
		animate: true,
		active: 0,
		});// .draggable();

		$('#colorpicker1').farbtastic('#color1');
		$( "#menu" ).menu();
		
		fpsMonotor = new utils.FPSMonitor("fpsMonitor");

		function handleCanvasMouseDown(evt) {
			var coords = appState.canvas.relMouseCoords(evt);
			var x = coords.x;
			var y = screenH - coords.y;

			var activeTool = $( "#toolsMenu" ).accordion( "option", "active" );

			var clickedNDC = getNDCFromMouseEvent(appState.canvas, evt);	
			var clickedPoint = intersectClick(clickedNDC);

			if (activeTool == 1) {
					var dish;
					if (drawModel.attributes.selectedLayers.indexOf("enemy") >= 0) dish = enemyDish;
					else if (drawModel.attributes.selectedLayers.indexOf("enemy2") >= 0) dish = enemy2Dish;
					else if (drawModel.attributes.selectedLayers.indexOf("ship") >= 0) dish = shipDish;
					else if (drawModel.attributes.selectedLayers.indexOf("shipExplosion") >= 0) dish = shipExplosionDish;

					var state = 0;
					var firstSel = drawModel.attributes.selectedStates[0];
					if (firstSel) state = firstSel;

					if (dish) {
						if (drawModel.attributes.selectedDrawShape == "circle") {
							appState.reactor.mixDish(drawCircleShader, dish, {center: [gameW*(clickedPoint.x+1)/2, gameH*(clickedPoint.y+1)/2], radius: drawModel.attributes.drawSizeX/2, state: state/255.});
						}
						else {
							appState.reactor.mixDish(drawRectShader, dish, {rectPos: [gameW*(clickedPoint.x+1)/2, gameH*(clickedPoint.y+1)/2], rectSize: [drawModel.attributes.drawSizeX, drawModel.attributes.drawSizeY], state: state/255.});
						}
					}
				
			}
			else if (activeTool != 1) { // || mouseMode == "shoot") {
				var clickedNDC = getNDCFromMouseEvent(appState.canvas, evt);	
				var clickedPoint = intersectClick(clickedNDC);
				fireShotAt(gameW*(clickedPoint.x+1)/2, gameH*(clickedPoint.y+1)/2);	

				autoFireOn = 1- autoFireOn;	
			}	
			else if (mouseMode == "copy") {
				appState.reactor.mixDish(copyShader, bufferDish, {
					destinationPos: [0, 0], destinationSize: [bufferDish.width, bufferDish.height],
					texSource: enemyDish, sourcePos: [x-bufferDish.width/2, y-bufferDish.height/2], sourceRes: [gameW, gameH], 	
					}); 
			}		
			else if (mouseMode == "paste") {
				appState.reactor.mixDish(copyShader, enemyDish, {
						destinationPos: [x-bufferDish.width/2, y-bufferDish.height/2], destinationSize: [bufferDish.width, bufferDish.height],
						texSource: bufferDish, sourcePos: [0, 0], sourceRes: [bufferDish.width, bufferDish.height], 	
						}); 
			}		
			
			evt.preventDefault();
			evt.stopPropagation();
		}
		appState.canvas.addEventListener('mousedown', handleCanvasMouseDown, false);

		var handleCanvasMouseMove = function(evt)
		{
			lastMouseNDC = getNDCFromMouseEvent(appState.canvas, evt);	
		}
		appState.canvas.addEventListener('mousemove', handleCanvasMouseMove, false);

	}

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
	}


		
	var setupGame = function (data, canvas) { 
		// Setup core 	
		
		var reactor = new  EC.Reactor(canvas, gameW, gameH);
		appState.reactor = reactor;
		appState.gl = reactor.gl;
		appState.canvas = canvas;

		reactor.setRenderSize(screenW, screenH);
		gl = reactor.gl;		

		enemyDish = reactor.compileDish();
		enemy2Dish = reactor.compileDish();
		shipDish = reactor.compileDish();
		shipExplosionDish = reactor.compileDish();
		weaponDish = reactor.compileDish();
		weaponExplosionDish = reactor.compileDish();
		copyDish = reactor.compileDish();
		bufferDish = reactor.compileDish(64, 64);
		renderDish = reactor.compileDish();

		shots = new EC.ParticleSystem(reactor, maxParticles, gameW, gameH);

		drawPointsShader = reactor.compileShader(data.vertexPoints, data.drawAll);
		
		clearShader = reactor.compileShader(data.clear);
		scrollingRenderShader = reactor.compileShader(data.rendererVertex, data.rendererFragment);

		drawRectShader = reactor.compileShader(data.drawRect);
		drawCircleShader = reactor.compileShader(data.drawCircle);

		mixShader = reactor.compileShader(data.mixPalette);
		intersectSpawnShader = reactor.compileShader(data.intersectSpawn);
		copyShader = reactor.compileShader(data.copyPaste);

		//fileStore.storeRule(data.enemy2Rule);
		//fileStore.loadRule("starwars", function(loadedRule) {
		//	enemyRule = reactor.compileRule(loadedRule, enemyDish);
		//})

		//data.enemyRule.MakeStarWarsRule()
		//fileStore.storeRule("starwars", data.enemyRule);

		enemyRule = reactor.compileRule(data.enemyRule, enemyDish);
		enemy2Rule = reactor.compileRule(data.enemy2Rule, enemy2Dish);
		shipRule = reactor.compileRule(data.shipRule, shipDish);
		weaponRule = reactor.compileRule(data.weaponRule, enemyDish);
		shipExplosionRule = reactor.compileRule(data.shipExplosionRule, enemy2Dish);
		weaponExplosionRule = reactor.compileRule(data.weaponExplosionRule, enemy2Dish);
		
		enemyColors = new EC.Palette(reactor);
		enemyColors.setColor(0, [0, 0, 0, 255]);
		enemyColors.setColor(1, [140, 10, 140, 255]);
		enemyColors.setColor(2, [255, 255, 255, 255]);
		enemyColors.setColor(3, [255, 30, 255, 255]);
		enemyColors.setColor(4, [255, 110, 255, 255]);


		weaponColors = new EC.Palette(reactor, [
			[0, 0, 0, 255],
			[0, 120, 0, 255],
			[0, 255, 0, 255],
			[120, 255, 0, 255],
			[200, 255, 0, 255],
		]);



	weaponExplosionColors = new EC.Palette(reactor, [
		[60, 60, 90, 255],
		[23, 108, 126, 255],
		[18, 164, 195, 255],
		[0, 210, 255, 255],
		[150, 210, 255, 255], 
		[255, 255, 255, 255]
	]);



		enemy2Colors = new EC.Palette(reactor);
		var bs = 0.12;
		enemy2Colors.setColor(0, [0, 0, 0, 255]);
		enemy2Colors.setColor(1, [bs*10, bs*80, bs*80, 255]);
		enemy2Colors.setColor(2, [bs*20, bs*170, bs*170, 255]);
		enemy2Colors.setColor(3, [bs*30, bs*255, bs*255, 255]);

		shipColors = new EC.Palette(reactor);
		shipColors.setColor(0, [0, 0, 0, 255]);
		shipColors.setColor(1, [0, 0, 255, 255]);
		shipColors.setColor(2, [0, 80, 255, 255]);
		shipColors.setColor(3, [0, 190, 255, 255]);

		shipExplosionColors = new EC.Palette(reactor);
		shipExplosionColors.setColor(0, [0, 0, 0, 255]);
		shipExplosionColors.setColor(1, [255, 0, 0, 255]);
		shipExplosionColors.setColor(2, [255, 160, 0, 255]);
		shipExplosionColors.setColor(3, [255, 255, 0, 255]);

		copyColors = new EC.Palette(reactor);
		copyColors.setColor(0, [0, 0, 0, 255]);
		copyColors.setColor(1, [0, 130, 0, 255]);
		copyColors.setColor(2, [0, 190, 0, 255]);
		copyColors.setColor(3, [0, 255, 0, 255]);

		enemyDish.randomize(enemyRule.nrStates, 0.0005);
		enemy2Dish.randomize(enemyRule.nrStates, 0.01);
		shipExplosionDish.randomize(shipExplosionRule.nrStates, 0.01);
		shipX = gameW/2, shipY = gameH/2;
	}

	var gameLoop = function() {
		var reactor = appState.reactor;

			// ENEMIES //////////////////////////////////////
			if (cnt % 2 == 0)
				reactor.step(enemyRule, enemyDish);
			if (cnt % 6 == 0)
				reactor.step(enemy2Rule, enemy2Dish);

			// SHIP ///////////////////////////////////////////
			reactor.step(weaponExplosionRule, weaponExplosionDish);
			reactor.step(weaponRule, weaponDish);
			reactor.step(shipExplosionRule, shipExplosionDish);
			reactor.step(shipRule, shipDish);

			// "DRAW" SHIP
			reactor.mixDish(drawCircleShader, shipDish, {center: [shipX, shipY], radius: 3.5, state: (shipRule.nrStates-1)/255});

			var cb = function(pos) {
				try
				{
					sndHit.playbackRate = 3.5;
					sndHit.volume = 0.5;
					playSound(sndHit);
				} catch(ex) {}
			}

			//shots.collide(enemyDish, cb);
			shots.step();
			shots.collide(enemyDish, cb);
			shots.draw(drawPointsShader, weaponDish);
			

			// Dish INTERACTION ///////////////////////////////////

			reactor.mixDish(intersectSpawnShader, weaponExplosionDish, {tex1: weaponDish, tex2: enemyDish, state: (weaponExplosionRule.nrStates-1)/255.});
			reactor.mixDish(intersectSpawnShader, weaponExplosionDish, {tex1: enemyDish, tex2: weaponExplosionDish, state: 3./255.});
		
			reactor.mixDish(intersectSpawnShader, enemyDish, {tex1: enemyDish, tex2: weaponExplosionDish, state: 0./255.});
			reactor.mixDish(intersectSpawnShader, weaponDish, {tex1: weaponDish, tex2: weaponExplosionDish, state: 3./255.});	



			reactor.mixDish(intersectSpawnShader, shipExplosionDish, {tex1: shipDish, tex2: enemyDish, state: (shipExplosionRule.nrStates-1)/255.});
			reactor.mixDish(intersectSpawnShader, shipExplosionDish, {tex1: enemyDish, tex2: shipExplosionDish, state: 3./255.});
		
			reactor.mixDish(intersectSpawnShader, enemyDish, {tex1: enemyDish, tex2: shipExplosionDish, state: 0./255.});
			reactor.mixDish(intersectSpawnShader, shipDish, {tex1: shipDish, tex2: shipExplosionDish, state: 3./255.});	

			// COMPOSE ////////////////////////////////////////////
			reactor.applyShaderOnDish(clearShader, renderDish);
			reactor.mixDish(mixShader, renderDish, {texNew: enemy2Dish, texPalette: enemy2Colors.getTexture()});
			reactor.mixDish(mixShader, renderDish, {texNew: enemyDish, texPalette: enemyColors.getTexture()});
			reactor.mixDish(mixShader, renderDish, {texNew: weaponDish, texPalette: weaponColors.getTexture()});
			reactor.mixDish(mixShader, renderDish, {texNew: shipDish, texPalette: shipColors.getTexture()});
			reactor.mixDish(mixShader, renderDish, {texNew: weaponExplosionDish, texPalette: shipExplosionColors.getTexture()});
			reactor.mixDish(mixShader, renderDish, {texNew: shipExplosionDish, texPalette: shipExplosionColors.getTexture()});			
			//reactor.mixDish(mixShader, renderDish, {texNew: copyDish, texPalette: copyColors.getTexture()});		

			if (keyboard.isPressed("O".charCodeAt()))
			{
				pixel -= 0.03;
			}

			if (keyboard.isPressed("L".charCodeAt()))
			{
				pixel += 0.03;
			}

			if (keyboard.isPressed("N".charCodeAt()))
			{
				rot += 0.05;
			}

			if (keyboard.isPressed("M".charCodeAt()))
			{
				rot -= 0.05;
			}

			var camera = new THREE.PerspectiveCamera( 180*cameraAngle/Math.PI, 1, 0.01, 1000 );
			//camera.lookAt(new THREE.Vector3( 0, 0, -1 )); // what does it do?
			projectionMatrix = camera.projectionMatrix;

			//viewMatrix = new THREE.Matrix4();
			var quaternion = new THREE.Quaternion();
			quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0.7, 1 ).normalize(), rot );

			var shipClipX = 2*(shipX-enemyDish.width/2)/enemyDish.width;
			var shipClipY = 2*(shipY-enemyDish.height/2)/enemyDish.height;

			gameModel.clipX = shipClipX;
			gameModel.clipY = shipClipY;
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
			//viewMatrix = new THREE.Matrix4().multiplyMatrices(transMatrix, rotMatrix); // wrong order
			viewMatrix = new THREE.Matrix4().multiplyMatrices(rotMatrix, transMatrix);

			// subtract mapped ship position to center player shi
			var shipPos = new THREE.Vector4(shipClipX, shipClipY, 0, 1);
			shipPos.applyMatrix4(viewMatrix);
			shipPos.multiplyScalar(-1);
			shipPos.add(new THREE.Vector3(0,0, -pixel)) // move to negative x
			//posPlayer = new THREE.Vector3(0,0, -pixel); // do this to not track ship
			var shipCenterMatrix = new THREE.Matrix4().compose(shipPos, 
				new THREE.Quaternion(), 
				new THREE.Vector3(1,1,1)
			);
			// now Subtract mapped shipPos
			viewMatrix = new THREE.Matrix4().multiplyMatrices(shipCenterMatrix, viewMatrix);

			reactor.paintDish(scrollingRenderShader, renderDish, function(gl, shader) {
				gl.uniform2f(gl.getUniformLocation(shader, "resolution"), gameW, gameH);
				gl.uniformMatrix4fv(gl.getUniformLocation(shader, "projectionMatrix"), false, projectionMatrix.elements);
				gl.uniformMatrix4fv(gl.getUniformLocation(shader, "modelViewMatrix"), false, viewMatrix.elements);
			});

			cnt++;
			fpsMonotor.frameIncrease();
	};

	var userInteraction = function() {
			pollAutoFire();
	// USER INPUT Poll Keyboard //////////////////////////////////////////////////
			var stepSize = 1;
			if (keyboard.isPressed(keyboard.UP)) shipY += stepSize;
			if (keyboard.isPressed(keyboard.DOWN)) shipY -= stepSize;
			if (keyboard.isPressed(keyboard.LEFT)) shipX -= stepSize;
			if (keyboard.isPressed(keyboard.RIGHT)) shipX += stepSize
	
			// space
			if (keyboard.isPressed(32)) {
				enemyDish.randomize(enemyRule.nrStates, 0.02);
				enemy2Dish.randomize(enemyRule.nrStates, 0.01);
				if (shipX < 0 || shipX > gameW || shipY < 0 || shipY > gameH)
					shipX = gameW/2, shipY = gameH/2;

				playSound(sndInit);
				
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
				shotN++;
			}

			if (keyboard.isPressed("K".charCodeAt())) {
				shotN--;
				if (shotN <= 0) shotN = 1;
			}

			if (keyboard.isPressed("B".charCodeAt())) {
				if (!gameState.bombFired) {
					//gameState.bombFired = 1; // allow permanent fire for now
					for (var i = 0; i < shotN; i++)
					{
						bAngle += Math.PI * 2 / 1.61803398875;
						shots.allocateSphere(1, shipX, shipY, shotSpeed, bAngle);
					}

					playSound(sndBomb);
				}
			}
			else {
				gameState.bombFired = 0;
			}

			if (keyboard.isPressed("1".charCodeAt()))
			{
				mouseMode = "shoot";
			}
			if (keyboard.isPressed("P".charCodeAt()))
			{
				mouseMode = "paste";
			}
			if (keyboard.isPressed("C".charCodeAt()))
			{
				mouseMode = "copy";
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
				if (!shotDelay)
				{
					shotDelay = 10;
					var px = (shipX/gameW)*2. - 1.;
					var py = (shipY/gameH)*2. - 1.;
					var sX = sDX * shotSpeed;
					var sY = sDY*shotSpeed; 

					shots.allocateParticle(shipX, shipY, sX, sY);
				}
				else 
					shotDelay--;
			}
			else
				shotDelay = 0;
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
			appState.renderLoop = new utils.AnimationLoop(function() {
				userInteraction();
				gameLoop();
			});
			appState.renderLoop.start();
		});
	//});
});
