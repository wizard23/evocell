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
		"jquery-cycle":"libs/jquery.cycle.all",
	},
	shim: {
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
				exports: "meSpeak"
			}
    }
});

require([
	"jquery-ui", "Utils", "CellSpaceResources", "EvoCell", "story/StoryTeller", "underscore", "backbone", "knockback", "knockout", "data/FileStore"], 
	function($, utils, resources, EC, storyTeller,_ , Backbone, kb, ko, fileStore) {

	var canvas;
	var reactor;
	var gl;		

	var enemyDish, enemy2Dish, shipDish, shipExplosionDish, copyDish, bufferDish, renderDish
	var shots;
	var drawPointsShader, clearShader, scrollingRenderShader, drawRectShader, drawCircleShader, mixShader, intersectSpawnShader, copyShader;
	var enemyRule, enemy2Rule, shipRule, weaponRule, shipExplosionRule;
	var enemyColors, enemy2Colors, shipColors, shipExplosionColors, copyColors;

	var keyboard = utils.keyboard;
	var gameW = 256, gameH = 256;
	gameW = 300, gameH = 300;
		var zoom = 3;

		var zoomF = 1;
		var gridOffsetX=0, gridOffsetY=0;
		var zoomFX = 1, zoomFY = 1;
		var pixel = 4;
		var pixX = 0;



		var shotN = 8;


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
	var shotSpeed = 2.7;

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

	var snd = new Audio("sound/Digital_SFX_Set/laser4.mp3"); // buffers automatically when created


	var gameModel


	var drawModel = new Backbone.Model({
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
		}).draggable();

		$('#colorpicker1').farbtastic('#color1');
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
						if (drawModel.attributes.selectedDrawShape == "circle") {
							reactor.mixDish(drawCircleShader, dish, {center: [x, y], radius: drawModel.attributes.drawSizeX/2, state: state/255.});
						}
						else {
							reactor.mixDish(drawRectShader, dish, {rectPos: [x, y], rectSize: [drawModel.attributes.drawSizeX, drawModel.attributes.drawSizeY], state: state/255.});
						}
					}
				
			}
			else if (activeTool != 1) { // || mouseMode == "shoot") {
				// spawn shot
				var dX = x-shipX;
				var dY = y-shipY;
				var dL = Math.sqrt(dX*dX+dY*dY);
				var sX = shotSpeed * dX/dL;
				var sY = shotSpeed * dY/dL;

				var aa = 0.07;
				shots.allocateParticle(shipX, shipY, 1.1*sX, 1.1*sY);
				shots.allocateParticle(shipX, shipY, Math.cos(aa)*sX + Math.sin(aa)*sY, -Math.sin(aa)*sX + Math.cos(aa)*sY);
				aa = -aa;
				shots.allocateParticle(shipX, shipY, Math.cos(aa)*sX + Math.sin(aa)*sY, -Math.sin(aa)*sX + Math.cos(aa)*sY);
		
				snd.currentTime=0;
				snd.play();
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
		//loader.load("enemyRule", "rules/enemy_ludwigBuildships_lessActive", "ecfile");
		loader.load("enemyRule", "rules/enemy_d54_awesomeships", "ecfile");
		//loader.load("enemyRule", "rules/enemy_d52_replicator", "ecfile");
		//loader.load("enemyRule", "rules/enemy_holeshooter", "ecfile");

//loader.load("enemyRule", "rules/enemy_holeshooter", "ecfile");
//loader.load("enemyRule", "rules/gridworld6", "ecfile");
//loader.load("enemyRule", "rules/enemy_quaderwelt_moreactive", "ecfile");
//loader.load("enemyRule", "rules/enemy_d29", "ecfile");
//loader.load("enemyRule", "rules/enemy_linesLounge_moreactive", "ecfile");
//loader.load("enemyRule", "rules/enemy_linesLounge_moreactive-mutA_mut", "ecfile");
		





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

		//loader.load("painter", "src/game/shaders/primitiveRenderer.shader", "text");
		loader.load("rendererVertex", "src/game/shaders/scrollingRenderer.vshader", "text");
		loader.load("rendererFragment", "src/game/shaders/scrollingRenderer.shader", "text");

		loader.load("intersectSpawn", "src/game/shaders/intersectSpawn.shader", "text");

		loader.load("copyPaste", "src/game/shaders/copyPasteRect.shader", "text");

		loader.start(callback);
	}


		
	var setupGame = function (data, canvas) { 
		// Setup core 	
		
		reactor = new  EC.Reactor(canvas, gameW, gameH);
		reactor.setRenderSize(zoom*gameW, zoom*gameH);
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
		
		enemyColors = new EC.Palette(reactor);
		enemyColors.setColor(0, [0, 0, 0, 255]);
		enemyColors.setColor(1, [140, 10, 140, 255]);
		enemyColors.setColor(2, [255, 255, 255, 255]);
		enemyColors.setColor(3, [255, 30, 255, 255]);

		enemyColors = new EC.Palette(reactor, [
			[0, 0, 0, 255],
			[0, 120, 0, 255],
			[0, 255, 0, 255],
			[120, 255, 0, 255],
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
			reactor.step(shipExplosionRule, shipExplosionDish);
			reactor.step(shipRule, shipDish);

			// "DRAW" SHIP
			reactor.mixDish(drawCircleShader, shipDish, {center: [shipX, shipY], radius: 3.5, state: (shipRule.nrStates-1)/255});

			shots.collide(enemyDish);
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

			var ff = pixel/zoom;


			shipX += 0.7;

			//scrollX += 0.0008;
			//scrollY += Math.sin(40*scrollX)*0.0006;

			shipX = (gameW/2) + (shipX-gameW/2) % 50;
			shipY = (gameH/2) + (shipY-gameH/2) % 50;

			//console.log(shipX);

			scrollX = -0.5/ff + shipX/enemyDish.width;
			scrollY = -0.5/ff + shipY/enemyDish.height;




			//RENDER
			/*			
			reactor.applyShader(scrollingRenderShader, null, null, function(gl, shader) {
				gl.uniform1f(gl.getUniformLocation(shader, "gridS"), ff*zoom);
				gl.uniform2f(gl.getUniformLocation(shader, "gridOffset"), 
					(pixel*scrollX*enemyDish.width)%(pixel), pixel*scrollY*enemyDish.height);


				gl.uniform2f(gl.getUniformLocation(shader, "translate"), scrollX, scrollY);
				gl.uniform2f(gl.getUniformLocation(shader, "scale"), 1/ff, 1/ff);
			});*/


			var modXX = (scrollX*enemyDish.width*pixel + 1/(2*pixel))%pixel;
			var modYY = (scrollY*enemyDish.height*pixel  + 1/(2*pixel))%pixel;
			console.log(pixel, modXX, modYY);
			reactor.paintDish(scrollingRenderShader, renderDish, function(gl, shader) {
				gl.uniform1f(gl.getUniformLocation(shader, "gridS"), pixel);
				gl.uniform2f(gl.getUniformLocation(shader, "gridOffset"), 
					modXX, 
					modYY
					);


				gl.uniform2f(gl.getUniformLocation(shader, "translate"), scrollX, scrollY);
				gl.uniform2f(gl.getUniformLocation(shader, "scale"), 1/ff, 1/ff);
			});

			cnt++;
			fpsMonotor.frameIncrease();
	};

	var userInteraction = function() {
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

			if (keyboard.isPressed(65+1)) {
				if (!game.bombFired && wk) {
					//game.bombFired = 1;

					wk--;

					
					
					
					bAngle += bADelta;
					shots.allocateSphere(shotN, shipX, shipY, shotSpeed, bAngle);

					
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
		var renderLoop = new utils.AnimationLoop(function() {
			userInteraction();
			gameLoop();
		});
		renderLoop.start();
	});
});
