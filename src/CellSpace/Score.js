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

        this._killsScored = 0;  // number of kills which have been accounted for in the main score (used to add new kills to the score)

        this.displayElement = document.getElementById('score-display');
    /*    this.displayElement.style.position = 'fixed';
        bottom: 8px;
        left: 40%;
        color: #ffffff;
        font-size: 15px;
        z-index: 19999;*/
    }

    // constants
    Score.DIFFICULTY_LEVEL = {EASY:1, NORMAL:2, HARD:3};
    Score.MOVEMENT_BONUS = 2;
    Score.KILL_BONUS = 50;

    // public methods
    Score.prototype.step = function(args){
        // should be called once per frame
        // basic score increase by 1 for survival
        this.score += 1;

        // movement bonus
        var movement = Math.floor(args.ship.dy*args.ship.dy + args.ship.dx*args.ship.dx);  // cheap estimate
        this.distance += movement;
        this.score += movement * Score.MOVEMENT_BONUS;

        // add points for new kills
        var newKills = this.kills - this._killsScored;
        if (newKills > 0){
            this.score += newKills * Score.KILL_BONUS;
            this._killsScored = this.kills;
        }

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