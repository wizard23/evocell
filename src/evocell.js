


// returns an object with up to 3 fileds: neighbourhood, ruletable, pattern
// or null if a filefomat error is detected
function loadEvoCellFile(arrayBuffer) {
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

function generateEvoCellTexture(gl, evoCellData) {
	var xN = Math.ceil(evoCellData.nrNeighbours/2);
	var yN = Math.floor(evoCellData.nrNeighbours/2);

	var width = Math.pow(evoCellData.nrStates, xN);
	var height = Math.pow(evoCellData.nrStates, yN);
	
	var pixels = [];
	for(var i = 0; i < height; i++) // y axis
	{
		for(var j = 0; j < width; j++) // x axis
		{
			var v = evoCellData.ruleTable[i*width+j];
			pixels.push(0, 	0, 0, v);
		}
	}
	//return createRGBATexture(gl, width, height, new Uint8Array(pixels));
	
	
	var texture = createCATexture(gl, width, height, evoCellData.ruleTable);
	
	return texture;	
}


var EvoCellShaderTemplate = 
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
"}";

function getShaderFromEvoCellData(gl, evoCellData, xres, yres)
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
	
	var shaderSource = EvoCellShaderTemplate;
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