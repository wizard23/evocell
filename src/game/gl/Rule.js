var EvoCell;
if (!EvoCell) {
    EvoCell = {};
}

// RulesTexture and Dishes brauchen gemeinsames Basisobjekt das eine Textur zurueckgibt, RuleTexture ist auch ein shader

// public interface

EvoCell.Rule = function(reactor, ruleData)
{
	this.gl = reactor.gl;
	if (ruleData)
		this.setRule(ruleData);
}

EvoCell.Rule.prototype.setRule(ruleData)
{
	this.ruleData = ruleData;

	var xN = Math.ceil(ruleData.nrNeighbours/2);
	var yN = Math.floor(ruleData.nrNeighbours/2);
	var width = Math.pow(ruleData.nrStates, xN);
	var height = Math.pow(ruleData.nrStates, yN);
	this.ruleTexture  = createCATexture(this.gl, width, height, ruleData.ruleTable);	

	this.width = width;
	this.height = height;

	this.invalidateProgram();
}

EvoCell.Rule.prototype.getTexture = function()
{
	return ruleTexture;
}

EvoCell.Rule.prototype.getProgram = function() 
{
	if (this.program == null)
	{
		if (this.width == null || this.height == null || this.ruleData == null)
		{
			throw "You have to set the rule, and the size of the ca";
		}
		
		var newProgCA  = this.gl.createProgram();

		this.gl.attachShader(newProgCA, getShaderFromElement(this.gl, "shader-vs-passthrough" ));
		this.gl.attachShader(newProgCA, EvoCell.getFragmentShaderSourceFromEvoCellData(this.gl, this.ruleData, this.width, this.height));
		this.gl.linkProgram(newProgCA);
		this.program = newProgCA; 
		
		this.randomize(0.1)
		
		this.frameFlip = 1;
		this.frameCount = 0;
	}
	
	return this.program;
}

// private

EvoCell.Rule.prototype.invalidateProgram = function() 
{
	this.program = null;
}
