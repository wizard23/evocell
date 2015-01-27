define( [], function (){
    "use strict";

    function Ship(x, y){
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
    };

    return Ship;
});