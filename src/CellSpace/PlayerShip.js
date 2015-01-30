// extends ship class to add functions only available to a player ship (scoring/controls/UI/etc)

define( ["CellSpace/Ship", "CellSpace/Score"], function (Ship, Score){
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
    };
    // inheritance:
    PlayerShip.prototype = Object.create(Ship.prototype);

    // what is this and do I need it?
    //PlayerShip.prototype.constructor = PlayerShip;

    PlayerShip.prototype.step = function(){
        this.score.step({ship:this});
        return Ship.prototype.step.call(this);
    };

    return PlayerShip;
});