var EvoCell;
if (!EvoCell) {
    EvoCell = {};
}

//////////////////////////////////////////
// CACanvas
//////////////////////////////////////////

EvoCell.CACanvas = function(canvas)
{
	this.canvas = canvas;
	this.gl = getGL(canvas);
}

EvoCell.CACanvas.prototype.setSize = function(width, height)
{
	this.canvas.width = width;
	this.canvas.height = height;
	this.gl.viewport(0, 0, width, height);
}

EvoCell.CACanvas.prototype.draw = function(ca, progShow, sourceRect, destRect) 
{
	var gl = this.gl;
	gl.useProgram(progShow);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	if (!destRect)
		destRect = [0, 0, this.canvas.width, this.canvas.height];


	//set viewport to match destination rect
	gl.viewport(destRect[0], destRect[1], destRect[2], destRect[3]);
	//gl.viewport(0, 0, this.canvas.width, this.canvas.height);
	

	gl.uniform1i(gl.getUniformLocation(progShow, "texFrame"), 0);
	gl.activeTexture(gl.TEXTURE0);    
	gl.bindTexture(gl.TEXTURE_2D, ca.getTexture());
	
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	gl.flush();
}

//////////////////////////////////////////
// CASimulation
//////////////////////////////////////////

EvoCell.CASimulation = function(caCanvas, ruleData, width, height)
{
	this.caCanvas = caCanvas;
	this.gl = this.caCanvas.gl;
	
	this.setRule(ruleData);
	this.setSize(width, height);
}

EvoCell.CASimulation.prototype.setRule = function(ruleData)
{
	this.ruleData = ruleData;

	var xN = Math.ceil(ruleData.nrNeighbours/2);
	var yN = Math.floor(ruleData.nrNeighbours/2);
	var width = Math.pow(ruleData.nrStates, xN);
	var height = Math.pow(ruleData.nrStates, yN);
	this.ruleTexture  = createCATexture(this.gl, width, height, ruleData.ruleTable);	

	this.invalidateProgram();
}

EvoCell.CASimulation.prototype.setSize = function(width, height)
{
	this.width = width;
	this.height = height;
	this.invalidateProgram();
}

EvoCell.CASimulation.prototype.invalidateProgram = function() 
{
	this.program = null;
}

EvoCell.CASimulation.prototype.getProgram = function() 
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
		
		if (!this.texture1) 
		{
			this.gl.deleteTexture(this.texture1);
		}
		if (!this.texture2) 
		{
			this.gl.deleteTexture(this.texture2);
		}
		
		if (!this.fb1) 
		{
			this.gl.deleteFramebuffer(this.fb1);
		}
		if (!this.fb2) 
		{
			this.gl.deleteFramebuffer(this.fb2);
		}
		
		// TODO get rid of density!!!!
		this.texture1 = createFrameTextureRandom(this.gl, this.width, this.height, 0.1);
		this.texture2 = createFrameTextureRandom(this.gl, this.width, this.height, 0.1);
		
		this.fb1 = this.gl.createFramebuffer();
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb1);
		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture1, 0);
		
		this.fb2 = this.gl.createFramebuffer();
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb2);
		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture2, 0);
		
		this.frameFlip = 1;
		this.frameCount = 0;
	}
	
	return this.program;
}

EvoCell.CASimulation.prototype.getTexture = function() 
{
	return (this.frameFlip > 0) ? this.texture1 : this.texture2;
}

