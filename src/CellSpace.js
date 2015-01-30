window.perfStartedJSTime = performance.now();  // TODO: this should be a local var passed to the GameState constructor

require.config({
	baseUrl: 'src',
	paths: {
		jquery: 'https://code.jquery.com/jquery-1.11.2.min',
		"jquery-ui": '../../res_evocell/src/libs/jquery-ui-1.10.4.custom',
		"underscore": "https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.7.0/underscore-min",
		backbone: "//cdnjs.cloudflare.com/ajax/libs/backbone.js/1.1.2/backbone-min",
		knockback: "//cdnjs.cloudflare.com/ajax/libs/knockback/0.20.5/knockback.min",
		knockout: "//cdnjs.cloudflare.com/ajax/libs/knockout/3.2.0/knockout-min",
		meSpeak: "../../res_evocell/src/libs/mespeak/mespeak",
		three: "//cdnjs.cloudflare.com/ajax/libs/three.js/r70/three.min",
		"jquery-cycle": "//cdnjs.cloudflare.com/ajax/libs/jquery.cycle/3.03/jquery.cycle.all.min",
		datgui: "//cdnjs.cloudflare.com/ajax/libs/dat-gui/0.5/dat.gui.min",
		FileSaver: "//cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2014-11-29/FileSaver.min",
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


require(
	[
		"Utils",
		"CellSpace/State",
		"CellSpace/Setup",
		"CellSpace/GameLoop",
		"CellSpace/GUI",
		"CellSpace/Utils",
		"devMode"
	],
	function(utils, gameState, csSetup, csGame, csUI, csUtils) {
        "use strict";
        csSetup.setup(function () {
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
            window.gameState = gameState;
            // update "perfStartedJSTime","perfFinishedJSTime", "perfRequireTime"
            gameState.gui.__folders.Debug.__controllers.forEach(function(currentValue){currentValue.updateDisplay()});
            gameState.mainLoop.start();
        });
    }
);

require(["story/StoryTeller"]);
