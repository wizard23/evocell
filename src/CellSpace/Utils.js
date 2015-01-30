define([
	"GLOBALS", "jquery-ui", "Utils", "EvoCell", "story/StoryTeller", "underscore",
	"backbone", "knockback", "knockout", "data/FileStore", "three", "datgui", 
	"CellSpace/State"], 
function(GLOBALS, $, utils, EC, storyTeller,_ , Backbone, kb, ko, fileStore, THREE, dat,
	gameState) {
		"use strict";

/////// PUBLIC ///////////
	// access to gamestate
	var pollAutoFire = function() {		
		if (gameState.autoFireOn) {
			if (gameState.autoFireCounter === 0) {
				var clickedPoint = intersectClick(gameState.lastMouseNDC);
				gameState.ship.fireShotAt(GLOBALS.gameW*(clickedPoint.x+1)/2, GLOBALS.gameH*(clickedPoint.y+1)/2);

				gameState.autoFireCounter = 5;
			}
			else {
				gameState.autoFireCounter--;
			}
		}
	};

	// TODO: could be done in backbone via a conceptual model ;)
	var updateButtons = function() {
		if (gameState.pause) {
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
		gameState.dishes.enemy.randomize(gameState.rules.enemy.nrStates, gameState.randomDensity);
		gameState.dishes.background.randomize(gameState.rules.enemy.nrStates, 0.01);
        gameState.ship.respawn();
		utils.playSound(gameState.sndInit);
	};

	var gameStep = function() {
		gameState.pause = true;
		gameState.doOneStep = true;
		updateButtons();
	};

	var gamePlayPause = function() {
		gameState.pause = !gameState.pause;
		updateButtons();
	};

	var onScreenSizeChanged = function() {
		gameState.reactor.setRenderSize(gameState.screenW, gameState.screenH);
		refreshGUI(["screenW", "screenH"]);	
	};

	var onGameSizeChanged = function() {
		var reactor = gameState.reactor;

		reactor.setDefaultDishSize(GLOBALS.gameW, GLOBALS.gameH);

		// reinit instead of resize (we lose state but who cares?)
		var dishes = gameState.dishes;
		dishes.enemy = reactor.compileDish();
		dishes.enemyShield = reactor.compileDish();
		dishes.background = reactor.compileDish();
		dishes.ship = reactor.compileDish();
		dishes.shipExplosion = reactor.compileDish();
		dishes.weapon = reactor.compileDish();
		dishes.weaponExplosion = reactor.compileDish();
		dishes.copy = reactor.compileDish();
		dishes.buffer = reactor.compileDish();
		dishes.render = reactor.compileDish();
		dishes.render2 = reactor.compileDish();
        dishes.colliding = reactor.compileDish();

		try 
		{
			var rules = gameState.rules;
			rules.enemy.setCompileSizeDish(gameState.dishes.enemy);
			rules.background.setCompileSizeDish(gameState.dishes.background);
			rules.ship.setCompileSizeDish(gameState.dishes.ship);
			rules.weapon.setCompileSizeDish(gameState.dishes.enemy);
			rules.shipExplosion.setCompileSizeDish(gameState.dishes.background);
			rules.weaponExplosion.setCompileSizeDish(gameState.dishes.background);

			resetGame();
		}
		catch (ex) {
			// FIXME: catch all is dirty hack store rule and compiled rule seperately (dishes, rules and ecfiles)
		}
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

	// dir 
	var zoom = function(dir) {
		var zoomSpeed = 1.005;
		gameState.zoom *= Math.pow(zoomSpeed, dir);
		refreshGUI(["zoom"]);
	};

////// PTIVATE //////////////

	return {
		pollAutoFire: pollAutoFire,
		zoom: zoom,
		updateButtons: updateButtons,
		refreshGUI: refreshGUI,
		resetGame: resetGame,
		gameStep: gameStep,
		gamePlayPause: gamePlayPause,

		onScreenSizeChanged: onScreenSizeChanged,
		onGameSizeChanged: onGameSizeChanged,

		refreshAvailableRules: refreshAvailableRules,
		refreshAvailableDishes: refreshAvailableDishes,
	};
});