EvoCell.CASimulation.prototype.step = function(steps) 
{
	if (steps == null)
		steps = 1;
		
	var progCA = this.getProgram();
	var gl = this.gl;
		
	gl.viewport(0,0, this.width, this.height);
	for (;steps > 0; steps--)
	{
		
		this.gl.useProgram(progCA);

		if (this.frameFlip > 0)
		{
			gl.uniform1i(gl.getUniformLocation(progCA, "texFrame"), 0);
			gl.activeTexture(gl.TEXTURE0);    
			gl.bindTexture(gl.TEXTURE_2D, this.texture1);
			
			gl.uniform1i(gl.getUniformLocation(progCA, "texRule"), 1);
			gl.activeTexture(gl.TEXTURE1);    
			gl.bindTexture(gl.TEXTURE_2D, this.ruleTexture);

			gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb2);
		}
		else
		{
			gl.uniform1i(gl.getUniformLocation(progCA, "texFrame"), 0);
			gl.activeTexture(gl.TEXTURE0);    
			gl.bindTexture(gl.TEXTURE_2D, this.texture2);
			
			// TODO: diese 3 zeilen rausziehen
			gl.uniform1i(gl.getUniformLocation(progCA, "texRule"), 1);
			gl.activeTexture(gl.TEXTURE1);    
			gl.bindTexture(gl.TEXTURE_2D, this.ruleTexture);
		
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb1);
		}
	 
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		
		// TODO: ist flush notwendig, eventuell erst nach for schleife oder erst wenn jemand auf die textur zugreift
		gl.flush();
		
		this.frameFlip = -this.frameFlip;
		this.frameCount++;
	}
}



//////////////////////////////////////////////////////////
// Static functions
//////////////////////////////////////////////////////////

// used by the ruletable and the state frames
// RGBA for now could be changed to only one channel
function createRGBATexture(gl, width, height, pixels)
{
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	return texture;
}

// used by the ruletable and the state frames
// RGBA for now could be changed to only one channel
function createCATexture(gl, width, height, pixels)
{
	var texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
	//gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(pixels));
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.ALPHA, width, height, 0, gl.ALPHA, gl.UNSIGNED_BYTE, pixels);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	return texture;
}

EvoCell.EvoCellFragmentShaderTemplate = 
"#ifdef GL_ES\n" +
"precision highp float;\n" +
"#endif\n" +
"  uniform sampler2D texFrame;\n" +
"  uniform sampler2D texRule;\n" +
"  \n" +
"  varying vec2 vTexCoord;\n" +
"  const float dx = 1./%XRES%., dy=1./%YRES%.;\n" +
"  const float stateScale = 255.;\n" +
"  const float states = %STATES%.;\n" +
"  const float width = %WIDTH%, height = %HEIGHT%;\n" +
"  \n" +
"  \n" +
"void main(void) {\n" +
"	float v; \n" +
"	float idx = 0.;\n" +
"   %XBLOCK% \n" +
"    \n" +
"   float idy = 0.;\n" +
"   %YBLOCK% \n" +
"    \n" +
"   vec2 vvvv=vec2(0.5/width + idx*stateScale/width, 0.5/height + idy*stateScale/height); \n" +
"	vec4 lookup = 	texture2D(texRule, vvvv);\n" +
"	gl_FragColor =  vec4(0, 0., 0., lookup.a);\n" +
//"   gl_FragColor = vec4(0, 0., vTexCoord.x, vTexCoord.y);\n" +
"}";

EvoCell.getFragmentShaderSourceFromEvoCellData = function (gl, evoCellData, xres, yres)
{
	var xblock = "";
	var yblock = "";
	var nInXBlock = Math.ceil(evoCellData.nrNeighbours/2);
	var vget = "";
	var multiplier = "";
	var widthExpr = "";
	var heightExpr = "";
	
	for (nIndex in evoCellData.neighbourhood)
	{
		var neighbour = evoCellData.neighbourhood[nIndex];
		
		vget = "v = texture2D(texFrame, vTexCoord + vec2(" + neighbour[0] + ".*dx, " + neighbour[1] + ".*dy)).a;\n";
		
		
		if (nIndex < nInXBlock)
		{	
			xblock += vget;
			xblock += "idx += " + multiplier + "v;\n";
			
			if (widthExpr != "")
				widthExpr += "*";
			widthExpr += "states";
		}
		else
		{
			yblock += vget;
			yblock += "idy += " + multiplier + "v;\n";
			
			if (heightExpr != "")
				heightExpr += "*";
			heightExpr += "states";
		}
		
		if (nIndex == nInXBlock-1)
			multiplier = "";
		else
			multiplier += "states*";
	}
	
	var shaderSource = EvoCell.EvoCellFragmentShaderTemplate;
	shaderSource = shaderSource.replace("%STATES%", evoCellData.nrStates);
	shaderSource = shaderSource.replace("%XRES%", xres); // width of the state texture
	shaderSource = shaderSource.replace("%YRES%", yres); // height of the state texture
	shaderSource = shaderSource.replace("%WIDTH%", widthExpr); 	 // width of the rule texture
	shaderSource = shaderSource.replace("%HEIGHT%", heightExpr); // height of the rule texture
	shaderSource = shaderSource.replace("%XBLOCK%", xblock);
	shaderSource = shaderSource.replace("%YBLOCK%", yblock);

	//alert(shaderSource);
	var shaderType = gl.FRAGMENT_SHADER;
	return getShader(gl, shaderType, shaderSource);
}

