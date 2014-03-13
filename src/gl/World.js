

var World = function(gl) {
	this.gl = gl;
	this.dishes = {};
	this.shaders = {};

	this.setup()
	this.loader = function(callback) {
		//callback(data);
	}
	
	this.mouseDown = function() {
	}
	this.stepInteract= function() {
	}
	this.step = function() {
	}
	this.render = function() {
	}

}

var SimpleWorld = function() {
	
}

var CellSpaceWorld = new EC.World({
	dishes: {
		shipDish: {},
		largerEnemyDish: {width = 1024, height: 512}
	
	shaders:
	
	 

