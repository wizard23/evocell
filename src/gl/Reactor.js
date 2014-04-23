define(["gl/GLHelper", "gl/Dish", "gl/Rule"], function(glhelper, Dish, Rule) {
	var Reactor = function(canvas, w, h)
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

		this.setDefaultDishSize(w, h);		
		this.canvas = canvas;
		this.renderWidth = canvas.width;
		this.renderHeight = canvas.height;
		this.gl = gl;

		this.rules = {};
		this.dishes = {};
		this.palettes = {};

		this.posBuffer = posBuffer;
		this.texCoordOffset = texCoordOffset;
	};

	Reactor.prototype.setRenderSize = function(w, h)
	{
		this.canvas.width = w;
		this.canvas.height = h;
		this.renderWidth = w;
		this.renderHeight = h;
	}; 
	Reactor.prototype.setDefaultDishSize = function(w, h)
	{
		this.defaultDishSize = {width: w, height : h};
	}; 
	
	Reactor.prototype.paintDish = function(paintShader, dish, dish2, callback)
	{
		this.gl.viewport(0,0, this.renderWidth, this.renderHeight);
		var bindCallback = function(gl, progCA)
		{
			gl.uniform1i(gl.getUniformLocation(progCA, "texFrame"), 0);
			gl.activeTexture(gl.TEXTURE0);    
			gl.bindTexture(gl.TEXTURE_2D, dish.getCurrentTexture());

			gl.uniform1i(gl.getUniformLocation(progCA, "texFrame2"), 1);
			gl.activeTexture(gl.TEXTURE1);    
			gl.bindTexture(gl.TEXTURE_2D, dish2.getCurrentTexture());

			if (callback)
				callback(gl, progCA);
		};

		this.applyShader(paintShader, null, bindCallback);
	};

	// main function to call
	Reactor.prototype.mixDish = function(mixShader, mainDish, parameters, callback)
	{
		this.gl.viewport(0,0, mainDish.width, mainDish.height);
		var framebuffer = mainDish.getNextFramebuffer();
		var bindCallback = function(gl, progCA)
		{
			// set param for shader to TEXTURE0
			gl.uniform1i(gl.getUniformLocation(progCA, "texFrame"), 0);
			// set glcontext TEXTURE0 to current frame of mainDish
			gl.activeTexture(gl.TEXTURE0);    
			gl.bindTexture(gl.TEXTURE_2D, mainDish.getCurrentTexture());

		// TODO: if arrays (not dictionaries) then name tex1, tex2, tex3, ...
			var textureCount = 1;
			for (var paramName in parameters) {
				var param = parameters[paramName];
				// type conversion
				if (param instanceof Dish) {
					param = param.getCurrentTexture();
				}

				// distinguish types				
				if (param instanceof WebGLTexture) {
					gl.uniform1i(gl.getUniformLocation(progCA, paramName), textureCount);
					gl.activeTexture(gl.TEXTURE0 + textureCount);    
					gl.bindTexture(gl.TEXTURE_2D, param);	
					textureCount++;
				}
				else {
					//if (param is int) // TODO: int 
					if (typeof param === "number") {
						gl.uniform1f(gl.getUniformLocation(progCA, paramName), param);
					}
					else {
						var l = param.length;
						if (l === 2) {
							gl.uniform2f(gl.getUniformLocation(progCA, paramName), param[0], param[1]);
						}
						else if (l === 4) {
							gl.uniform4f(gl.getUniformLocation(progCA, paramName), param[0], param[1], param[2], param[3]);
						}
					}
				}
			}
			
			if (callback) {
				callback(gl, progCA);
			}
		};
		this.applyShader(mixShader, framebuffer, bindCallback);
		mainDish.flip();
	};

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

	Reactor.prototype.applyShaderOnDish = function(shader, dish, bindCallbackUser)
	{
		this.gl.viewport(0,0, dish.width, dish.height);

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
							"  gl_PointSize = 2.0;" +
							"}";
		}

		var gl = this.gl;
		var shader = gl.createProgram();
		gl.attachShader(shader, glhelper.getShader(gl, gl.VERTEX_SHADER, vertexSrc));
		gl.attachShader(shader, glhelper.getShader(gl, gl.FRAGMENT_SHADER, fragSrc));
		gl.linkProgram(shader);

		return shader;
	};

	Reactor.prototype.compileDish = function(w, h)
	{
		var dish = new Dish(this, w || this.defaultDishSize.width, h || this.defaultDishSize.height);
		return dish;
	};

	Reactor.prototype.compileRule = function(ruleData, dish)
	{
		var rule = new Rule(this, ruleData, dish);
		return rule;
	};

	Reactor.prototype.compilePalette = function(paletteId, colors)
	{
		// does this solve palette troules
	};

	// GL level


	Reactor.prototype.applyShader = function(shader, framebuffer, bindCallback, renderCallbac)
	{
		var gl = this.gl;
	
		gl.useProgram(shader);

		if (framebuffer)
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		else
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		// other arguments
		if (bindCallback) bindCallback(gl, shader);

		if (!renderCallbac) {
			// default arguments for all 3D shader (convention)
			gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
			var aPosLoc = gl.getAttribLocation(shader, "aPos");
			gl.enableVertexAttribArray( aPosLoc );
			var aTexLoc = gl.getAttribLocation(shader, "aTexCoord");
			gl.enableVertexAttribArray( aTexLoc );
			gl.vertexAttribPointer(aPosLoc, 3, gl.FLOAT, gl.FALSE, 0, 0);
			gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, gl.FALSE, 0, this.texCoordOffset);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		}
		else 
			renderCallbac(gl, shader);
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



