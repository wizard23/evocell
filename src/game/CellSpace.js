require.config({
   // baseUrl: 'js/lib',
    paths: {
        jquery: 'libs/jquery	'
    }
});

require(["jquery", "Utils", "CellSpaceResources", "EvoCell"], function($, utils, resources, EC) {
	var keyboard = utils.keyboard;
	var gameW = 256, gameH = 256;
	var zoom = 2;
	
	var fpsMonotor = new utils.FPSMonitor("fpsMonitor");
	// Setup core 	
	var context = document.getElementById('c');
	var reactor = new  EC.Reactor(context, gameW, gameH);
	reactor.setRenderSize(gameW*zoom, gameH*zoom);

	var loader = new EC.ResLoader();

	loader.load("enemyRule", "rules/enemy_ludwigBuildships", "ecfile");
	loader.load("enemy2Rule", "rules/enemy_linebuilder", "ecfile");
	loader.load("weaponRule", "rules/ship_avg4_schweif", "ecfile");
	loader.load("weaponExplosionRule", "rules/ship_avg4_schweif", "ecfile");
	loader.load("shipExplosionRule", "rules/ship_avg4_nice", "ecfile");
	loader.load("shipRule", "rules/ship_avg4_nice", "ecfile");

	loader.load("clear", "src/game/shaders/clear.shader", "text");
	loader.load("mixPalette", "src/game/shaders/mixPalette.shader", "text");
	loader.load("drawRect", "src/game/shaders/drawRect.shader", "text");
	loader.load("painter", "src/game/shaders/primitiveRenderer.shader", "text");
	loader.load("intersectSpawn", "src/game/shaders/intersectSpawn.shader", "text");

	loader.start(function (data) {
		var enemyDish = reactor.compileDish();
		var enemy2Dish = reactor.compileDish();
		var shipDish = reactor.compileDish();
		var shipExplosionDish = reactor.compileDish();
		var renderDish = reactor.compileDish();

		var clearShader = reactor.compileShader(data.clear);
		var paintShader = reactor.compileShader(data.painter);
		var drawRectShader = reactor.compileShader(data.drawRect);
		var mixShader = reactor.compileShader(data.mixPalette);
		var intersectSpawnShader = reactor.compileShader(data.intersectSpawn);

		var enemyRule = reactor.compileRule(data.enemyRule, enemyDish);
		var enemy2Rule = reactor.compileRule(data.enemy2Rule, enemy2Dish);
		var shipRule = reactor.compileRule(data.shipRule, shipDish);
		var weaponRule = reactor.compileRule(data.weaponRule, enemyDish);
		var shipExplosionRule = reactor.compileRule(data.shipExplosionRule, enemy2Dish);
		
		var enemyColors = new EC.Palette(reactor);
		enemyColors.setColor(0, [0, 0, 0, 255]);
		enemyColors.setColor(1, [140, 10, 140, 255]);
		enemyColors.setColor(2, [255, 255, 255, 255]);
		enemyColors.setColor(3, [255, 30, 255, 255]);

		var enemy2Colors = new EC.Palette(reactor);
		var bs = 0.12;
		enemy2Colors.setColor(0, [0, 0, 0, 255]);
		enemy2Colors.setColor(1, [bs*10, bs*80, bs*80, 255]);
		enemy2Colors.setColor(2, [bs*20, bs*170, bs*170, 255]);
		enemy2Colors.setColor(3, [bs*30, bs*255, bs*255, 255]);

		var shipColors = new EC.Palette(reactor);
		shipColors.setColor(0, [0, 0, 0, 255]);
		shipColors.setColor(1, [0, 0, 255, 255]);
		shipColors.setColor(2, [0, 80, 255, 255]);
		shipColors.setColor(3, [0, 190, 255, 255]);

		var shipExplosionColors = new EC.Palette(reactor);
		shipExplosionColors.setColor(0, [0, 0, 0, 255]);
		shipExplosionColors.setColor(1, [255, 0, 0, 255]);
		shipExplosionColors.setColor(2, [255, 160, 0, 255]);
		shipExplosionColors.setColor(3, [255, 255, 0, 255]);

		enemyDish.randomize(enemyRule.nrStates, 0.0005);
		enemy2Dish.randomize(enemyRule.nrStates, 0.01);
		shipExplosionDish.randomize(shipExplosionRule.nrStates, 0.01);

		var shipX = gameW/2, shipY = gameH/2;
		
		var cnt = 0;
		var gameLoop = new utils.AnimationLoop(function() {
			var gl = reactor.gl;

			// ENEMIES //////////////////////////////////////
			if (cnt % 3 == 0)
				reactor.step(enemyRule, enemyDish);
			if (cnt % 6 == 0)
				reactor.step(enemy2Rule, enemy2Dish);


			// SHIP ///////////////////////////////////////////	
			var stepSize = 2;
			if (keyboard.isPressed(keyboard.UP)) shipY += stepSize;
			if (keyboard.isPressed(keyboard.DOWN)) shipY -= stepSize;
			if (keyboard.isPressed(keyboard.LEFT)) shipX -= stepSize;
			if (keyboard.isPressed(keyboard.RIGHT)) shipX += stepSize

			reactor.step(shipExplosionRule, shipExplosionDish);
			reactor.step(shipRule, shipDish);
			reactor.applyShaderOnDish(drawRectShader, shipDish, function(gl, shader) 
			{ 
				gl.uniform2f(gl.getUniformLocation(shader, "rectPos"), shipX, shipY);
				gl.uniform2f(gl.getUniformLocation(shader, "rectSize"), 5, 5);
				gl.uniform1f(gl.getUniformLocation(shader, "state"), (shipRule.nrStates-1)/255.);
			});

			reactor.applyShaderOnDish(drawRectShader, enemyDish, function(gl, shader) 
			{ 
				gl.uniform2f(gl.getUniformLocation(shader, "rectPos"), shipX+1, shipY+1);
				gl.uniform2f(gl.getUniformLocation(shader, "rectSize"), 3, 3);
				gl.uniform1f(gl.getUniformLocation(shader, "state"), 0.);
			});

			// space
			if (keyboard.isPressed(32)) {
				enemyDish.randomize(enemyRule.nrStates, 0.0004);
				enemy2Dish.randomize(enemyRule.nrStates, 0.01);
				shipX = gameW/2, shipY = gameH/2;
			}


			// Dishinteraction INTERACTION /////////////////////////////////////////////
			var framebuffer = shipExplosionDish.getNextFramebuffer();
			var bindCallback = function(gl, progCA)
			{
				gl.uniform1i(gl.getUniformLocation(progCA, "intersect1"), 0);
				gl.activeTexture(gl.TEXTURE0);    
				gl.bindTexture(gl.TEXTURE_2D, enemyDish.getCurrentTexture());

				gl.uniform1i(gl.getUniformLocation(progCA, "intersect2"), 1);
				gl.activeTexture(gl.TEXTURE1);    
				gl.bindTexture(gl.TEXTURE_2D, shipDish.getCurrentTexture());	

				gl.uniform1i(gl.getUniformLocation(progCA, "background"), 2);
				gl.activeTexture(gl.TEXTURE2);    
				gl.bindTexture(gl.TEXTURE_2D, shipExplosionDish.getCurrentTexture());	

				gl.uniform1f(gl.getUniformLocation(progCA, "state"), (shipExplosionRule.nrStates-1)/255.);
			}
			reactor.applyShader(intersectSpawnShader, framebuffer, bindCallback);
			shipExplosionDish.flip();


			framebuffer = enemyDish.getNextFramebuffer();
			bindCallback = function(gl, progCA)
			{
				gl.uniform1i(gl.getUniformLocation(progCA, "intersect1"), 0);
				gl.activeTexture(gl.TEXTURE0);    
				gl.bindTexture(gl.TEXTURE_2D, enemyDish.getCurrentTexture());

				gl.uniform1i(gl.getUniformLocation(progCA, "intersect2"), 1);
				gl.activeTexture(gl.TEXTURE1);    
				gl.bindTexture(gl.TEXTURE_2D, shipExplosionDish.getCurrentTexture());	

				gl.uniform1i(gl.getUniformLocation(progCA, "background"), 2);
				gl.activeTexture(gl.TEXTURE2);    
				gl.bindTexture(gl.TEXTURE_2D, enemyDish.getCurrentTexture());	

				gl.uniform1f(gl.getUniformLocation(progCA, "state"), 1./255.);
			}
			reactor.applyShader(intersectSpawnShader, framebuffer, bindCallback);
			enemyDish.flip();				

			framebuffer = shipDish.getNextFramebuffer();
			bindCallback = function(gl, progCA)
			{
				gl.uniform1i(gl.getUniformLocation(progCA, "intersect1"), 0);
				gl.activeTexture(gl.TEXTURE0);    
				gl.bindTexture(gl.TEXTURE_2D, shipDish.getCurrentTexture());

				gl.uniform1i(gl.getUniformLocation(progCA, "intersect2"), 1);
				gl.activeTexture(gl.TEXTURE1);    
				gl.bindTexture(gl.TEXTURE_2D, shipExplosionDish.getCurrentTexture());	

				gl.uniform1i(gl.getUniformLocation(progCA, "background"), 2);
				gl.activeTexture(gl.TEXTURE2);    
				gl.bindTexture(gl.TEXTURE_2D, shipDish.getCurrentTexture());	

				gl.uniform1f(gl.getUniformLocation(progCA, "state"), 3./255.);
			}
			reactor.applyShader(intersectSpawnShader, framebuffer, bindCallback);
			shipDish.flip();			


			// COMPOSE ////////////////////////////////////////////
			reactor.applyShaderOnDish(clearShader, renderDish);

			reactor.mixDishes(mixShader, enemy2Dish, renderDish, function(gl, shader) {
				gl.uniform1i(gl.getUniformLocation(shader, "palette"), 2);
				gl.activeTexture(gl.TEXTURE2);    
				gl.bindTexture(gl.TEXTURE_2D, enemy2Colors.getTexture());
			});

			reactor.mixDishes(mixShader, enemyDish, renderDish, function(gl, shader) {
				gl.uniform1i(gl.getUniformLocation(shader, "palette"), 2);
				gl.activeTexture(gl.TEXTURE2);    
				gl.bindTexture(gl.TEXTURE_2D, enemyColors.getTexture());
			});
			
			reactor.mixDishes(mixShader, shipDish, renderDish, function(gl, shader) {
				gl.uniform1i(gl.getUniformLocation(shader, "palette"), 2);
				gl.activeTexture(gl.TEXTURE2);    
				gl.bindTexture(gl.TEXTURE_2D, shipColors.getTexture());
			});
			reactor.mixDishes(mixShader, shipExplosionDish, renderDish, function(gl, shader) {
				gl.uniform1i(gl.getUniformLocation(shader, "palette"), 2);
				gl.activeTexture(gl.TEXTURE2);    
				gl.bindTexture(gl.TEXTURE_2D, shipExplosionColors.getTexture());
			});
			
			//RENDER
			reactor.paintDish(paintShader, renderDish, function(gl, shader) {
				gl.uniform1f(gl.getUniformLocation(shader, "scale"), zoom);
			});

			cnt++;
			fpsMonotor.frameIncrease();
		});

		gameLoop.start();		
	});
});
