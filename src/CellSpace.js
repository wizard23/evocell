var perfStartedJSTime = performance.now();	

require.config({
	baseUrl: 'src',
	paths: {
		jquery: '../../res_evocell/src/libs/jquery-1.10.2',
		"jquery-ui": '../../res_evocell/src/libs/jquery-ui-1.10.4.custom',
		"underscore": "../../res_evocell/src/libs/underscore",
		backbone: "../../res_evocell/src/libs/backbone",
		knockback: "../../res_evocell/src/libs/knockback",
		knockout: "../../res_evocell/src/libs/knockout-3.0.0",
		meSpeak: "../../res_evocell/src/libs/mespeak/mespeak",
		three: "../../res_evocell/src/libs/three", 
		"jquery-cycle": "../../res_evocell/src/libs/jquery.cycle.all",
		datgui: "../../res_evocell/src/libs/dat.gui.min",
		FileSaver: "../../res_evocell/src/libs/FileSaver",
	},
	shim: {
		datgui: {
			exports: "dat",
		}, 
        "jquery-ui": {
            exports: "$",
            deps: ['jquery', '../../res_evocell/src/libs/farbtastic']
        },
		"jquery-cycle": {
			deps: ["jquery-ui"]
		},
		underscore : {
			exports: "_",
		},
		backbone : {
			exports: "Backbone",
			deps: ['underscore'],
		},
		knockback: {
			exports: "kb",
			deps: ["backbone"],			
		},
		knockout: {
			exports: "ko",			
		},
		meSpeak: {
			exports: "meSpeak",
		},
		three: {
			exports: "THREE",
		},
    }
});


require([
	"jquery-ui", "Utils", "EvoCell", "story/StoryTeller", "underscore", 
	"backbone", "knockback", "knockout", "data/FileStore", "three", "datgui", 
	"CellSpace/State", "CellSpace/Setup", "CellSpace/GameLoop", "CellSpace/GUI", "CellSpace/Utils"], 
function($, utils, EC, storyTeller,_ , Backbone, kb, ko, fileStore, THREE, dat, 
	gameState, csSetup, csGame, csUI, csUtils) {
	"use strict";

	gameState.perfRequireTime = performance.now();
	gameState.perfStartedJSTime = perfStartedJSTime;

	// MAIN LOOP (must be less than 20 LOC :)

	// TODO: extract this in CellSpace.App which bundles State, Setup, UI, ...

	// TODO: should we not put this in backbone ready function?
	// is jquery ready better?
	//$(window).load(function(e) { 
		var canvas = document.getElementById('c');

		csSetup.setup(canvas, function () {
			csUI.setupGui();

			gameState.mainLoop = new utils.AnimationLoop(0, function() {
				csUI.pollUserInteraction();
				if (!gameState.pause || gameState.doOneStep) {
					csGame.step();
					gameState.doOneStep = false;
				}
				csGame.render();
			});

			gameState.perfFinishedJSTime = performance.now();
			csUtils.refreshGUI(["perfStartedJSTime","perfFinishedJSTime", "perfRequireTime"]);

			gameState.mainLoop.start();
		});
	//});
});
