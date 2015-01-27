define( ["Utils", "GLOBALS"], function (utils, GLOBALS){
    "use strict";

    function Ship(x, y, gameState){
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

        // things piped in from gameState TODO: remove these somehow
        this.snd = gameState.snd;
        this.shots = gameState.shots;
    };
    Ship.prototype.fireShotAt = function(tx, ty) {
		// spawn shot
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

		utils.playSound(this.snd);
	};

    return Ship;
});