require.config({
   // baseUrl: 'js/lib',
	paths: {
		jquery: 'libs/jquery-1.10.2',
		"jquery-ui": 'libs/jquery-ui-1.10.4.custom',
		"underscore": "libs/underscore",
		backbone: "libs/backbone",
		knockback: "libs/knockback",
		knockout: "libs/knockout-3.0.0",
		meSpeak: "libs/mespeak/mespeak",
		three: "libs/three", 
		"jquery-cycle":"libs/jquery.cycle.all",
		datgui: "libs/dat.gui.min",
	},
	shim: {
		datgui: {
			exports: "dat",
		}, 

        "jquery-ui": {
            exports: "$",
            deps: ['jquery', 'libs/farbtastic']
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
		deps: [],			
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
	"jquery-ui", "Utils", "CellSpaceResources", "EvoCell", "story/StoryTeller", "underscore", 
	"backbone", "knockback", "knockout", "data/FileStore", "three", "datgui"], 
	function($, utils, resources, EC, storyTeller,_ , Backbone, kb, ko, fileStore, THREE, dat) {

	var canvas;
	var reactor;
	var gl;		

	var renderLoop;

	var enemyDish, enemy2Dish, shipDish, shipExplosionDish, copyDish, bufferDish, renderDish
	var shots;
	var drawPointsShader, clearShader, scrollingRenderShader, drawRectShader, drawCircleShader, mixShader, intersectSpawnShader, copyShader;
	var enemyRule, enemy2Rule, shipRule, weaponRule, shipExplosionRule;
	var enemyColors, enemy2Colors, shipColors, shipExplosionColors, copyColors;

	var keyboard = utils.keyboard;
	var gameW = 400, gameH = 256;
	//gameW = 188, gameH = 188;
	var zoom = 3;

	var screenW = 1024;
	var screenH = 600;

	var zoomF = 1;
	var gridOffsetX=0, gridOffsetY=0;
	var zoomFX = 1, zoomFY = 1;
	var pixel = 4;
	var pixX = 0;
	var rot = 0.0;

	var shotN = 8;

	var cameraAngle = 60 * (Math.PI/180);
	var viewMatrix = new THREE.Matrix4();
	var projectionMatrix = new THREE.Matrix4();


///*
	/*	var shotD = 3;
		var wellen = 20;
		var prim = 7;


		var PK = Math.sqrt(gameW*gameW/4 + gameH*gameH/4) * 2*Math.PI;
		var SK = PK/shotD;
		var VK = Math.PI*2/SK;
		shotN = SK/wellen;
		
		var bADelta = prim*VK;

*/
//*/
///*
	var SN = 101; //(coverLen / 5);
	var W = 11;
	var minA = 2*Math.PI/SN;
	var bADelta = minA * W;
	bADelta = 3*Math.E/Math.PI;
	var wellen = 100;
//*/
	
	var wk = wellen;

	var shipX, shipY;
	var shotSpeed = 2.3;

	var maxParticles = 2800;
	var mouseMode = "shoot";	
	var cnt = 0; // used for executing enemyDish only every nth tep
	// TODO what laws govern bangle and resulting bombingfield density. define density of bomb array
	var bAngle = 0.44301; // experimentally found out to cover sphere most randomally (look at bomb swarms as bAngle changes, the cover density is how many different its you get on the circle before you get ...)

	var game = {};
		// guistate
	var uiDrawShape = "rectangle";
	var selectedState = 3;
	var selectedLayer = 0;
	var fpsMonotor;

	var sndInit = new Audio("sound/Digital_SFX_Set/laser3.mp3"); // buffers automatically when created
	var snd = new Audio("sound/Digital_SFX_Set/laser6.mp3"); 
	var sndBomb = new Audio("sound/Digital_SFX_Set/laser4.mp3"); 
	var sndHit = new Audio("sound/Digital_SFX_Set/laser9.mp3");
	var sndHit2 = new Audio("sound/Digital_SFX_Set/laser9.mp3");

	var gameModel = {
		message: "hello",
		speed: 0,
		civX: 0.1,
		civY: 0.1,
		civZ: 0.1,
		civW: 0.1,

	};


 	var gui = new dat.GUI();

	var messageCtrl =  gui.add(gameModel, 'message');
	gui.add(gameModel, 'civX');
	gui.add(gameModel, 'civY');
	gui.add(gameModel, 'civZ');
	gui.add(gameModel, 'civW');


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
	var getNDCFromMouseEvent = function(canvas, evt) {
		var coords = canvas.relMouseCoords(evt);
		return new THREE.Vector2(coords.x/screenW, (screenH - coords.y)/screenH);
	}

	var lastMouseNDC = new THREE.Vector2();
	var autoFireCounter = 0;
	var autoFireOn = 1;
	var pollAutoFire = function() {
		
		if (autoFireOn) {
			if (autoFireCounter == 0) {
				var clickedPoint = intersectClick(lastMouseNDC);
				fireShotAt(gameW*(clickedPoint.x+1)/2, gameH*(clickedPoint.y+1)/2);	

				autoFireCounter = 3;
			}
			else {
				autoFireCounter--;
			}
		}
	}

	// TODO: should get normaliyed coords!
	var intersectClick = function(clickedNDC) {

		var x = clickedNDC.x*screenW;
		var y = clickedNDC.y*screenH;

		var invP = new THREE.Matrix4();
		invP.getInverse(projectionMatrix);

		var invMV = new THREE.Matrix4();
		invMV.getInverse(viewMatrix);

		var planeNormal = new THREE.Vector4(0, 0, -1, 0);
		var planePoint = new THREE.Vector4(0, 0, 0, 1);

		var sf = Math.sin(cameraAngle/2)/Math.cos(cameraAngle/2);
		var lineDir = new THREE.Vector4(sf*(2*x/screenW - 1), sf*(2*y/screenH - 1), -1, 0);
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

		for (var i in gui.__controllers) {
			gui.__controllers[i].updateDisplay();
		}

		return deltaPoint;
	}
	var fireShotAt = function(tx, ty) {
		// spawn shot
		var dX = tx-shipX;
		var dY = ty-shipY;
		var dL = Math.sqrt(dX*dX+dY*dY);
		var sX = shotSpeed * dX/dL;
		var sY = shotSpeed * dY/dL;

		var aa = 0.07;
		shots.allocateParticle(shipX, shipY, 1.05*sX, 1.05*sY);
		shots.allocateParticle(shipX, shipY, Math.cos(aa)*sX + Math.sin(aa)*sY, -Math.sin(aa)*sX + Math.cos(aa)*sY);
		aa = -aa;
		shots.allocateParticle(shipX, shipY, Math.cos(aa)*sX + Math.sin(aa)*sY, -Math.sin(aa)*sX + Math.cos(aa)*sY);

		try {
		snd.currentTime=0;
		snd.play();
		}
		catch (ex) {}
	}



	var updateButtons = function() {
		if (renderLoop.pauseRequested) {
			document.getElementById("playPause").children[0].className = "fa fa-play fa-2x";
		}
		else {
			document.getElementById("playPause").children[0].className = "fa fa-pause fa-2x";
		}
	}
	var setupGui = function() {
		document.getElementById("stepLink").addEventListener('click', function(evt) {
			renderLoop.step();
		}, false);

		document.getElementById("playPause").addEventListener('click', function(evt) {
			renderLoop.toggle();
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
					enemyRule = reactor.compileRule(rulesModelData[idxxxx].ruleData, enemyDish);
				})
		}, false);

//		$( "#toolsMenu" ).hide();

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
			var coords = canvas.relMouseCoords(evt);
			var x = coords.x;
			var y = screenH - coords.y;

			var activeTool = $( "#toolsMenu" ).accordion( "option", "active" );

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
							reactor.mixDish(drawCircleShader, dish, {center: [x, y], radius: drawModel.attributes.drawSizeX/2, state: state/255.});
						}
						else {
							reactor.mixDish(drawRectShader, dish, {rectPos: [x, y], rectSize: [drawModel.attributes.drawSizeX, drawModel.attributes.drawSizeY], state: state/255.});
						}
					}
				
			}
			else if (activeTool != 1) { // || mouseMode == "shoot") {
				var clickedNDC = getNDCFromMouseEvent(canvas, evt);	
				var clickedPoint = intersectClick(clickedNDC);
				fireShotAt(gameW*(clickedPoint.x+1)/2, gameH*(clickedPoint.y+1)/2);		
			}	
			else if (mouseMode == "copy") {
				reactor.mixDish(copyShader, bufferDish, {
					destinationPos: [0, 0], destinationSize: [bufferDish.width, bufferDish.height],
					texSource: enemyDish, sourcePos: [x-bufferDish.width/2, y-bufferDish.height/2], sourceRes: [gameW, gameH], 	
					}); 
			}		
			else if (mouseMode == "paste") {
				reactor.mixDish(copyShader, enemyDish, {
						destinationPos: [x-bufferDish.width/2, y-bufferDish.height/2], destinationSize: [bufferDish.width, bufferDish.height],
						texSource: bufferDish, sourcePos: [0, 0], sourceRes: [bufferDish.width, bufferDish.height], 	
						}); 
			}		
			
			evt.preventDefault();
			evt.stopPropagation();
		}
		canvas.addEventListener('mousedown', handleCanvasMouseDown, false);

		var handleCanvasMouseMove = function(evt)
		{
			lastMouseNDC = getNDCFromMouseEvent(canvas, evt);	
		}
		canvas.addEventListener('mousemove', handleCanvasMouseMove, false);

	}

	var loadResources = function(callback) {
		var loader = new EC.ResLoader();
		loader.load("enemyRule", "rules/enemy_ludwigBuildships", "ecfile");
		
		loader.load("enemyRule", "rules/moore5-coolspaceships", "ecfile");
		loader.load("enemyRule", "rules/22C3_mirrorsymetric_gliders-randomwaver", "ecfile");
		
		//loader.load("enemyRule", "rules/enemy_d54_awesomeships", "ecfile");
		loader.load("enemyRule", "rules/enemy_d52_replicator", "ecfile");
		loader.load("enemyRule", "rules/enemy_holeshooter", "ecfile");

//loader.load("enemyRule", "rules/enemy_holeshooter", "ecfile");
//loader.load("enemyRule", "rules/gridworld6", "ecfile");
//loader.load("enemyRule", "rules/enemy_quaderwelt_moreactive", "ecfile");
//loader.load("enemyRule", "rules/enemy_d29", "ecfile");
//loader.load("enemyRule", "rules/enemy_linesLounge_moreactive", "ecfile");
//loader.load("enemyRule", "rules/enemy_linesLounge_moreactive-mutA_mut", "ecfile");
		





		loader.load("enemy2Rule", "rules/enemy_linebuilder", "ecfile");
		loader.load("weaponRule", "rules/ship_avg4_nice", "ecfile");
		loader.load("weaponExplosionRule", "rules/cross4-wave-spaceshipshoot", "ecfile");
		loader.load("shipExplosionRule", "rules/cross4-wave-spaceshipshoot", "ecfile");
		loader.load("shipRule", "rules/ship_avg4_nice", "ecfile");

		// rules/ship_avg4_nice rules/ship_avg4_schweif

		loader.load("vertexPoints", "src/game/shaders/vertexPoints.vshader", "text");
		loader.load("drawAll", "src/game/shaders/drawAll.shader", "text");

		loader.load("clear", "src/game/shaders/clear.shader", "text");
		loader.load("mixPalette", "src/game/shaders/mixPalette.shader", "text");	

		loader.load("drawRect", "src/game/shaders/drawRect.shader", "text");
		loader.load("drawCircle", "src/game/shaders/drawCircle.shader", "text");

		//loader.load("painter", "src/game/shaders/primitiveRenderer.shader", "text");
		loader.load("rendererVertex", "src/game/shaders/scrollingRendererMatrix.vshader", "text");
		loader.load("rendererFragment", "src/game/shaders/scrollingRenderer.shader", "text");

		loader.load("intersectSpawn", "src/game/shaders/intersectSpawn.shader", "text");

		loader.load("copyPaste", "src/game/shaders/copyPasteRect.shader", "text");

		loader.start(callback);
	}


		
	var setupGame = function (data, canvas) { 
		// Setup core 	
		
		reactor = new  EC.Reactor(canvas, gameW, gameH);
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
				sndHit.playbackRate = 3.5;
				//sndHit.volume = 0.2;
				sndHit.currentTime=0;
				sndHit.play();
			}

			shots.collide(enemyDish, cb);
			shots.step();
			shots.collide(enemyDish, function(pos) {
				cb();
				//sndHit2.currentTime=0;
				//sndHit2.play();
			});
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
			reactor.mixDish(mixShader, renderDish, {texNew: shipDish, texPalette: shipColors.getTexture()});
			reactor.mixDish(mixShader, renderDish, {texNew: weaponDish, texPalette: weaponColors.getTexture()});
			reactor.mixDish(mixShader, renderDish, {texNew: weaponExplosionDish, texPalette: shipExplosionColors.getTexture()});
			reactor.mixDish(mixShader, renderDish, {texNew: shipExplosionDish, texPalette: shipExplosionColors.getTexture()});
			
			//reactor.mixDish(mixShader, renderDish, {texNew: copyDish, texPalette: copyColors.getTexture()});		

			//var pixel = 2 + Math.sin(0.05*shipX);
			


			if (keyboard.isPressed("O".charCodeAt()))
			{
				pixel -= 0.1;
			}

			if (keyboard.isPressed("L".charCodeAt()))
			{
				pixel += 0.1;
			}

			if (keyboard.isPressed("N".charCodeAt()))
			{
				rot += 0.05;
			}

			if (keyboard.isPressed("M".charCodeAt()))
			{
				rot -= 0.05;
			}

			
			//shipX += 0.7;

			//shipX = (gameW/2) + (shipX-gameW/2) % 70;
			//shipY = (gameH/2) + (shipY-gameH/2) % 70;

			//console.log(shipX);


			var ff = pixel/zoom;


			var camCenter = [shipX, shipY];
			/////

			var transX = -0.5/ff + shipX/enemyDish.width;
			var transY = -0.5/ff + shipY/enemyDish.height;

			var offsetX = (transX*enemyDish.width*pixel + 1/(2*pixel))%pixel;
			var offsetY = (transY*enemyDish.height*pixel  + 1/(2*pixel))%pixel;

			var centerX = ff*shipX/enemyDish.width;
			var centerY = ff*shipY/enemyDish.height;
			//RENDER
			/*			
			reactor.applyShader(scrollingRenderShader, null, null, function(gl, shader) {
				gl.uniform1f(gl.getUniformLocation(shader, "gridS"), ff*zoom);
				gl.uniform2f(gl.getUniformLocation(shader, "gridOffset"), 
					(pixel*transX*enemyDish.width)%(pixel), pixel*transY*enemyDish.height);


				gl.uniform2f(gl.getUniformLocation(shader, "translate"), transX, transY);
				gl.uniform2f(gl.getUniformLocation(shader, "scale"), 1/ff, 1/ff);
			});*/

			//console.log(pixel, offsetX, offsetY);

			var camera = new THREE.PerspectiveCamera( 180*cameraAngle/Math.PI, 1, 0.01, 1000 );
			camera.lookAt(new THREE.Vector3( 0, 0, 0 ));
			projectionMatrix = camera.projectionMatrix;
			//projectionMatrix = new THREE.Matrix4();


			viewMatrix = new THREE.Matrix4();
			var quaternion = new THREE.Quaternion();
			quaternion.setFromAxisAngle( new THREE.Vector3( 0, 0.5, 1 ).normalize(), rot );
			viewMatrix.compose(new THREE.Vector3(0, 0, -1), quaternion, 
				new THREE.Vector3(1,1,1)
				//new THREE.Vector3(1/enemyDish.width,1/enemyDish.height,1)
			);

			reactor.paintDish(scrollingRenderShader, renderDish, function(gl, shader) {
				gl.uniform1f(gl.getUniformLocation(shader, "gridS"), pixel);
				gl.uniform2f(gl.getUniformLocation(shader, "gridOffset"), offsetX, offsetY);
				gl.uniform2f(gl.getUniformLocation(shader, "translate"), transX, transY);
				gl.uniform2f(gl.getUniformLocation(shader, "center"), centerX, centerY);


				gl.uniformMatrix4fv(gl.getUniformLocation(shader, "projectionMatrix"), false, projectionMatrix.elements);
				gl.uniformMatrix4fv(gl.getUniformLocation(shader, "modelViewMatrix"), false, viewMatrix.elements);

				//gl.uniform2f(gl.getUniformLocation(shader, "center"), ff*0.5, ff*0.5);
				//gl.uniform2f(gl.getUniformLocation(shader, "center"), 0.999	, 0.999);


				// 0.5 -> 49
				// 0 -? 0


				//console.log(shipX, shipY);

				gl.uniform2f(gl.getUniformLocation(shader, "scale"), 1/ff, 1/ff);

				gl.uniform1f(gl.getUniformLocation(shader, "rot"), rot);
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

				sndInit.currentTime=0;
				sndInit.play();
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

			if (keyboard.isPressed(65+1)) {
				if (!game.bombFired && wk) {
					//game.bombFired = 1;

					//wk--;

					
					//bAngle = 0;
					
					for (var i = 0; i < shotN; i++)
					{
						bAngle += Math.PI * 2 / 1.61803398875;
						shots.allocateSphere(1, shipX, shipY, shotSpeed, bAngle);
					}
					sndBomb.currentTime=0;
					sndBomb.play();

					
//					bAngle += game.bAD || Math.E/Math.PI; ///*-0.76599; */ 0.44301;
				}
			}
			else {
				wk = wellen;
				game.bombFired = 0;
			}

			if (keyboard.isPressed("T".charCodeAt())) {
				if (game.bAD) 
					game.bAD += 0.001;
				else
					game.bAD = 0.00001;
				//document.getElementById("bAngleMonitor").innerHTML = "" + game.bAD;
			}

			if (keyboard.isPressed("R".charCodeAt())) {
				if (game.bAD) 
					game.bAD -= 0.001;
				else
					game.bAD = 0.00001;
				//document.getElementById("bAngleMonitor").innerHTML = "" + game.bAD;
			}

			if (keyboard.isPressed("T".charCodeAt()) || keyboard.isPressed("R".charCodeAt())) {
				//document.getElementById("bAngleMonitor").innerHTML = "" + game.bAD + " " + ((2*Math.PI)/game.bAD) + ":" + Math.E/Math.PI;
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
					var py = (shipY/gameH)*2. - 1.
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

	var canvas = document.getElementById('c');

	loadResources(function (data) {
		setupGame(data, canvas);
		setupGui();
		renderLoop = new utils.AnimationLoop(function() {
			userInteraction();
			gameLoop();
		});
		renderLoop.start();
	});
});
