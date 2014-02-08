define(["gl/GLHelper"], function(glhelper) {
	// RulesTexture and Dishes brauchen gemeinsames Basisobjekt das eine Textur zurueckgibt, RuleTexture ist auch ein shader
	// public interface
	var Palette = function(reactor)
	{
		this.reactor = reactor;
		this.gl = reactor.gl;
	
		this.colors = [];
	}

	Palette.prototype.setColor = function(index, color)
	{
		this.colors[index] = color;
		this.invalidateProgram();
	}

	Palette.prototype.getTexture = function()
	{
		if (!this.texture) {
			var pixels = [];
			for(var j = 0; j < 256; j++) // x axis
			{
				var color = this.colors[j];
				if (color)
				{
					pixels.push(color[0]);
					pixels.push(color[1]);
					pixels.push(color[2]);
					pixels.push(color[3]);
				}
				else
					pixels = pixels.concat([0,1,0,1]);
			}
			
			this.texture = glhelper.createRGBATexture(this.	gl, 256, 1, new Uint8Array(pixels));
		}
		return this.texture;
	}

	Palette.prototype.invalidateProgram = function() 
	{
		this.ruleTexture = null;
	}

	return Palette;
});
