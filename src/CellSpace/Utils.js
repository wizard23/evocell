define([
	"jquery-ui", "Utils", "EvoCell", "story/StoryTeller", "underscore", 
	"backbone", "knockback", "knockout", "data/FileStore", "three", "datgui", 
	"CellSpace/State"], 
function($, utils, EC, storyTeller,_ , Backbone, kb, ko, fileStore, THREE, dat, 
	gameState) {
		"use strict";

/////// PUBLIC ///////////
	// access to gamestate
	var pollAutoFire = function() {		
		if (gameState.autoFireOn) {
			if (gameState.autoFireCounter === 0) {
				var clickedPoint = intersectClick(gameState.lastMouseNDC);
				fireShotAt(gameState.gameW*(clickedPoint.x+1)/2, gameState.gameH*(clickedPoint.y+1)/2);	

				gameState.autoFireCounter = 5;
			}
			else {
				gameState.autoFireCounter--;
			}
		}
	};

	// TODO: gameState access
	var fireShotAt = function(tx, ty) {
		// spawn shot
		var dX = tx-gameState.shipX;
		var dY = ty-gameState.shipY;
		var dL = Math.sqrt(dX*dX+dY*dY);

		var sX = gameState.shotSpeed * dX/dL;
		var sY = gameState.shotSpeed * dY/dL;

		sX += gameState.shipSpeedX;
		sY += gameState.shipSpeedY;

		var aa = gameState.frontShots > 1 ? -gameState.frontShotAngle/2 : 0;

		for (var i = 0; i < gameState.frontShots; i++) {
			gameState.shots.allocateParticle(gameState.shipX-1*gameState.scrollX, gameState.shipY-1*gameState.scrollY, 
				Math.cos(aa)*sX + Math.sin(aa)*sY, -Math.sin(aa)*sX + Math.cos(aa)*sY);
			
			if (gameState.frontShots > 1)
				aa += gameState.frontShotAngle/(gameState.frontShots-1);
		}

		utils.playSound(gameState.snd);
	};

	// TODO: could be done in backbone via a conceptual model ;)
	var updateButtons = function() {
		if (gameState.renderLoop.pauseRequested) {
			document.getElementById("playPause").children[0].className = "fa fa-play fa-2x";
		}
		else {
			document.getElementById("playPause").children[0].className = "fa fa-pause fa-2x";
		}
	};

	var refreshGUI = function(names) {
		names = names ? (names.length ? names : [names]) : [];

		var refresh = function(controller) {
			if (_.contains(names, controller.property)) { 
				controller.updateDisplay();
			}
		};

		_.each(gameState.gui.__controllers, refresh);
		_.each(gameState.gui.__folders, function(folder) {
			_.each(folder.__controllers, refresh);
		});
	};

	var resetGame = function() {
		gameState.cnt = 0;
		gameState.dishes.enemy.randomize(gameState.rules.enemy.nrStates, 0.001);
		gameState.dishes.enemy2.randomize(gameState.rules.enemy.nrStates, 0.01);
		if (gameState.shipX < 0 || gameState.shipX > gameState.gameW || 
			gameState.shipY < 0 || gameState.shipY > gameState.gameH) {
			gameState.shipX = gameState.gameW/2;
			gameState.shipY = gameState.gameH/2;
		}
		utils.playSound(gameState.sndInit);
	};

	var gameStep = function() {
		gameState.renderLoop.stop();
		gameState.renderLoop.step();
		updateButtons();
	};

	var gamePlayPause = function() {
		gameState.renderLoop.toggle();
		updateButtons();
	};

	var onGameSizeChanged = function() {
		var reactor = gameState.reactor;

		reactor.setDefaultDishSize(gameState.gameW, gameState.gameH);

		// hack reinit shots
		gameState.shots = new EC.ParticleSystem(reactor, gameState.maxParticles, gameState.gameW, gameState.gameH);

		// reinit instead of resize (we lose state but who cares?)
		var dishes = gameState.dishes;
		dishes.enemy = reactor.compileDish();
		dishes.enemy2 = reactor.compileDish();
		dishes.ship = reactor.compileDish();
		dishes.shipExplosion = reactor.compileDish();
		dishes.weapon = reactor.compileDish();
		dishes.weaponExplosion = reactor.compileDish();
		dishes.copy = reactor.compileDish();
		dishes.buffer = reactor.compileDish(64, 64);
		dishes.render = reactor.compileDish();

		var rules = gameState.rules;
		rules.enemy.setCompileSizeDish(gameState.dishes.enemy);
		rules.enemy2.setCompileSizeDish(gameState.dishes.enemy2);
		rules.ship.setCompileSizeDish(gameState.dishes.ship);
		rules.weapon.setCompileSizeDish(gameState.dishes.enemy);
		rules.shipExplosion.setCompileSizeDish(gameState.dishes.enemy2);
		rules.weaponExplosion.setCompileSizeDish(gameState.dishes.enemy2);

		resetGame();
	}; 

	var refreshAvailableRules = function() {
		fileStore.loadAllRuleNames(function(names) {
			gameState.drawModel.set("availableRules", names);
			//alert(names);
        });
	};

	var refreshAvailableDishes = function() {
			gameState.drawModel.set("availableLayers", Object.keys(gameState.dishes));
	};

////// PTIVATE //////////////

	return {
		pollAutoFire: pollAutoFire,
		fireShotAt: fireShotAt,
		updateButtons: updateButtons,
		refreshGUI: refreshGUI,
		resetGame: resetGame,
		gameStep: gameStep,
		gamePlayPause: gamePlayPause,
		onGameSizeChanged: onGameSizeChanged,

		refreshAvailableRules: refreshAvailableRules,
		refreshAvailableDishes: refreshAvailableDishes,
	};
});