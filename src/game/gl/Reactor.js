var EvoCell;
if (!EvoCell) {
    EvoCell = {};
}

// Rules and Dishes brauchen gemeinsames Basisobjekt das eine Textur zurueckgibt

EvoCell.Reactor = function(canvas)
{
	this.canvas = canvas;
	this.gl = getGL(canvas);

	this.rules = {};
	this.dishes = {};
	this.palettes = {}

	var posBuffer = gl.createBuffer();
   gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
   var vertices = new Float32Array([-1,-1,0, 1,-1,0, -1,1,0, 1,1,0]);
   var texCoords = new Float32Array([0,0, 1,0, 0,1, 1,1]);
   var texCoordOffset = vertices.byteLength;
   gl.bufferData(gl.ARRAY_BUFFER, texCoordOffset + texCoords.byteLength, gl.STATIC_DRAW);
   gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
   gl.bufferSubData(gl.ARRAY_BUFFER, texCoordOffset, texCoords);
   
   return {buffer : posBuffer, texCoordOffset : texCoordOffset};
}


EvoCell.Reactor.prototype.step = function(rule, dish) 
{
	var callback = function(gl, progCA)
	{
		gl.uniform1i(gl.getUniformLocation(progCA, "texRule"), 1);
		gl.activeTexture(gl.TEXTURE1);    
		gl.bindTexture(gl.TEXTURE_2D, rule.getTexture());	
	}
	this.applyShaderOnDish(rule.getProgram(), dish, callback);
}



EvoCell.Reactor.prototype.loadRule = function(ruleData)
{
	rule = new Rule(this, ruleData);
	return rule;
}


EvoCell.Reactor.prototype.loadPalette = function(paletteId, colors)
{
}

// GL level

EvoCell.Reactor.prototype.applyShaderOnDish(shader, dish, bindCallbackUser)
{
	var framebuffer = dish.getNextFramebuffer();

	var bindCallback = function(gl, progCA)
	{
		gl.uniform1i(gl.getUniformLocation(progCA, "texFrame"), 0);
		gl.activeTexture(gl.TEXTURE0);    
		gl.bindTexture(gl.TEXTURE_2D, dish.getCurrentTexture());

		if (bindCallbackUser)
			bindCallbackUser(gl, shader);
	}

	this.applyShader(shader, framebuffer, bindCallback)

	dish.flip();
}


EvoCell.Reactor.prototype.applyShader(shader, framebuffer, bindCallback)
{
	var gl = this.gl;
		
	// is it needed??
	//gl.viewport(0,0, framebuffer.width, framebuffer.height);
	
	gl.useProgram(shader);

	if (framebuffer)
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	else
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	// default arguments for all 3D shader (convention)
	gl.bindBuffer(gl.ARRAY_BUFFER, this.bufferAll);
	var aPosLoc = gl.getAttribLocation(shader, "aPos");
	gl.enableVertexAttribArray( aPosLoc );
	var aTexLoc = gl.getAttribLocation(shader, "aTexCoord");
	gl.enableVertexAttribArray( aTexLoc );
	gl.vertexAttribPointer(aPosLoc, 3, gl.FLOAT, gl.FALSE, 0, 0);
	gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, gl.FALSE, 0, this.bufferAllTexCoordOffset);
	
	// other arguments
	bindCallback(gl, shader);

	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}



