require.config({
   // baseUrl: 'js/lib',
    paths: {
		jquery: 'libs/jquery-1.10.2',
		"jquery-ui": 'libs/jquery-ui-1.10.4.custom',
		"underscore": "libs/underscore",
		backbone: "libs/backbone",
		knockback: "libs/knockback",
		knockout: "libs/knockout-3.0.0",
    },
	shim: {
        "jquery-ui": {
            exports: "$",
            deps: ['jquery', 'libs/farbtastic']
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
    }
});

require([
	"jquery-ui", "Utils", "CellSpaceResources", "EvoCell", "underscore", "backbone", "knockback", "knockout"], 
	function($, utils, resources, EC, _, Backbone, kb, ko) {

	var canvas;
	var reactor;
	var gl;		

	var enemyDish, enemy2Dish, shipDish, shipExplosionDish, copyDish, bufferDish, renderDish
	var shots;
	var drawPointsShader, clearShader, paintShader, drawRectShader, drawCircleShader, mixShader, intersectSpawnShader, copyShader;
	var enemyRule, enemy2Rule, shipRule, weaponRule, shipExplosionRule;
	var enemyColors, enemy2Colors, shipColors, shipExplosionColors, copyColors;

	var keyboard = utils.keyboard;
	var gameW = 256, gameH = 256;
	gameW = 430, gameH = 230;

	var shipX, shipY;
	var shotSpeed = 2.9;
	var zoom = 3;
	var maxParticles = 1000;
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



	drawModel = new Backbone.Model({
		availableLayers: ["enemy", "enemy2", "ship", "shipExplosion"],
		availableStates: [0, 1, 2, 3],

		drawSizeX: 50,
		drawSizeY: 30,
		selectedDrawShape : "rectangle",
		selectedStates : [3],
		selectedLayers : ["ship"],
	});

	var view_model = kb.viewModel(drawModel);
	//view_model.full_name = ko.computed((->return "#{@first_name()} #{@last_name()}"), view_model)
	ko.applyBindings(view_model, document.getElementById("drawTool"));


	var setupGui = function() {

		$( "#toolsMenu" ).accordion({
		collapsible: true,
		heightStyle: "content",
		animate: false,
		active: 1,
		}).draggable();

		//$('#colorpicker1').farbtastic('#color1');
		$( "#menu" ).menu();
		
		fpsMonotor = new utils.FPSMonitor("fpsMonitor");

		function handleCanvasMouseDown(evt) {
			var coords = canvas.relMouseCoords(evt);
			var x = coords.x;
			var y = coords.y;

			x /= zoom;
			y /= zoom;
			y = gameH-y;

			var activeTool = $( "#toolsMenu" ).accordion( "option", "active" );

			if (activeTool == 1) {
				
					var dish;
					if (drawModel.attributes.selectedLayers.indexOf("enemy") >= 0) dish = enemyDish;
					else if (drawModel.attributes.selectedLayers.indexOf("enemy2") >= 0) dish = enemy2Dish;
					else if (drawModel.attributes.selectedLayers.indexOf("ship") >= 0) dish = shipDish;
					else if (drawModel.attributes.selectedLayers.indexOf("shipExplosion") >= 0) dish = shipExplosionDish;

					var state = 3;
					var firstSel = drawModel.attributes.selectedStates[0];
					if (firstSel) state = firstSel;

					if (dish) {
						if (drawModel.attributes.selectedDrawShape == "circle")
						{
							alert(drawModel.attributes.drawSizeX/2);
							reactor.mixDish(drawCircleShader, dish, {center: [x, y], radius: drawModel.attributes.drawSizeX/2, state: state/255.});
						}
						else
							reactor.mixDish(drawRectShader, dish, {rectPos: [x, y], rectSize: [drawModel.attributes.drawSizeX, drawModel.attributes.drawSizeY], state: state/255.});
					}
				
			}
			else if (mouseMode == "shoot") {
				// spawn shot
				var dX = x-shipX;
				var dY = y-shipY;
				var dL = Math.sqrt(dX*dX+dY*dY);
				var sX = shotSpeed * dX/dL;
				var sY = shotSpeed * dY/dL;

				shots.allocateParticle(shipX, shipY, sX, sY);
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
	}

	var loadResources = function(callback) {
		var loader = new EC.ResLoader();
		loader.load("enemyRule", "rules/enemy_ludwigBuildships", "ecfile");
		//loader.load("enemyRule", "rules/enemy_linebuilder", "ecfile");
		loader.load("enemy2Rule", "rules/enemy_linebuilder", "ecfile");
		loader.load("weaponRule", "rules/ship_avg4_schweif", "ecfile");
		loader.load("weaponExplosionRule", "rules/ship_avg4_schweif", "ecfile");
		loader.load("shipExplosionRule", "rules/ship_avg4_nice", "ecfile");
		loader.load("shipRule", "rules/ship_avg4_nice", "ecfile");

		loader.load("vertexPoints", "src/game/shaders/vertexPoints.vshader", "text");
		loader.load("drawAll", "src/game/shaders/drawAll.shader", "text");

		loader.load("clear", "src/game/shaders/clear.shader", "text");
		loader.load("mixPalette", "src/game/shaders/mixPalette.shader", "text");	

		loader.load("drawRect", "src/game/shaders/drawRect.shader", "text");
		loader.load("drawCircle", "src/game/shaders/drawCircle.shader", "text");

		loader.load("painter", "src/game/shaders/primitiveRenderer.shader", "text");
		loader.load("intersectSpawn", "src/game/shaders/intersectSpawn.shader", "text");

		loader.load("copyPaste", "src/game/shaders/copyPasteRect.shader", "text");

		loader.start(callback);
	}


		
	var setupGame = function (data) { 
		// Setup core 	
		canvas = document.getElementById('c');
		reactor = new  EC.Reactor(canvas, gameW, gameH);
		reactor.setRenderSize(gameW*zoom, gameH*zoom);
		gl = reactor.gl;		

		enemyDish = reactor.compileDish();
		enemy2Dish = reactor.compileDish();
		shipDish = reactor.compileDish();
		shipExplosionDish = reactor.compileDish();
		copyDish = reactor.compileDish();
		bufferDish = reactor.compileDish(64, 64);
		renderDish = reactor.compileDish();

		shots = new EC.ParticleSystem(reactor, maxParticles, gameW, gameH);

		drawPointsShader = reactor.compileShader(data.vertexPoints, data.drawAll);
		
		clearShader = reactor.compileShader(data.clear);
		paintShader = reactor.compileShader(data.painter);

		drawRectShader = reactor.compileShader(data.drawRect);
		drawCircleShader = reactor.compileShader(data.drawCircle);

		mixShader = reactor.compileShader(data.mixPalette);
		intersectSpawnShader = reactor.compileShader(data.intersectSpawn);
		copyShader = reactor.compileShader(data.copyPaste);

		enemyRule = reactor.compileRule(data.enemyRule, enemyDish);
		enemy2Rule = reactor.compileRule(data.enemy2Rule, enemy2Dish);
		shipRule = reactor.compileRule(data.shipRule, shipDish);
		weaponRule = reactor.compileRule(data.weaponRule, enemyDish);
		shipExplosionRule = reactor.compileRule(data.shipExplosionRule, enemy2Dish);
		
		enemyColors = new EC.Palette(reactor);
		enemyColors.setColor(0, [0, 0, 0, 255]);
		enemyColors.setColor(1, [140, 10, 140, 255]);
		enemyColors.setColor(2, [255, 255, 255, 255]);
		enemyColors.setColor(3, [255, 30, 255, 255]);

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
			reactor.step(shipExplosionRule, shipExplosionDish);
			reactor.step(shipRule, shipDish);

			// "DRAW" SHIP
			reactor.mixDish(drawCircleShader, shipDish, {center: [shipX, shipY], radius: 3.5, state: (shipRule.nrStates-1)/255});

			shots.step();
			shots.collide(enemyDish);
			shots.draw(drawPointsShader, shipDish);

			// Dish INTERACTION ///////////////////////////////////
			reactor.mixDish(intersectSpawnShader, shipExplosionDish, {tex1: shipDish, tex2: enemyDish, state: (shipExplosionRule.nrStates-1)/255.});
			reactor.mixDish(intersectSpawnShader, shipExplosionDish, {tex1: enemyDish, tex2: shipExplosionDish, state: 3./255.});
			reactor.mixDish(intersectSpawnShader, enemyDish, {tex1: enemyDish, tex2: shipExplosionDish, state: 0./255.});
			reactor.mixDish(intersectSpawnShader, shipDish, {tex1: shipDish, tex2: shipExplosionDish, state: 3./255.});	

			// COMPOSE ////////////////////////////////////////////
			reactor.applyShaderOnDish(clearShader, renderDish);
			reactor.mixDish(mixShader, renderDish, {texNew: enemy2Dish, texPalette: enemy2Colors.getTexture()});
			reactor.mixDish(mixShader, renderDish, {texNew: enemyDish, texPalette: enemyColors.getTexture()});
			reactor.mixDish(mixShader, renderDish, {texNew: shipDish, texPalette: shipColors.getTexture()});
			reactor.mixDish(mixShader, renderDish, {texNew: shipExplosionDish, texPalette: shipExplosionColors.getTexture()});
			
			reactor.mixDish(mixShader, renderDish, {texNew: copyDish, texPalette: copyColors.getTexture()});		

			//RENDER			
			reactor.paintDish(paintShader, renderDish, function(gl, shader) {
				gl.uniform1f(gl.getUniformLocation(shader, "scale"), zoom);
			});

			cnt++;
			fpsMonotor.frameIncrease();
	};

	var userInteraction = function() {
	// USER INPUT Poll Keyboard //////////////////////////////////////////////////
			var stepSize = 1.5;
			if (keyboard.isPressed(keyboard.UP)) shipY += stepSize;
			if (keyboard.isPressed(keyboard.DOWN)) shipY -= stepSize;
			if (keyboard.isPressed(keyboard.LEFT)) shipX -= stepSize;
			if (keyboard.isPressed(keyboard.RIGHT)) shipX += stepSize
			
			// space
			if (keyboard.isPressed(32)) {
				enemyDish.randomize(enemyRule.nrStates, 0.08);
				enemy2Dish.randomize(enemyRule.nrStates, 0.01);
				if (shipX < 0 || shipX > gameW || shipY < 0 || shipY > gameH)
					shipX = gameW/2, shipY = gameH/2;
			}

			if (keyboard.isPressed(27))
			{
				enemyDish.setAll(0);
				alert(drawModel.selectedLayers() + " : " + drawModel.selectedDrawShape);
			}

			if (keyboard.isPressed(65+1)) {
				if (!game.bombFired) {
					//game.bombFired = 1;
					shots.allocateSphere(10, shipX, shipY, shotSpeed, bAngle);
					bAngle += game.bAD || Math.E/Math.PI; ///*-0.76599; */ 0.44301;
				}
			}
			else {
				game.bombFired = 0;
			}

			if (keyboard.isPressed("T".charCodeAt())) {
				if (game.bAD) 
					game.bAD += 0.001;
				else
					game.bAD = 0.00001;
				document.getElementById("bAngleMonitor").innerHTML = "" + game.bAD;
			}

			if (keyboard.isPressed("R".charCodeAt())) {
				if (game.bAD) 
					game.bAD -= 0.001;
				else
					game.bAD = 0.00001;
				document.getElementById("bAngleMonitor").innerHTML = "" + game.bAD;
			}

			if (keyboard.isPressed("T".charCodeAt()) || keyboard.isPressed("R".charCodeAt())) {
				document.getElementById("bAngleMonitor").innerHTML = "" + game.bAD + " " + ((2*Math.PI)/game.bAD) + ":" + Math.E/Math.PI;
			}
			
			// copy paste stuff
			if (keyboard.isPressed(65+7))
			{

				reactor.mixDish(copyShader, bufferDish, {
					destinationPos: [0, 0], destinationSize: [bufferDish.width, bufferDish.height],
					texSource: enemy2Dish, sourcePos: [5, 10], sourceRes: [gameW, gameH], 	
					}); 


				var pixelValues2 = new Uint8Array(10*10*4);

				gl.bindFramebuffer(gl.FRAMEBUFFER, bufferDish.getCurrentFramebuffer());
				gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bufferDish.getCurrentTexture(), 0);
				var xyz = gl.readPixels(0, 0, 10, 10, gl.RGBA, gl.UNSIGNED_BYTE, pixelValues2);

				//var pattern = bufferDish.saveAsECFile();
				//var ruleAsBlob = data.enemyRule.saveToBlob();
				//utils.saveAs(ruleAsBlob, "ecPattern");

				reactor.mixDish(copyShader, copyDish, {
					destinationPos: [120, 100], destinationSize: [bufferDish.width, bufferDish.height],
					texSource: bufferDish, sourcePos: [0, 0], sourceRes: [bufferDish.width, bufferDish.height], 	
					}); 


				reactor.mixDish(copyShader, copyDish, {
					destinationPos: [20, 20], destinationSize: [80, 40],
					texSource: enemy2Dish, sourcePos: [0, 0], sourceRes: [gameW, gameH], 
					}); 
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
					var sX = 2*shotSpeed/gameW;
					var sY = 2*shotSpeed/gameH; 

					allocateParticle(px, py, sDX*sX, sDY*sY);
				}
				else 
					shotDelay--;
			}
			else
				shotDelay = 0;
		};

	// game must be less than 20 LOC :
	// MAIN GAME LOOP
	loadResources(function (data) {
		setupGame(data);
		setupGui();
		var renderLoop = new utils.AnimationLoop(function() {
			userInteraction();
			gameLoop();
		});
		renderLoop.start();
	});
});
