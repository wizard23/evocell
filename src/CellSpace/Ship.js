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

        this.radius = 3;
        this.x = args.x;
        this.y = args.y;
        this.direction = 0;
        this.speed = 0;
        // derived values
        this.dx = 0;
        this.dy = 0;
        this.frontShots = 3;
		this.frontShotAngle = 0.2;
        this.shieldEnergy = Ship.MAX_SHIELD;
        this.blasterEnergy = Ship.MAX_BLASTER;
        this.snd_blaster = new Audio(GLOBALS.resPath + "sound/Digital_SFX_Set/laser6.mp3");
        this.snd_bomb = new Audio(GLOBALS.resPath + "sound/Digital_SFX_Set/laser4.mp3");
        this.shots = new EC.ParticleSystem(args.reactor, GLOBALS.maxParticles, GLOBALS.gameW, GLOBALS.gameH);
        this.bAngle = 0; // direction of bomb fire
        this.bombPower = 8;
    };
    // constants:
    Ship.MAX_BLASTER = 100;
    Ship.MAX_SHIELD = 500;

    // public methods:
    Ship.prototype.step = function(){
        // runs once per gameLoop
        if (this.blasterEnergy < Ship.MAX_BLASTER){
            this.blasterEnergy += 1;
        }
    };
    Ship.prototype.fireBomb = function(){
        // spaw bomb-shot if enough blaster energy
        var bombCost = this.bombPower;
		if (this.blasterEnergy - bombCost > 0){
		    this.blasterEnergy -= bombCost;
            for (var i = 0; i < this.bombPower; i++){
                this.bAngle += Math.PI * 2 / 1.61803398875;
                this.shots.allocateSphere(1,
                    this.x -1*GLOBALS.scrollX, this.y -1*GLOBALS.scrollY,
                    GLOBALS.shotSpeed, this.bAngle,
                    this.speedX, this.speedY);
            }
            utils.playSound(this.snd_bomb);
        } else {
            return  // TODO: play no-energy sound and show visual effect
        }
    }
    Ship.prototype.fireShotAt = function(tx, ty) {
		// spawn shot if enough energy available
		var shotCost = this.frontShots;
		if (this.blasterEnergy - shotCost > 0){
		    this.blasterEnergy -= shotCost;
            var dX = tx-this.x;
            var dY = ty-this.y;
            var dL = Math.sqrt(dX*dX+dY*dY);

            var sX = GLOBALS.shotSpeed * dX/dL;
            var sY = GLOBALS.shotSpeed * dY/dL;

            sX += this.speedX;
            sY += this.speedY;

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