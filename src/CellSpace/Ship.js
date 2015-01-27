define( ["Utils", "GLOBALS", "EvoCell"], function (utils, GLOBALS, EC){
    "use strict";

    function Ship(x, y, reactor){
        // creates a new ship at x, y

        // ensures that the callee has invoked our Class' constructor function w/ the `new` keyword
        if (!(this instanceof Ship)) {
            throw new TypeError("Ship constructor cannot be called as a function.");
        }
        this.radius = 3;
        this.x = x;
        this.y = y;
        this.direction = 0;
        this.speed = 0;
        // derived values
        this.dx = 0;
        this.dy = 0;
        this.frontShots = 3;
		this.frontShotAngle = 0.2;
        this.shieldEnergy = 1000;
        this.blasterEnergy = 1000;
        this.snd_blaster = new Audio(GLOBALS.resPath + "sound/Digital_SFX_Set/laser6.mp3");
        this.snd_bomb = new Audio(GLOBALS.resPath + "sound/Digital_SFX_Set/laser4.mp3");
        this.shots = new EC.ParticleSystem(reactor, GLOBALS.maxParticles, GLOBALS.gameW, GLOBALS.gameH);
        this.hit = false;  // boolean to indicate damage taken each frame
        this.bAngle = 0; // direction of bomb fire
        this.bombPower = 8;
    };
    Ship.prototype.step = function(){
        // runs once per gameLoop
        if (this.blasterEnergy <= 1000){
            this.blasterEnergy += 1;
        }

        if (this.hit) {
            this.shieldEnergy -= 1;
            this.hit = false;
        }
    };
    Ship.prototype.fireBomb = function(){
        for (var i = 0; i < this.bombPower; i++){
            this.bAngle += Math.PI * 2 / 1.61803398875;
            this.shots.allocateSphere(1,
                this.x -1*GLOBALS.scrollX, this.y -1*GLOBALS.scrollY,
                GLOBALS.shotSpeed, this.bAngle,
                this.speedX, this.speedY);
        }
        utils.playSound(this.snd_bomb);
    }
    Ship.prototype.fireShotAt = function(tx, ty) {
		// spawn shot if enough energy available
		var shotCost = this.frontShots*10;
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

    return Ship;
});