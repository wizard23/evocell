define(["backbone", "three", "datgui", "Utils", "CellSpace/Ship", "GLOBALS", "EvoCell"],
    function(Backbone, THREE, dat, utils, Ship, GLOBALS, EC) {
	"use strict";

	var gameState = {
		// APPSTATE ///////////
		canvas: GLOBALS.canvasElement,
		reactor: new EC.Reactor(GLOBALS.canvasElement, GLOBALS.gameW, GLOBALS.gameH),
		gui: new dat.GUI(),
		//fpsMonotor: null,
		keyboard: utils.keyboard,

		shaders: {},
		dishes: {},
		rules: {},
		colors: {},

		pause: false,
		doOnestep: false,
		
		// GAMESTATE //////////
		// shots
		shotN: 8,
		bombFired: 0,
		bAngle: 0, // direction of bomb fire

		autoFireCounter: 0,
		autoFireOn: 0,
		lastMouseNDC: new THREE.Vector2(),
		
		screenW: window.innerWidth ? window.innerWidth : 1000,
		screenH: window.innerHeight ? window.innerHeight :800,

		randomDensity: 0.001,
		enemySpeed: 0.5,
		weaponExplosionParam: 3,

		zoom: 1/3, // cell/pixel ratio
		rot: 0,

		cameraAngle: 60 * (Math.PI/180),
		viewMatrix: new THREE.Matrix4(),
		projectionMatrix: new THREE.Matrix4(),

		enableScrolling: 1,
		renderer: "Simple", // "Cell", "TV", "Simple", "Fast"

		parallaxX: 0, parallaxY: 0,
		stepSize: 1.5,
		
		mouseMode: "shoot",	
		// HACK: find better init solution
		cnt: 100, // used for executing dishes.enemy only every nth tep

		sndInit: new Audio(GLOBALS.resPath + "sound/Digital_SFX_Set/laser3.mp3"),
		snd: new Audio(GLOBALS.resPath + "sound/Digital_SFX_Set/laser6.mp3"),
		sndBomb: new Audio(GLOBALS.resPath + "sound/Digital_SFX_Set/laser4.mp3"),
		sndHit: new Audio(GLOBALS.resPath + "sound/Digital_SFX_Set/laser9.mp3"),
		sndHit2: new Audio(GLOBALS.resPath + "sound/Digital_SFX_Set/laser9.mp3"),

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

			drawSizeX: 30,
			drawSizeY: 30,
			selectedDrawShape : "circle",
			selectedStates : [3],
			selectedLayers : ["enemy"],
		}), 

		selection : {
			active: false,
			size: [0, 0],
			pos:[0, 0],
			downPos: [0, 0],
			lastPos: [0, 0],
		},

		// performance measures
		perfStartJSTime: -0.001,
		perfRequireTime: -0.001,
		perfFinishedJSTime: -0.001,
		showBuffer: false,
		showRule: false,
	};

	gameState.shots = new EC.ParticleSystem(gameState.reactor, GLOBALS.maxParticles, GLOBALS.gameW, GLOBALS.gameH);
    gameState.ship = new Ship(0, 0, gameState);

	return gameState;
});