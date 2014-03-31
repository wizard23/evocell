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
	"backbone", "knockback", "knockout", "data/FileStore", "three", "datgui", 
	"CellSpace.State", "CellSpace.Setup", "CellSpace.Utils"], 
function($, utils, EC, storyTeller,_ , Backbone, kb, ko, fileStore, THREE, dat, gameState, csSetup, csUtils) {
	"use strict";

	var OP_REPLACE = 0;
	var OP_ADD = 1;


	var setupGui = function() {
		document.getElementById("stepLink").addEventListener('click', function(evt) {
			csUtils.gameStep();
		}, false);

		document.getElementById("playPause").addEventListener('click', function(evt) {
			csUtils.gamePlayPause();
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
		csUtils.refreshGUI();
		// end of ugly hack 

		folder.add(gameState, 'frontShots', 1, 12).step(1);
		folder.add(gameState, 'frontShotAngle', 0, 2*Math.PI);

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


		$('#colorpicker1').farbtastic('#color1');
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
				utils.playSound(gameState.sndHit);
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
				csUtils.refreshGUI();
				//storyTeller.RunDeath();
			}

			// did we just die?
			if (gameState.playerEnergy < 0) {
				gameState.renderLoop.stop();
				
				storyTeller.RunDeath(function() {
					gameState.playerEnergy = 200;
					csUtils.resetGame();
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


		if (gameState.enableScrolling) {
			var deltaX = Math.round(gameState.gameW/2 - gameState.shipX);
			var deltaY = Math.round(gameState.gameH/2 - gameState.shipY);
			if (deltaX || deltaY) {
				gameState.shipX  += deltaX;
				gameState.shipY  += deltaY;

				gameState.scrollX  += deltaX;
				gameState.scrollY  += deltaY;

				csUtils.refreshGUI();

				var dX = -deltaX/gameState.gameW;
				var dY = -deltaY/gameState.gameH;
				reactor.mixDish(gameState.shaders.scroll, gameState.dishes.ship, 
					{scroll: [dX, dY]});		

				reactor.mixDish(gameState.shaders.scroll, gameState.dishes.shipExplosion, 
					{scroll: [dX, dY]});

				reactor.mixDish(gameState.shaders.scroll, gameState.dishes.enemy, 
					{scroll: [dX, dY]});				

				//reactor.mixDish(gameState.shaders.scroll, gameState.dishes.enemy2, 
				//	{scroll: [dX, dY]});

				reactor.mixDish(gameState.shaders.scroll, gameState.dishes.weapon, 
					{scroll: [dX, dY]});

				reactor.mixDish(gameState.shaders.scroll, gameState.dishes.weaponExplosion, 
					{scroll: [dX, dY]});	
			}		
		}
		



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
		else if (keyboard.isPressed("X".charCodeAt()))
		{
			if (once) {
				once=0;
				csUtils.gamePlayPause();
			}
		}
		else
			once = 1;	


		if (keyboard.isPressed("O".charCodeAt()))
		{
			gameState.zoom -= 0.03;
			csUtils.refreshGUI();
		}

		if (keyboard.isPressed("L".charCodeAt()))
		{
			gameState.zoom += 0.03;
			csUtils.refreshGUI();
		}

		if (keyboard.isPressed("N".charCodeAt()))
		{
			gameState.rot += 0.05;
			csUtils.refreshGUI();
		}

		if (keyboard.isPressed("M".charCodeAt()))
		{
			gameState.rot -= 0.05;
			csUtils.refreshGUI();
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

/*
		if (keyboard.isPressed(keyboard.UP)) gameState.shipY += gameState.stepSize;
		if (keyboard.isPressed(keyboard.DOWN)) gameState.shipY -= gameState.stepSize;
		if (keyboard.isPressed(keyboard.LEFT)) gameState.shipX -= gameState.stepSize;
		if (keyboard.isPressed(keyboard.RIGHT)) gameState.shipX += gameState.stepSize;
*/
		// space
		if (keyboard.isPressed(32)) {
			csUtils.resetGame();
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

		if (keyboard.isPressed("B".charCodeAt()) || gameState.cnt < 12) {
			if (!gameState.bombFired) {
				//gameState.bombFired = 1; // allow permanent fire for now
				for (var i = 0; i < gameState.shotN; i++)
				{
					gameState.bAngle += Math.PI * 2 / 1.61803398875;
					gameState.shots.allocateSphere(1, gameState.shipX, gameState.shipY, gameState.shotSpeed, gameState.bAngle);
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

	// game must be less than 20 LOC :
	// MAIN GAME LOOP

	// TODO: should we not put this in backbone ready function?
	// is jquery redy better?
	//$(window).load(function(e) { 
		var canvas = document.getElementById('c');

		csSetup.setup(canvas, function () {
			setupGui();
			gameState.renderLoop = new utils.AnimationLoop(function() {
				userInteraction();
				gameLoop();
			});
			gameState.renderLoop.start();
		});
	//});
});
