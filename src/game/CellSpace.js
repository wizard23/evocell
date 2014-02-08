require.config({
   // baseUrl: 'js/lib',
    paths: {
        // the left side is the module ID,
        // the right side is the path to
        // the jQuery file, relative to baseUrl.
        // Also, the path should NOT include
        // the '.js' file extension. This example
        // is using jQuery 1.9.0 located at
        // js/lib/jquery-1.9.0.js, relative to
        // the HTML page.
        jquery: 'libs/jquery	'
    }
});

require(["jquery", "Utils", "CellSpaceResources", "EvoCell"], 
	function($, utils, resources, EC) {
		var keyboard = utils.keyboard;

		var loader = new utils.ResLoader();

		loader.load("enemy", "rules/enemy_ludwigBuildships");
		//loader.load("enemy", "rules/enemy_city");
		//loader.load("enemy", "rules/enemy_diaglines2");
		loader.load("enemy2", "rules/enemy_linebuilder");
		loader.load("weapon", "rules/ship_avg4_schweif");
		loader.load("weaponExplosion", "rules/ship_avg4_schweif");
		loader.load("shipExplosion", "rules/ship_avg4_nice");
		//loader.load("shipExplosion", "rules/ship_avg4_schweif");
		loader.load("ship", "rules/ship_avg4_nice");

		loader.load("clear", "src/game/shaders/clear.shader", "text");
		loader.load("mixPalette", "src/game/shaders/mixPalette.shader", "text");
		//loader.load("mixPalette2", "src/game/shaders/mixPalette2.shader", "text");
		loader.load("drawRect", "src/game/shaders/drawRect.shader", "text");
		loader.load("painter", "src/game/shaders/primitiveRenderer.shader", "text");
		loader.load("intersectSpawn", "src/game/shaders/intersectSpawn.shader", "text");
		
		var frames = 0;
		function fr(){
			var ti = new Date().getTime();
			var fps = Math.round(1000*frames/(ti - time));
			document.getElementById('fps').value = fps;
			frames = 0;  time = ti;
		}
		timer = setInterval(fr, 1000);
		time = new Date().getTime();


/*
		reactor.moveParticles(particlesMoveShader, particlesDish);
		reactor.renderParticles(particlesRenderShader, particlesDish, state, size);
*/
		// reactor.collideParticles( // TODO: colission 

		loader.start(function (data) {
			var gameW = 1024, gameH = 1024;
			var zoom = 4;

			// Setup core and rules and texture
			var enemyFile = new EC.ECFile(data.enemy);
			var enemy2File = new EC.ECFile(data.enemy2);
			var shipFile = new EC.ECFile(data.ship);
			var weaponFile = new EC.ECFile(data.weapon);
			var shipExplosionFile = new EC.ECFile(data.shipExplosion);

			var context = document.getElementById('c');
			var reactor = new  EC.Reactor(context, gameW, gameH);

			var enemyDish = reactor.compileDish(gameW/zoom, gameH/zoom);
			var enemy2Dish = reactor.compileDish(gameW/zoom, gameH/zoom);
			var shipDish = reactor.compileDish(gameW/zoom, gameH/zoom);
			var shipExplosionDish = reactor.compileDish(gameW/zoom, gameH/zoom);
			var renderDish = reactor.compileDish(gameW/zoom, gameH/zoom);
		
			var clearShader = reactor.compileShader(data.clear);
			var paintShader = reactor.compileShader(data.painter);
			var drawRectShader = reactor.compileShader(data.drawRect);
			var mixShader = reactor.compileShader(data.mixPalette);
			var intersectSpawnShader = reactor.compileShader(data.intersectSpawn);

			var enemyRule = reactor.compileRule(enemyFile, enemyDish);
			var enemy2Rule = reactor.compileRule(enemy2File, enemy2Dish);
			var shipRule = reactor.compileRule(shipFile, shipDish);
			var weaponRule = reactor.compileRule(weaponFile, enemyDish);
			var shipExplosionRule = reactor.compileRule(shipExplosionFile, enemy2Dish);
			
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

			var shipX = 0.5*gameW/zoom, shipY = 0.5*gameH/zoom;
			var c = 0;
	
			var cnt = 0;

			var gameLoop = new utils.AnimationLoop(function() {
				var gl = reactor.gl;

				// ENEMIES //////////////////////////////////////
				if (cnt % 3 == 0)
					reactor.step(enemyRule, enemyDish);
				if (cnt % 6 == 0)
					reactor.step(enemy2Rule, enemy2Dish);


				// SHIP ///////////////////////////////////////////
				//shipX = (Math.sin(c)+1.1)*70;	
				//shipY = (Math.cos(c)+1.1)*45;	
				//	c+=0.02;		
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
					shipX = 0.5*gameW/zoom, shipY = 0.5*gameH/zoom;
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
				frames++;
			});

			gameLoop.start();

			
			
			//gameLoop.stop();
				
		});
	});

// RulesTexture and Dishes brauchen gemeinsames Basisobjekt das eine Textur zurueckgibt, RuleTexture ist auch ein shader

// public interface
/*
EvoCell.CellSpace = function(document)
{
	var context = document.getElementById('c');
	this.reactor = EvoCell.Reactor(context);


	// load rules
	var shipRule = 
	
	

}

EvoCell.CellSpace.prototype.step = function()
{
	
}
*/
