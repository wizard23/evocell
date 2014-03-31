define([
	"jquery-ui", "Utils", "EvoCell", "story/StoryTeller", "underscore", 
	"backbone", "knockback", "knockout", "data/FileStore", "three", "datgui", 
	"CellSpace/State", "CellSpace/Setup", "CellSpace/Utils"], 
function($, utils, EC, storyTeller,_ , Backbone, kb, ko, fileStore, THREE, dat, 
	gameState, csSetup, csUtils) {

	var OP_REPLACE = 0;
	var OP_ADD = 1;

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

	return gameLoop;
});