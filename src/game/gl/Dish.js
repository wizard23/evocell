var EvoCell;
if (!EvoCell) {
    EvoCell = {};
}

// Rules and Dishes brauchen gemeinsames Basisobjekt das eine Textur zurueckgibt

EvoCell.Dish = function(reactor, w, h)
{
	this.gl = reactor.gl;

	setSize(w, h);
}

EvoCell.Dish.prototype.flip()
{
	this.pageFlip = -this.pageFlip;
}


EvoCell.Dish.prototype.setSize(w, h)
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

	// TODO get rid of density!!!!
	this.texture1 = createFrameTextureRandom(this.gl, this.width, this.height, this.ruleData.nrStates, density);
	this.texture2 = createFrameTextureRandom(this.gl, this.width, this.height, this.ruleData.nrStates, density);

	this.fb1 = this.gl.createFramebuffer();
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb1);
	this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture1, 0);

	this.fb2 = this.gl.createFramebuffer();
	this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb2);
	this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.texture2, 0);	

	this.frameFlip = 1;
}

EvoCell.Dish.prototype.getCurrentTexture = function() 
{
	return (this.frameFlip > 0) ? this.texture1 : this.texture2;
}

EvoCell.Dish.prototype.getNextFramebuffer = function() 
{
	return (this.frameFlip > 0) ? this.fb2 : this.fb1;
}

