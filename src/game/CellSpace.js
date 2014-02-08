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
		loader.load("enemy2", "rules/enemy_linebuilder");
		loader.load("ship", "rules/ship_avg4_schweif");
		loader.load("clear", "src/game/shaders/clear.shader", "text");
		loader.load("mixPalette", "src/game/shaders/mixPalette.shader", "text");
		loader.load("mixPalette2", "src/game/shaders/mixPalette2.shader", "text");
		loader.load("drawRect", "src/game/shaders/drawRect.shader", "text");
		loader.load("painter", "src/game/shaders/primitiveRenderer.shader", "text");
		
		var frames = 0;
		function fr(){
			var ti = new Date().getTime();
			var fps = Math.round(1000*frames/(ti - time));
			document.getElementById('fps').value = fps;
			frames = 0;  time = ti;
		}
		timer = setInterval(fr, 1000);
		time = new Date().getTime();

		loader.start(function (data) {
			var gameW = 1200, gameH = 600;
			var zoom = 4;

			// Setup core and rules and texture
			var enemyFile = new EC.ECFile(data.enemy);
			var enemy2File = new EC.ECFile(data.enemy2);
			var shipFile = new EC.ECFile(data.ship);

			var context = document.getElementById('c');
			var reactor = new  EC.Reactor(context, gameW, gameH);

			var enemyDish = reactor.compileDish(gameW/zoom, gameH/zoom);
			var enemy2Dish = reactor.compileDish(gameW/zoom, gameH/zoom);
			var shipDish = reactor.compileDish(gameW/zoom, gameH/zoom);
			var renderDish = reactor.compileDish(gameW/zoom, gameH/zoom);
		
			var clearShader = reactor.compileShader(data.clear);
			var paintShader = reactor.compileShader(data.painter);
			var drawRectShader = reactor.compileShader(data.drawRect);
			var mixShader = reactor.compileShader(data.mixPalette);
			var mixShader2 = reactor.compileShader(data.mixPalette2);

			var enemyRule = reactor.compileRule(enemyFile, enemyDish);
			var enemy2Rule = reactor.compileRule(enemy2File, enemy2Dish);
			var shipRule = reactor.compileRule(shipFile, shipDish);
			
			var enemyColors = new EC.Palette(reactor);
			enemyColors.setColor(0, [0, 0, 0, 255]);
			enemyColors.setColor(1, [80, 10, 80, 255]);
			enemyColors.setColor(2, [170, 20, 170, 255]);
			enemyColors.setColor(3, [255, 30, 255, 255]);

			var enemy2Colors = new EC.Palette(reactor);
			enemy2Colors.setColor(0, [0, 0, 0, 255]);
			enemy2Colors.setColor(1, [10, 80, 80, 255]);
			enemy2Colors.setColor(2, [20, 170, 170, 255]);
			enemy2Colors.setColor(3, [30, 255, 255, 255]);


			enemyDish.randomize(enemyRule.nrStates, 0.0005);
			enemy2Dish.randomize(enemyRule.nrStates, 0.001);

			var shipX = 20, shipY = 20;
			var c = 0;
	
			var cnt = 0;

			var gameLoop = new utils.AnimationLoop(function() {
				var gl = reactor.gl;

				// ENEMIES
				if (cnt % 3 == 0)
					reactor.step(enemyRule, enemyDish);
				if (cnt % 3 == 0)
					reactor.step(enemy2Rule, enemy2Dish);

				// SHIP
				//shipX = (Math.sin(c)+1.1)*70;	
				//shipY = (Math.cos(c)+1.1)*45;	
				//	c+=0.02;		
				var stepSize = 1;
				if (keyboard.isPressed(keyboard.UP)) shipY += stepSize;
				if (keyboard.isPressed(keyboard.DOWN)) shipY -= stepSize;
				if (keyboard.isPressed(keyboard.LEFT)) shipX -= stepSize;
				if (keyboard.isPressed(keyboard.RIGHT)) shipX += stepSize

				
				reactor.step(shipRule, shipDish);
				reactor.applyShaderOnDish(drawRectShader, shipDish, function(gl, shader) 
				{ 
					gl.uniform2f(gl.getUniformLocation(shader, "rectPos"), shipX, shipY);
					gl.uniform2f(gl.getUniformLocation(shader, "rectSize"), 5, 5);
					gl.uniform1f(gl.getUniformLocation(shader, "state"), (shipRule.nrStates-1)/255.);
				});
				if (keyboard.isPressed(keyboard.UP)) reactor.applyShaderOnDish(drawRectShader, shipDish, function(gl, shader) 
				{ 
					gl.uniform2f(gl.getUniformLocation(shader, "rectPos"), 10, 10);
					gl.uniform2f(gl.getUniformLocation(shader, "rectSize"), 55, 55);
					gl.uniform1f(gl.getUniformLocation(shader, "state"), (shipRule.nrStates-1)/255.);
				});


				// COMPOSE
				reactor.applyShaderOnDish(clearShader, renderDish);

				reactor.mixDishes(mixShader, enemyDish, renderDish, function(gl, shader) {
					gl.uniform1i(gl.getUniformLocation(shader, "palette"), 2);
					gl.activeTexture(gl.TEXTURE2);    
					gl.bindTexture(gl.TEXTURE_2D, enemyColors.getTexture());
				});
				reactor.mixDishes(mixShader, enemy2Dish, renderDish, function(gl, shader) {
					gl.uniform1i(gl.getUniformLocation(shader, "palette"), 2);
					gl.activeTexture(gl.TEXTURE2);    
					gl.bindTexture(gl.TEXTURE_2D, enemy2Colors.getTexture());
				});
				reactor.mixDishes(mixShader2, shipDish, renderDish);
				
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
