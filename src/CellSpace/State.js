define(["backbone", "three", "datgui", "Utils"], function(Backbone, THREE, dat, utils) {
	"use strict";


// 	// Define a Todo Model
// var Layer = Backbone.Model.extend({
//   // Default todo attribute values
//   defaults: {
//   	name: "no name given",
//     palette: null,
//     rule: null,
//     dish: null,
//   }
// });


//var Layers = 

// Instantiate the Todo Model with a title, with the completed attribute
// defaulting to false
// var myTodo = new Todo({
//   title: 'Check attributes property of the logged models in the console.'
// });

	var resPath = "../res_evocell/";
	var libPath = "../" + resPath + "src/libs/";


	var gameState = {
		// APPSTATE ///////////
		canvas: null,
		reactor: null,
		gl: null,
		renderLoop: null,
		gui: new dat.GUI(),
		//fpsMonotor: null,
		keyboard: utils.keyboard,

		pause: false,
		doOnestep: false,
		
		// GAMESTATE //////////
		// shots
		maxParticles: 2800,
		shotSpeed: 3.4,
		frontShots: 3,
		frontShotAngle: 0.6,
		shotN: 8,
		bombFired: 0,
		bAngle: 0, // direction of bomb fire

		autoFireCounter: 0,
		autoFireOn: 0,
		lastMouseNDC: new THREE.Vector2(),

		shaders: {},
		dishes: {},
		rules: {},
		colors: {},
		shots: null,

		gameW: 356, gameH: 356,
		screenW: window.innerWidth ? window.innerWidth : 1000,
		screenH: window.innerHeight ? window.innerHeight :800,

		randomDensity: 0.001,

		zoom: 1/3, // cell/pixel ratio
		rot: 0,

		cameraAngle: 60 * (Math.PI/180),
		viewMatrix: new THREE.Matrix4(),
		projectionMatrix: new THREE.Matrix4(),

		enableScrolling: 1,
		renderer: "Simple", // "Cell", "TV", "Simple", "Fast"
		shipX: 0, shipY: 0,
		shipRadius: 3,
		shipDir: Math.PI/2,
		shipSpeed: 1.5,
		shipSpeedX: 0, shipSpeedY: 0, // derived values

		scrollX: 0, scrollY: 0,
		parallaxX: 0, parallaxY: 0,
		playerEnergy: 1000,
		stepSize: 1.5, 
		
		mouseMode: "shoot",	
		// HACK: find better init solution
		cnt: 100, // used for executing dishes.enemy only every nth tep

		sndInit: new Audio(resPath + "sound/Digital_SFX_Set/laser3.mp3"), 
		snd: new Audio(resPath + "sound/Digital_SFX_Set/laser6.mp3"), 
		sndBomb: new Audio(resPath + "sound/Digital_SFX_Set/laser4.mp3"), 
		sndHit: new Audio(resPath + "sound/Digital_SFX_Set/laser9.mp3"), 
		sndHit2: new Audio(resPath + "sound/Digital_SFX_Set/laser9.mp3"),

		// game model
		civX: 0.1,
		civY: 0.1,
		civZ: 0.1,
		civW: 0.1,

		clipX: 0.1,
		clipY: 0.1,

		drawModel: new Backbone.Model({
			availableRules: [],
			selectedRules: [],

			// TODO: should all be populated
			availableLayers: [], // gets populated
			availableStates: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24],

			drawSizeX: 10,
			drawSizeY: 20,
			selectedDrawShape : "circle",
			selectedStates : [3],
			selectedLayers : ["enemyshield"],
		}), 

		selection : {
			active: true,
			size: [100, 100],
			pos:[100, 120],
			downPos: [],
		},

		// Example: local resources in the same directory
		// resPath: "./"
		// resources in res_evocell repository
		resPath: resPath,
		libPath: libPath,

		// performance measures
		perfStartJSTime: -0.001,
		perfRequireTime: -0.001,
		perfFinishedJSTime: -0.001,
		showBuffer: false,
	};	

	return gameState;
});