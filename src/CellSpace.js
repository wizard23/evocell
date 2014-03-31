// Example: local resources in the same directory
// var resPath = "./"; 
// resources in res_evocell repository
var resPath = "../res_evocell/";
var libPath = "../" + resPath + "src/libs/";


require.config({
	baseUrl: 'src',
	paths: {
		jquery: libPath + 'jquery-1.10.2',
		"jquery-ui": libPath + 'jquery-ui-1.10.4.custom',
		"underscore": libPath + "underscore",
		backbone: libPath + "backbone",
		knockback: libPath + "knockback",
		knockout: libPath + "knockout-3.0.0",
		meSpeak: libPath + "mespeak/mespeak",
		three: libPath + "three", 
		"jquery-cycle": libPath + "jquery.cycle.all",
		datgui: libPath + "dat.gui.min",
		FileSaver: libPath + "FileSaver",
		"three.parser": "../../three.parser.js/src/THREE.Parser",
	},
	shim: {
		datgui: {
			exports: "dat",
		}, 
        "jquery-ui": {
            exports: "$",
            deps: ['jquery', libPath + 'farbtastic']
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
	gameState, csSetup, gameLoop, csUI, csUtils) {
	"use strict";

	// game must be less than 20 LOC :)
	// MAIN APP

	// TODO: extract this in CellSpace.App which bundles State, Setup, UI, ...

	// TODO: should we not put this in backbone ready function?
	// is jquery redy better?
	//$(window).load(function(e) { 
		var canvas = document.getElementById('c');

		csSetup.setup(canvas, function () {
			csUI.setupGui();
			gameState.renderLoop = new utils.AnimationLoop(function() {
				csUI.pollUserInteraction();
				gameLoop();
			});
			gameState.renderLoop.start();
		});
	//});
});
