define(["Utils", "data/FileStore", "EvoCell", "CellSpace/State", "CellSpace/Utils", "GLOBALS"],
	function(utils, fileStore, EC, gameState, csUtils, GLOBALS) {
	"use strict";

	var initDB = function() {
		// hackinit
		gameState.resFiles = [
			GLOBALS.resPath + "rules/enemy_ludwigBuildships",
			GLOBALS.resPath + "rules/moore5-coolspaceships",
			GLOBALS.resPath + "rules/EvoloopN9",
			GLOBALS.resPath + "rules/GameOfLife",
			GLOBALS.resPath + "patterns/evoloop30.ecpattern",
		];



		var loader = new EC.ResLoader();
		_.each(gameState.resFiles, function(fileURL, fileKey) {
			loader.load("predefinded_" + fileKey, fileURL, "ecfile");
		});
		// read from state rules and patterns to load

		loader.start(true, function(data) {
			// do nothing since we just use the cache
			csUtils.refreshAvailableRules();
		});


	};

	// static
	var setup = function(callback) {

		var loader = new EC.ResLoader();
		
		loader.load("rules.enemy", GLOBALS.resPath + "rules/enemy_ludwigBuildships", "ecfile");
		//loader.load("rules.enemy", GLOBALS.resPath + "rules/enemy_ludwigBuildships_lessActive", "ecfile");
		//loader.load("rules.enemy", GLOBALS.resPath + "rules/enemy_lounge23", "ecfile");
		//loader.load("rules.enemy", GLOBALS.resPath + "rules/enemy_evil", "ecfile");
		//loader.load("rules.enemy", GLOBALS.resPath + "rules/22C3_mirrorsymetric_gliders-randomwaver", "ecfile");
		//loader.load("rules.enemy", "rules/enemy_d54_awesomeships", "ecfile");
		//loader.load("rules.enemy", GLOBALS.resPath + "rules/enemy_d52_replicator", "ecfile");
		//loader.load("rules.enemy", GLOBALS.resPath + "rules/enemy_holeshooter", "ecfile");
		//loader.load("rules.enemy", "rules/enemy_holeshooter", "ecfile");
		//loader.load("rules.enemy", "rules/gridworld6", "ecfile");
		//loader.load("rules.enemy", "rules/enemy_quaderwelt_moreactive", "ecfile");
		//loader.load("rules.enemy", "rules/enemy_d29", "ecfile");
		//loader.load("rules.enemy", "rules/enemy_linesLounge_moreactive", "ecfile");
		//loader.load("rules.enemy", "rules/enemy_linesLounge_moreactive-mutA_mut", "ecfile");
		
		loader.load("rules.background", GLOBALS.resPath + "rules/enemy_linebuilder", "ecfile");
		loader.load("rules.weapon", GLOBALS.resPath + "rules/ship_avg4_nice", "ecfile");
		
		loader.load("rules.weaponExplosion", GLOBALS.resPath + "rules/cross4-wave-spaceshipshoot", "ecfile");
		loader.load("rules.weaponExplosion", GLOBALS.resPath + "rules/moore5-coolspaceships", "ecfile");
		//loader.load("rules.weaponExplosion", GLOBALS.resPath + "rules/explosion_avg2-far2", "ecfile");
		//loader.load("rules.weaponExplosion", GLOBALS.resPath + "rules/ship_avg4_nice", "ecfile");

		
		loader.load("rules.shipExplosion", GLOBALS.resPath + "rules/cross4-wave-spaceshipshoot", "ecfile");
		loader.load("rules.shipExplosion", GLOBALS.resPath + "rules/moore5-coolspaceships", "ecfile");

		loader.load("rules.ship", GLOBALS.resPath + "rules/ship_avg4_nice", "ecfile");
		loader.load("rules.ship", GLOBALS.resPath + "rules/22C3_mirrorsymetric_gliders-randomwaver", "ecfile");


		// rules/ship_avg4_nice rules/ship_avg4_schweif

		loader.load("vertexPoints", "src/shaders/vertexPoints.vshader", "text");
		loader.load("drawAll", "src/shaders/drawAll.shader", "text");

		loader.load("clear", "src/shaders/clear.shader", "text");
		loader.load("mixPalette", "src/shaders/mixPalette.shader", "text");	
		loader.load("mixRect", "src/shaders/mixRect.shader", "text");	
		loader.load("stampPalette", "src/shaders/stampPalette.shader", "text");	

		loader.load("drawRect", "src/shaders/drawRect.shader", "text");
		loader.load("drawCircle", "src/shaders/drawCircle.shader", "text");

		loader.load("scroller", "src/shaders/scroller.shader", "text");

		loader.load("rendererVertex", "src/shaders/cameraRenderer.vshader", "text");
		loader.load("rendererFragmentCell", "src/shaders/cameraRenderer.shader", "text");
		loader.load("rendererFragmentTV", "src/shaders/cameraRendererTV.shader", "text");
		loader.load("rendererFragmentSimple", "src/shaders/cameraRendererSimple.shader", "text");
		loader.load("rendererFragmentFast", "src/shaders/cameraRendererFast.shader", "text");

		loader.load("intersectSpawn", "src/shaders/intersectSpawn.shader", "text");
		loader.load("shieldSpawn", "src/shaders/shieldGenerator.shader", "text");

		loader.load("copyPaste", "src/shaders/copyPasteRect.shader", "text");

		var setupFn = function (data) { 
			// Setup core
			var reactor = gameState.reactor;

			csUtils.onScreenSizeChanged();
			csUtils.onGameSizeChanged();

			gameState.shaders.drawPoints = reactor.compileShader(data.vertexPoints, data.drawAll);
			
			gameState.shaders.clear = reactor.compileShader(data.clear);

			gameState.shaders.cameraRendererCell = reactor.compileShader(data.rendererVertex, data.rendererFragmentCell);
			gameState.shaders.cameraRendererTV = reactor.compileShader(data.rendererVertex, data.rendererFragmentTV);
			gameState.shaders.cameraRendererSimple = reactor.compileShader(data.rendererVertex, data.rendererFragmentSimple);
			gameState.shaders.cameraRendererFast = reactor.compileShader(data.rendererVertex, data.rendererFragmentFast);

			gameState.shaders.drawRect = reactor.compileShader(data.drawRect);
			gameState.shaders.drawCircle = reactor.compileShader(data.drawCircle);

			gameState.shaders.mix = reactor.compileShader(data.mixPalette);
			gameState.shaders.mixRect = reactor.compileShader(data.mixRect);
			gameState.shaders.stamp = reactor.compileShader(data.stampPalette);

			gameState.shaders.intersectSpawn = reactor.compileShader(data.intersectSpawn);
			gameState.shaders.shieldSpawn = reactor.compileShader(data.shieldSpawn);
			gameState.shaders.copy = reactor.compileShader(data.copyPaste);

			gameState.shaders.scroll = reactor.compileShader(data.scroller);

			csUtils.refreshAvailableRules();
			csUtils.refreshAvailableDishes();

			//fileStore.storeRule(data.rules.background);
			//fileStore.loadRule("starwars", function(loadedRule) {
			//	rules.enemy = reactor.compileRule(loadedRule, dishes.enemy);
			//})

			//data.rules.enemy.MakeStarWarsRule()
			//fileStore.storeRule("starwars", data.rules.enemy);

			var rules = gameState.rules;
			rules.enemy = reactor.compileRule(data["rules.enemy"], gameState.dishes.enemy);
			rules.background = reactor.compileRule(data["rules.background"], gameState.dishes.background);
			rules.ship = reactor.compileRule(data["rules.ship"], gameState.dishes.ship);
			rules.weapon = reactor.compileRule(data["rules.weapon"], gameState.dishes.enemy);
			rules.shipExplosion = reactor.compileRule(data["rules.shipExplosion"], gameState.dishes.background);
			rules.weaponExplosion = reactor.compileRule(data["rules.weaponExplosion"], gameState.dishes.background);
			
			gameState.colors.enemy = new EC.Palette(reactor, [
				[0, 0, 0, 0],
				[140, 10, 140, 255],
				[255, 255, 255, 255],
				[255, 30, 255, 255],
				[255, 110, 255, 255]
			]);

			gameState.colors.enemy.generateColors({
				0: [0,0,0,0], 
				1:[140, 0, 140, 255], 
				//2:[255,255,255,255],
				3:[255,30, 255, 255],
				5:[0,255,0,255],
				7:[0,255,255,255],
				9:[255,255,0,255],
			});

			/*gameState.colors.enemy.generateColors({
				0: [0,0,0,0], 
				1:[255,0,0,255], 
				4:[255,255,0,255],
				7:[0,255,255,255],
				10:[255,255,255,255],
			});
*/

			var weaponV = 100;
			gameState.colors.weapon = new EC.Palette(reactor, [
				[0, 0, 0, 0],
				[0, 120, 0, weaponV],
				[0, 255, 0, weaponV],
				[120, 255, 0, weaponV],
				[200, 255, 0, weaponV],
			]);

			var shipExplosionV = 210;
			gameState.colors.shipExplosion = new EC.Palette(reactor, [
				[60, 60, 90, 0],
				[23, 108, 126, shipExplosionV],
				[18, 164, 195, shipExplosionV],
				[0, 210, 255, shipExplosionV],
				[150, 210, 255, shipExplosionV], 
				[255, 255, 255, shipExplosionV]
			]);

			var weaponExplosionV = 210;
			gameState.colors.weaponExplosion = new EC.Palette(reactor, [
				[0, 0, 0, 0],
				[255, 0, 0, weaponExplosionV],
				[255, 160, 0, weaponExplosionV],
				[255, 255, 0, weaponExplosionV]
			]);

			//gameState.colors.shipExplosion = gameState.colors.weaponExplosion;

			//gameState.colors.weaponExplosion = gameState.colors.shipExplosion;


			var bs = 0.12;
			gameState.colors.background = new EC.Palette(reactor, [
				[0, 0, 0, 0],
				[bs*10, bs*80, bs*80, 255], 
				[bs*20, bs*170, bs*170, 255],
				[bs*30, bs*255, bs*255, 255]
			]);

			gameState.colors.ship = new EC.Palette(reactor, [
				[0, 0, 0, 0], 
				[0, 0, 255, 100],
				[0, 80, 255, 200],
				[0, 190, 255, 255],
				[0, 225, 255, 255],
				[0, 255, 255, 255],
			]);

			gameState.colors.copy = new EC.Palette(reactor, [
				[0, 0, 0, 0],
				[0, 130, 0, 255],
				[0, 190, 0, 255],
				[0, 255, 0, 255]
			]);

			gameState.colors.enemyShield = new EC.Palette(reactor);

			var a = 100;
			gameState.colors.enemyShield.generateColors({
				0: [0,0,0,0], 
				6:[255,0,0,a], 
				12:[0,255,0,a], 
				18:[0,0,255,a],
				24:[255,255,255,a]
			});

			// alpha only  shield
			gameState.colors.enemyShield.generateColors({
				0: [0,0,0,0], 
				1:[255,255,0,100], 
				24:[255,255,0,255]
			});

			gameState.dishes.enemy.randomize(gameState.rules.enemy.nrStates, 0.001);
			gameState.dishes.background.randomize(gameState.rules.enemy.nrStates, 0.01);

			callback();
		};

		// USE this if you need the database (we do we refresh the list of rules in setup)
		var oldSetupFn = setupFn;
		setupFn = function(data) {
			fileStore.ready(function() {
				oldSetupFn(data);
			});
		};

		loader.start(true, setupFn);
	};

	return {
		setup: setup,
		initDB: initDB,
	};
});