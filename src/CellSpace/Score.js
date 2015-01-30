// score class used to represent the history of one game (scores/achievements/etc)

define( [], function (){
    "use strict";

    function Score(args){
        // creates a new score

        // check for required arguments
        if (typeof args.difficulty === undefined){
            console.log('ERR: missing args:', args);
            throw new Error("Required args not passed to Score constructor");
        }
        // ensures that the callee has invoked our Class' constructor function w/ the `new` keyword
        if (!(this instanceof Score)) {
            throw new TypeError("Score constructor cannot be called as a function.");
        }

        this.difficulty = args.difficulty;

        this.score = 0;  // the aggregate score
        this.distance = 0;  // distance traveled by player
        this.kills = 0;  // enemy killcount

        this.highScore = 0;  // best score this session

        this.displayElement = document.getElementById('shipGUI');
    }

    // constants
    Score.DIFFICULTY_LEVEL = {EASY:1, NORMAL:2, HARD:3};
    Score.MOVEMENT_BONUS = 2;

    // public methods
    Score.prototype.step = function(args){
        // should be called once per frame
        // basic score increase by 1 for survival
        this.score += 1;

        // movement bonus
        var movement = args.ship.dy*args.ship.dy + args.ship.dx*args.ship.dx;  // cheap estimate
        this.distance += movement;
        this.score += movement * Score.MOVEMENT_BONUS;

        // TODO: hit / kill count

        if (this.score > this.highScore){
            this.highScore = this.score;
        }

        this.draw();
    }

    Score.prototype.draw = function(){
        this.displayElement.innerHTML = 'score:' + this.score + '    best:' + this.highScore + '<br>' +
            'distance traveled:' + this.distance + '    kills:' + this.kills;
    }

    Score.prototype.reset = function(){
        // resets score(s)
        this.score = 0;
        this.distance = 0;
        this.kills = 0;
    }

    return Score;
});