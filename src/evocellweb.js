var EvoCell;
if (!EvoCell) {
    EvoCell = {};
}

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

	gl.uniform1i(gl.getUniformLocation(progShow, "texFrame"), 0);
	gl.activeTexture(gl.TEXTURE0);    
	gl.bindTexture(gl.TEXTURE_2D, ca.getTexture());
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	gl.flush();
}

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
	this.ruleTexture = generateEvoCellTexture(this.gl, this.ruleData);
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
		this.gl.attachShader(newProgCA, getShaderFromEvoCellData(this.gl, this.ruleData, this.width, this.height));
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
		this.texture1 = createFrameTextureRandom(this.gl, width, height, 0.1);
		this.texture2 = createFrameTextureRandom(this.gl, width, height, 0.1);
		
		this.fb1 = gl.createFramebuffer();
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