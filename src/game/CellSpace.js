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
		loader.load("painter", "src/game/shaders/primitiveRenderer.shader", "text");

		loader.start(function (data) {
			var gameW = 290, gameH = 250;

			//alert(data.vsTestPalette);
			//return;

			// Setup core and rules and texture
			var enemyFile = new EC.ECFile(data.enemy);
			var shipFile = new EC.ECFile(data.ship);

			var context = document.getElementById('c');
			var reactor = new  EC.Reactor(context);

			var enemyDish = reactor.compileDish(gameW, gameH);
			var shipDish = reactor.compileDish(gameW, gameH);
			var renderDish = reactor.compileDish(gameW, gameH);
		
			var clearShader = reactor.compileShader(data.clear);
			var paintShader = reactor.compileShader(data.painter);
			var mixShader = reactor.compileShader(data.mixPalette);
			var mixShader2 = reactor.compileShader(data.mixPalette2);

			var enemyRule = reactor.compileRule(enemyFile, enemyDish);
			var shipRule = reactor.compileRule(shipFile, shipDish);
			
			enemyDish.randomize(enemyRule.nrStates, 0.0005);
			shipDish.randomize(shipRule.nrStates, 0.5);

			var gameLoop = new utils.AnimationLoop(function() {

				reactor.step(enemyRule, enemyDish);
				reactor.step(shipRule, shipDish);

				reactor.applyShaderOnDish(clearShader, renderDish);
				reactor.mixDishes(mixShader, enemyDish, renderDish);
				reactor.mixDishes(mixShader2, shipDish, renderDish);
				reactor.paintDish(paintShader, renderDish);

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
