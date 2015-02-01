// extends ship class to add functions only available to a player ship (scoring/controls/UI/etc)

define( ["jquery", "GLOBALS", "CellSpace/PlayerShip", "CellSpace/Score"], function (jquery, GLOBALS, PlayerShip, Score){
    "use strict";

    function UserScriptedShip(args){
        // ensures that the callee has invoked our Class' constructor function w/ the `new` keyword
        if (!(this instanceof UserScriptedShip)) {
            throw new TypeError("UserScriptedShip constructor cannot be called as a function.");
        }

        if (typeof args.difficulty === undefined){
            args.difficulty = Score.DIFFICULTY_LEVEL.NORMAL;
        }
        PlayerShip.call(this, args);
        this.stepN = 0;
        this.halting = false;
    };
    // inheritance:
    UserScriptedShip.prototype = Object.create(PlayerShip.prototype);

    // what is this and do I need it?
    //UserScriptedShip.prototype.constructor = UserScriptedShip;

    UserScriptedShip.prototype.control = function(args){
        this.stepN += 1;
        if (this.halting){
            if (this.speed > 0){
                this.slowDown();
            } else {
                this.halting = false;
            }
        }
        window.userScript.call(this,args);
    }

    UserScriptedShip.prototype.halt = function(){
        this.halting = true;
    }

    UserScriptedShip.prototype.rotate = function(deg){
        this.direction += deg;
    }

/*	UserScriptedShip.prototype.lClick = function(clickedPoint){
	    // does whatever the ship should do when user clicks somewhere (shoot)
	    this.fireShotAt(GLOBALS.gameW*(clickedPoint.x+1)/2, GLOBALS.gameH*(clickedPoint.y+1)/2);
        // no autofire for now
        //gameState.autoFireOn = 1 - gameState.autoFireOn;
	}
*/

    return UserScriptedShip;
});