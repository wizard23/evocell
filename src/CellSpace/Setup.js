define(["Utils", "data/FileStore", "EvoCell", "CellSpace/State", "CellSpace/Utils"], 
	function(utils, fileStore, EC, gameState, csUtils) {
	"use strict";

	// static
	var setup = function(canvas, callback) {
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
		loader.load("rules.weaponExplosion", resPath + "rules/moore5-coolspaceships", "ecfile");
		//loader.load("rules.weaponExplosion", resPath + "rules/ship_avg4_nice", "ecfile");

		
		loader.load("rules.shipExplosion", resPath + "rules/cross4-wave-spaceshipshoot", "ecfile");
		loader.load("rules.shipExplosion", resPath + "rules/moore5-coolspaceships", "ecfile");

		loader.load("rules.ship", resPath + "rules/ship_avg4_nice", "ecfile");

		// rules/ship_avg4_nice rules/ship_avg4_schweif

		loader.load("vertexPoints", "src/shaders/vertexPoints.vshader", "text");
		loader.load("drawAll", "src/shaders/drawAll.shader", "text");

		loader.load("clear", "src/shaders/clear.shader", "text");
		loader.load("mixPalette", "src/shaders/mixPalette.shader", "text");	

		loader.load("drawRect", "src/shaders/drawRect.shader", "text");
		loader.load("drawCircle", "src/shaders/drawCircle.shader", "text");

		loader.load("scroller", "src/shaders/scroller.shader", "text");

		loader.load("rendererVertex", "src/shaders/cameraRenderer.vshader", "text");
		loader.load("rendererFragment", "src/shaders/cameraRenderer.shader", "text");

		loader.load("intersectSpawn", "src/shaders/intersectSpawn.shader", "text");
		loader.load("shieldSpawn", "src/shaders/shieldGenerator.shader", "text");

		loader.load("copyPaste", "src/shaders/copyPasteRect.shader", "text");

		loader.start(function (data) { 
			// Setup core
			var reactor = new  EC.Reactor(canvas, gameState.gameW, gameState.gameH);
			gameState.reactor = reactor;
			gameState.gl = reactor.gl;
			gameState.canvas = reactor.canvas;

			gameState.reactor.setRenderSize(gameState.screenW, gameState.screenH);

			var dishes = gameState.dishes;
			dishes.enemy = reactor.compileDish();
			dishes.enemyShield = reactor.compileDish();
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
			gameState.shaders.cameraRenderer = reactor.compileShader(data.rendererVertex, data.rendererFragment);

			gameState.shaders.drawRect = reactor.compileShader(data.drawRect);
			gameState.shaders.drawCircle = reactor.compileShader(data.drawCircle);

			gameState.shaders.mix = reactor.compileShader(data.mixPalette);
			gameState.shaders.intersectSpawn = reactor.compileShader(data.intersectSpawn);
			gameState.shaders.shieldSpawn = reactor.compileShader(data.shieldSpawn);
			gameState.shaders.copy = reactor.compileShader(data.copyPaste);

			gameState.shaders.scroll = reactor.compileShader(data.scroller);

			csUtils.refreshAvailableRules();
			csUtils.refreshAvailableDishes();

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
				[0, 120, 0, 180],
				[0, 255, 0, 180],
				[120, 255, 0, 180],
				[200, 255, 0, 180],
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
				[0, 0, 255, 200],
				[0, 80, 255, 200],
				[0, 190, 255, 200]
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

			gameState.colors.enemyShield = new EC.Palette(reactor, [
				[0, 0, 0, 255],
				[255, 0, 0, 100],
				[0, 255, 0, 100],
				[0, 0, 255, 150],
				[255, 255, 255, 120],
				[255, 255, 255, 140],
				[255, 255, 255, 160],
				[255, 255, 255, 180],
			]);

			gameState.dishes.enemy.randomize(gameState.rules.enemy.nrStates, 0.001);
			gameState.dishes.enemy2.randomize(gameState.rules.enemy.nrStates, 0.01);
			gameState.shipX = gameState.gameW/2;
			gameState.shipY = gameState.gameH/2;

			callback();
		});
	};

	return {
		setup: setup
	};
});