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
		var loader = new utils.ResLoader();

		var enemyRaw = loader.load("enemy", "rules/enemy_ludwigBuildships");
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
			var gameW = 800, gameH = 550;
			var zoom = 1;

			//alert(data.vsTestPalette);
			//return;

			// Setup core and rules and texture
			var enemyFile = new EC.ECFile(data.enemy);
			var shipFile = new EC.ECFile(data.ship);

			var context = document.getElementById('c');
			var reactor = new  EC.Reactor(context, gameW, gameH);

			var enemyDish = reactor.compileDish(gameW/zoom, gameH/zoom);
			var shipDish = reactor.compileDish(gameW/zoom, gameH/zoom);
			var renderDish = reactor.compileDish(gameW/zoom, gameH/zoom);
		
			var clearShader = reactor.compileShader(data.clear);
			var paintShader = reactor.compileShader(data.painter);
			var drawRectShader = reactor.compileShader(data.drawRect);
			var mixShader = reactor.compileShader(data.mixPalette);
			var mixShader2 = reactor.compileShader(data.mixPalette2);

			var enemyRule = reactor.compileRule(enemyFile, enemyDish);
			var shipRule = reactor.compileRule(shipFile, shipDish);
			
			enemyDish.randomize(enemyRule.nrStates, 0.0005);
			//shipDish.randomize(shipRule.nrStates, 0.5);


			var shipX, shipY;
			var c = 0;
		
	
			var cnt = 0;

			var gameLoop = new utils.AnimationLoop(function() {
				if (cnt % 3 == 0)
					reactor.step(enemyRule, enemyDish);

				//reactor.step(enemyRule, enemyDish);
				//reactor.step(enemyRule, enemyDish);
				//reactor.step(enemyRule, enemyDish);

				reactor.step(shipRule, shipDish);
				reactor.applyShaderOnDish(drawRectShader, shipDish, function(gl, shader) 
				{ 
					shipX = (Math.sin(c)+1.1)*90;	
					shipY = (Math.cos(c)+1.1)*65;	
					c+=0.02;		

					gl.uniform2f(gl.getUniformLocation(shader, "rectPos"), shipX, shipY);
					gl.uniform2f(gl.getUniformLocation(shader, "rectSize"), 5, 5);
					gl.uniform1f(gl.getUniformLocation(shader, "state"), (shipRule.nrStates-1)/255.);
				});

				reactor.applyShaderOnDish(clearShader, renderDish);
				reactor.mixDishes(mixShader, enemyDish, renderDish);
				reactor.mixDishes(mixShader2, shipDish, renderDish);
				reactor.paintDish(paintShader, renderDish);

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
