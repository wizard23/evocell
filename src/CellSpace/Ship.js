define( ["Utils", "GLOBALS", "EvoCell"], function (utils, GLOBALS, EC){
    "use strict";

    function Ship(args){
        // creates a new ship at x, y

        // check for required arguments
        if (typeof args.x === undefined || typeof args.y === undefined || typeof args.reactor === undefined){
            console.log('ERR: missing args:', args);
            throw new Error("Required args not passed to Ship constructor");
        }
        // ensures that the callee has invoked our Class' constructor function w/ the `new` keyword
        if (!(this instanceof Ship)) {
            throw new TypeError("Ship constructor cannot be called as a function.");
        }

        // physical characteristics
        this.radius = 3;

        // position
        this.x = args.x;
        this.y = args.y;
        this.direction = 0;
        this.speed = 0;
        this.dx = 0;
        this.dy = 0;

        // ship engine / movement
        this.rotSpeed = 0.15;
		this.accel = 0.1;
		this.minSpeed = -1;
		this.maxSpeed = 3;

        // shielding
        this.shieldEnergy = Ship.MAX_SHIELD;

        // weapon systems
        this.blasterEnergy = Ship.MAX_BLASTER;
        this.blasterRegenRate = 1;
        this.shots = new EC.ParticleSystem(args.reactor, GLOBALS.maxParticles, GLOBALS.gameW, GLOBALS.gameH);
        // ===> primary blaster
        this.frontShots = 3;
		this.frontShotAngle = 0.2;
        // ===> "bomb" shot
        this.bAngle = 0; // direction of bomb fire
        this.bombPower = 8;

        // sounds
        this.snd_blaster = new Audio(GLOBALS.resPath + "sound/Digital_SFX_Set/laser6.mp3");
        this.snd_bomb = new Audio(GLOBALS.resPath + "sound/Digital_SFX_Set/laser4.mp3");
    };
    // constants:
    Ship.MAX_BLASTER = 1000;
    Ship.MAX_SHIELD = 500;
    Ship.ENERGY_PER_BLASTER = 10;

    // public methods:
    Ship.prototype.step = function(){
        // runs once per gameLoop

        if (this.blasterEnergy < Ship.MAX_BLASTER){
            this.blasterEnergy += this.blasterRegenRate;
        }

        // move ship
        this.dx = this.speed * Math.cos(this.direction);
		this.dy = this.speed * Math.sin(this.direction);
		this.x += this.dx;
		this.y += this.dy;
    };
    Ship.prototype.respawn = function(){
        // spawns new ship after death
        this.score.reset();
        this.shieldEnergy = Ship.MAX_SHIELD;
        this.blasterEnergy = Ship.MAX_BLASTER;
    }
    Ship.prototype.fireBomb = function(){
        // spaw bomb-shot if enough blaster energy
        var bombCost = this.bombPower*Ship.ENERGY_PER_BLASTER;
		if (this.blasterEnergy - bombCost > 0){
		    this.blasterEnergy -= bombCost;
            for (var i = 0; i < this.bombPower; i++){
                this.bAngle += Math.PI * 2 / 1.61803398875;
                this.shots.allocateSphere(1,
                    this.x -1*GLOBALS.scrollX, this.y -1*GLOBALS.scrollY,
                    GLOBALS.shotSpeed, this.bAngle,
                    this.dx, this.dy);
            }
            utils.playSound(this.snd_bomb);
        } else {
            return  // TODO: play no-energy sound and show visual effect
        }
    }
    Ship.prototype.fireShotAt = function(tx, ty) {
		// spawn shot if enough energy available
		var shotCost = this.frontShots*Ship.ENERGY_PER_BLASTER;
		if (this.blasterEnergy - shotCost > 0){
		    this.blasterEnergy -= shotCost;
            var dX = tx-this.x;
            var dY = ty-this.y;
            var dL = Math.sqrt(dX*dX+dY*dY);

            var sX = GLOBALS.shotSpeed * dX/dL;
            var sY = GLOBALS.shotSpeed * dY/dL;

            sX += this.dx
            sY += this.dy;

            var aa = this.frontShots > 1 ? -this.frontShotAngle/2 : 0;

            for (var i = 0; i < this.frontShots; i++) {
                this.shots.allocateParticle(this.x-1*GLOBALS.scrollX, this.y-1*GLOBALS.scrollY,
                    Math.cos(aa)*sX + Math.sin(aa)*sY, -Math.sin(aa)*sX + Math.cos(aa)*sY);

                if (this.frontShots > 1)
                    aa += this.frontShotAngle/(this.frontShots-1);
            }

            utils.playSound(this.snd_blaster);
        } else {
            return  // TODO: play no-energy sound and show visual effect
        }
	};
	Ship.prototype.collide = function(pixelArry){
	    // collides the ship with given pixel array
	    // returns true if collision, else returns false
	    var pX, pY;
	    var is_hit = false;
        for (pX = -this.radius; pX <= this.radius; pX++) {
            for (pY = -this.radius; pY <= this.radius; pY++) {

                var xxx = Math.round(this.x + pX);
                var yyy = Math.round(this.y + pY);

                if (pixelArry[(xxx+yyy*GLOBALS.gameW)*4 + 3] !== 0) {
                    is_hit = true;  // TODO: can we use this.hit here?
                    this.shieldEnergy -= 1;

    //				reactor.mixDish(gameState.shaders.drawCircle, gameState.dishes.weapon,
    //	{center: [this.x + pX, this.y + pY], radius: 1.5, state: (gameState.rules.ship.nrStates-1)/255});
                }
            }
        }
        return is_hit;
	}

    return Ship;
});