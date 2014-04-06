define(["backbone", "three", "datgui", "Utils"], function(Backbone, THREE, dat, utils) {
	"use strict";

	var gameState = {
		// APPSTATE ///////////
		canvas: null,
		reactor: null,
		gl: null,
		renderLoop: null,
		gui: new dat.GUI(),
		//fpsMonotor: null,
		keyboard: utils.keyboard,
		
		// GAMESTATE //////////
		// shots
		maxParticles: 2800,
		shotSpeed: 2.3,
		frontShots: 3,
		frontShotAngle: 0.8,
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

		gameW: 256, gameH: 256,
		screenW: 1200,
		screenH: 900,

		zoom: 1/3, // cell/pixel ratio
		rot: 0,

		cameraAngle: 60 * (Math.PI/180),
		viewMatrix: new THREE.Matrix4(),
		projectionMatrix: new THREE.Matrix4(),

		enableScrolling: 1,
		shipX: 0, shipY: 0,
		scrollX: 0, scrollY: 0,
		parallaxX: 0, parallaxY: 0,
		playerEnergy: 10000,
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

			drawSizeX: 1000,
			drawSizeY: 30,
			selectedDrawShape : "circle",
			selectedStates : [24],
			selectedLayers : ["enemyshield"],
		}), 
	};	

	return gameState;
});