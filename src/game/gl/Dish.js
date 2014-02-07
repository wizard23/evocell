define(["gl/GLHelper"], function(glhelper) {
	// Rules and Dishes brauchen gemeinsames Basisobjekt das eine Textur zurueckgibt
	Dish = function(reactor, w, h)
	{
		this.gl = reactor.gl;
		this.setSize(w, h);
	}

	Dish.prototype.flip = function()
	{
		this.frameFlip = -this.frameFlip;
	}

	Dish.prototype.setSize = function(w, h)
	{
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

		this.width = w;
		this.height = h;

		this.texture1 = createDishTexture(this.gl, w, h, 0);
		this.texture2 = createDishTexture(this.gl, w, h, 0);

		this.fb1 = this.gl.createFramebuffer();
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb1);
		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture1, 0);

		this.fb2 = this.gl.createFramebuffer();
		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb2);
		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture2, 0);	

		this.frameFlip = 1;
	}

	Dish.prototype.randomize = function(nrStates, density) 
	{
		var texture = createDishTextureRandom(this.gl, this.width, this.height, nrStates, density);
		var fb;

		if (this.frameFlip > 0)
		{
			this.gl.deleteTexture(this.texture1);
			fb = this.fb1;
			this.texture1 = texture;
		}
		else
		{
			this.gl.deleteTexture(this.texture2);
			fb = this.fb2;
			this.texture2 = texture;
		}

		this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fb);
		this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, texture, 0);
	}

	Dish.prototype.getCurrentTexture = function() 
	{
		return (this.frameFlip > 0) ? this.texture1 : this.texture2;
	}

	Dish.prototype.getNextFramebuffer = function() 
	{
		return (this.frameFlip > 0) ? this.fb2 : this.fb1;
	}

	function createDishTexture(gl, width, height, state)
	{
		var pixels = [];
		for(var i = 0; i < height; i++) // y axis
		{
			for(var j = 0; j < width; j++) // x axis
			{
				pixels.push(0);
				pixels.push(0);
				pixels.push(0);
				pixels.push(state);
			}
		}
		// must be RGBA otherwise we cant use it as color attachment of the framebuffer 
		return glhelper.createRGBATexture(gl, width, height, new Uint8Array(pixels))
	}

	function createDishTextureRandom(gl, width, height, states, density)
	{
		var pixels = [];
		for(var i = 0; i < height; i++) // y axis
		{
			for(var j = 0; j < width; j++) // x axis
			{
				if (Math.random() < density) 
				{
					pixels.push(0);
					pixels.push(0);
					pixels.push(0);
					pixels.push(Math.floor(Math.random()*states));
				}
				else
				{
					pixels.push(0);
					pixels.push(0);
					pixels.push(0);
					pixels.push(0);
				}
			}
		}
		// must be RGBA otherwise we cant use it as color attachment of the framebuffer 
		return glhelper.createRGBATexture(gl, width, height, new Uint8Array(pixels))
	}

/*
	function createFrameTextureFromPattern(gl, evoCellData, width, height)
	{
		var pixels = [];
		for(var i = 0; i < height; i++) // y axis
		{
			for(var j = 0; j < width; j++) // x axis
			{
				if (j < evoCellData.patternWidth && i < evoCellData.patternHeight)
				{
					pixels.push(evoCellData.patternData[i*evoCellData.patternWidth+j]);
				}
				else pixels.push(0);
			}
		}
		return createCATexture(gl, width, height, new Uint8Array(pixels));
	}
*/
	return Dish;
});