// returns an object with up to 3 fileds: neighbourhood, ruletable, pattern
// or null if a fileformat error is detected
EvoCell.loadEvoCellFile = function(arrayBuffer) {
	var nrNeighbours, nrStates, nrDimensions;
	var magic, containsRules, containsNeighbourhood, containsPattern, neighbourCount;
	
	var dv = new DataView(arrayBuffer);
	var index = 0;
	
	magic = dv.getUint32(index); index += 4;
	// all evocellfiles must start with 0x002A
	if (magic != 42) return null;
	
	containsRules = dv.getUint32(index); index += 4;
	containsNeighbourhood = dv.getUint32(index); index += 4;
	containsPattern = dv.getUint32(index); index += 4;
	index += 4; // ignore reserved but unused value

	var evoCellData = {};
	
	if (containsRules) {
		var rulesMagic = dv.getUint32(index); index += 4;
		// valid rules must have this magic value here
		if (rulesMagic != 2323) return null;
		nrStates =  dv.getUint32(index); index += 4;
		nrNeighbours  = dv.getUint32(index); index += 4;
	
		var ruleTableSize = Math.pow(nrStates, nrNeighbours);
		var ruleTable = new Uint8Array(arrayBuffer, index, ruleTableSize);
		//var ruleTableView = new Uint8Array(ruleTableSize);
		//var ruleTable = ruleTableView.buffer;
		//alert(ruleTableView.subarray);
		index += ruleTableSize;
		
		evoCellData.containsRule = true;
		evoCellData.nrStates = nrStates;
		evoCellData.nrNeighbours = nrNeighbours;
		evoCellData.ruleTable = ruleTable;
		evoCellData.ruleTableSize = ruleTableSize; // convinient to have but redundant
	}
	else
		evoCellData.containsRule = false;
	
	if (containsNeighbourhood) {
		var neighbourhoodMagic = dv.getUint32(index); index += 4;
		// valid rules must have this magic value here
		if (neighbourhoodMagic != 0x4E31) return null;
		var nrNeighboursRedundant  = dv.getUint32(index); index += 4;
		// nr of neighbours has to match
		if (nrNeighbours != nrNeighboursRedundant) return null;
		nrDimensions =  dv.getUint32(index); index += 4;
		if (nrDimensions != 2) return null;
	
		var neighbourhood = [];
		for (n = 0; n < nrNeighbours; n++)
		{
			var x = dv.getInt32(index); index += 4;
			var y = dv.getInt32(index); index += 4;
			neighbourhood.push([x, y]);
		}
		
		evoCellData.containsNeighbourhood = true;
		evoCellData.nrDimensions = nrDimensions;
		evoCellData.neighbourhood = neighbourhood;
	}
	else
		evoCellData.containsNeighbourhood = false;
	
	if (containsPattern) {
		var patternMagic = dv.getUint32(index); index += 4;
		// valid rules must have this magic value here
		if (patternMagic != 23231) return null;
		var nrDimensions =  dv.getUint32(index); index += 4;
		if (nrDimensions != 2) return null;
	
		var sizeX = dv.getInt32(index); index += 4;
		var sizeY = dv.getInt32(index); index += 4;
		
		var pattern = new Uint8Array(arrayBuffer, index, sizeX*sizeY);

		evoCellData.containsPattern = true;
		evoCellData.patternWidth = sizeX;
		evoCellData.patternHeight = sizeY;
		evoCellData.patternData = pattern;
	}
	else
		evoCellData.containsPattern = false;
	
	return evoCellData;
}
