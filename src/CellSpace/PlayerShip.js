// extends ship class to add functions only available to a player ship (scoring/controls/UI/etc)

define( ["GLOBALS", "CellSpace/Ship", "CellSpace/Score"], function (GLOBALS, Ship, Score){
    "use strict";

    function PlayerShip(args){
        // ensures that the callee has invoked our Class' constructor function w/ the `new` keyword
        if (!(this instanceof PlayerShip)) {
            throw new TypeError("PlayerShip constructor cannot be called as a function.");
        }

        if (typeof args.difficulty === undefined){
            args.difficulty = Score.DIFFICULTY_LEVEL.NORMAL;
        }
        this.score = new Score(args);
        Ship.call(this, args);

        this.gui = new dat.GUI({ autoPlace: false });

        this.gui.add(this, 'shieldEnergy', 0, Ship.MAX_SHIELD).listen();
		this.gui.add(this, 'blasterEnergy', 0, Ship.MAX_BLASTER).listen();

		this.gui.add(this.score, 'score').listen();
		this.gui.add(this.score, 'kills').listen();
		this.gui.add(this.score, 'distance').listen();
		this.gui.add(this.score, 'highScore').listen();

        this.guiContainer = document.getElementById('shipGUI');
        this.guiContainer.appendChild(this.gui.domElement);
        this.repositionHUD();
        //console.log(this);
    };
    // inheritance:
    PlayerShip.prototype = Object.create(Ship.prototype);

    // what is this and do I need it?
    //PlayerShip.prototype.constructor = PlayerShip;

    PlayerShip.prototype.step = function(){
        this.score.step({ship:this});
        return Ship.prototype.step.call(this);
    };
    PlayerShip.prototype.repositionHUD = function(){
        // for some reason CSS won't do the trick here so we need to do it manually...
        var x_pos, y_pos;
        this.guiContainer.style.position = "absolute";
        this.guiContainer.style.left = '1%';
        this.guiContainer.style.bottom = '8px';
        this.guiContainer.style.zIndex = 199;
    }

    PlayerShip.prototype.control = function(keyboard){
	    // checks given keyboard inputs for ship controls

	    // shoot straight ahead
		if (keyboard.isPressed("X".charCodeAt()))
		{
			var tx = this.x + Math.cos(this.direction);
			var ty = this.y + Math.sin(this.direction);
			this.fireShotAt(tx, ty);
		}

        // direction/speed based control of ship
		if (keyboard.isPressed(keyboard.UP)) {
			this.speed += this.accel;
			if (this.speed > this.maxSpeed)
				this.speed = this.maxSpeed;
		}
		if (keyboard.isPressed(keyboard.DOWN)) {
			if (this.speed > 0) {
				this.speed -= this.accel;
				if (this.speed < 0) {
					this.speed = 0;
					this.allowReturn = 0;
				}
			}
			else if (this.allowReturn) {
				this.speed -= this.accel;
				if (this.speed < this.minSpeed)
					this.speed = this.minSpeed;
			}
		}
		else {
			this.allowReturn = 1;
		}

		// direction and speed of layer ship
		if (keyboard.isPressed(keyboard.LEFT)) this.direction += this.rotSpeed;
		if (keyboard.isPressed(keyboard.RIGHT)) this.direction -= this.rotSpeed;

        // bomb shot
		if (keyboard.isPressed("B".charCodeAt())) {
            this.fireBomb();
		}

        // wasd shots
		var sDX = 0, sDY = 0;
		if (keyboard.isPressed("D".charCodeAt()))
		{
			sDX = 1;
		}
		if (keyboard.isPressed("A".charCodeAt()))
		{
			sDX = -1;
		}
		if (keyboard.isPressed("W".charCodeAt()))
		{
			sDY = 1;
		}
		if (keyboard.isPressed("S".charCodeAt()))
		{
			sDY = -1;
		}
		if (sDX || sDY) {
			if (!this.shotDelay)
			{
				this.shotDelay = 3;
				/*
				var px = (this.x/GLOBALS.gameW)*2 - 1;
				var py = (this.y/GLOBALS.gameH)*2 - 1;
				var sX = sDX * GLOBALS.shotSpeed;
				var sY = sDY*GLOBALS.shotSpeed;

				this.shots.allocateParticle(this.x, this.y, sX, sY);
				*/
                this.fireShotAt(this.x + sDX, this.y + sDY);
			}
			else
				this.shotDelay--;
		}
		else
			this.shotDelay = 0;
	}
	PlayerShip.prototype.lClick = function(clickedPoint){
	    // does whatever the ship should do when user clicks somewhere (shoot)
	    this.fireShotAt(GLOBALS.gameW*(clickedPoint.x+1)/2, GLOBALS.gameH*(clickedPoint.y+1)/2);
        // no autofire for now
        //gameState.autoFireOn = 1 - gameState.autoFireOn;
	}

    return PlayerShip;
});