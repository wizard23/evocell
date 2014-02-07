define(["gl/GLHelper", "gl/Dish", "gl/Rule"], function(glhelper, Dish, Rule) {
	var Reactor = function(canvas)
	{
		var gl = getGL(canvas);

		var posBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
		var vertices = new Float32Array([-1,-1,0, 1,-1,0, -1,1,0, 1,1,0]);
		var texCoords = new Float32Array([0,0, 1,0, 0,1, 1,1]);
		var texCoordOffset = vertices.byteLength;
		gl.bufferData(gl.ARRAY_BUFFER, texCoordOffset + texCoords.byteLength, gl.STATIC_DRAW);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, vertices);
		gl.bufferSubData(gl.ARRAY_BUFFER, texCoordOffset, texCoords);

		this.canvas = canvas;
		this.gl = gl;

		this.rules = {};
		this.dishes = {};
		this.palettes = {}

		this.posBuffer = posBuffer;
		this.texCoordOffset = texCoordOffset;
	}

	Reactor.prototype.step = function(rule, dish) 
	{
		var callback = function(gl, progCA)
		{
			gl.uniform1i(gl.getUniformLocation(progCA, "texRule"), 1);
			gl.activeTexture(gl.TEXTURE1);    
			gl.bindTexture(gl.TEXTURE_2D, rule.getTexture());	
		}
		this.applyShaderOnDish(rule.getProgram(), dish, callback);
	}

	Reactor.prototype.compileShader = function(vertexSrc, fragSrc)
	{
		if (!fragSrc)
		{
			fragSrc = vertexSrc;
			vertexSrc = "attribute vec3 aPos;" +
							"attribute vec2 aTexCoord;" +	
							"varying   vec2 vTexCoord;" +
							"void main(void) {" +
							"	gl_Position = vec4(aPos, 1.);" +
							"	vTexCoord = aTexCoord;" +
							"}";
		}

		var gl = this.gl;
		var shader = gl.createProgram();
		gl.attachShader(shader, glhelper.getShader(gl, gl.VERTEX_SHADER, vertexSrc));
		gl.attachShader(shader, glhelper.getShader(gl, gl.FRAGMENT_SHADER, fragSrc));
		gl.linkProgram(shader);

		return shader;
	}

	Reactor.prototype.compileDish = function(w, h)
	{
		var dish = new Dish(this, w, h);
		return dish;
	}

	Reactor.prototype.compileRule = function(ruleData)
	{
		var rule = new Rule(this, ruleData);
		return rule;
	}

	Reactor.prototype.loadPalette = function(paletteId, colors)
	{
	}

	// GL level

	Reactor.prototype.applyShaderOnDish = function(shader, dish, bindCallbackUser)
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


	Reactor.prototype.applyShader = function(shader, framebuffer, bindCallback)
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
		gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
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

	// helpers
	function getGL(c) {
		var gl = null;
	
		try 
		{ 
			gl = c.getContext("experimental-webgl", {depth : false });
		} 
		catch(e) {}
		if (!gl) 
		{ 
			alert("Your browser does not support WebGL"); 
			return null; 
		}
		return gl;
	}

	return Reactor;
});


