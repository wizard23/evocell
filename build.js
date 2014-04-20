// build wirg:
// node r.js -o build.js



({
    baseUrl: "src",
    name: "CellSpace",
    out: "main-built.js",

    optimize: "none",
    wrapShim: 'true',

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
})