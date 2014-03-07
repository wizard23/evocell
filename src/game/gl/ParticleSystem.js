define([], function() {
	var ParticleSystem = function(reactor, n, width, height) {
		this.reactor = reactor;
		var gl = reactor.gl;
		this.gl = gl;
		this.n = n;
		this.width = width;
		this.height = height;
		var pointCoordinates = new Float32Array(2*n);
		var pointSpeeds = new Float32Array(2*n);
		this.pointCoordinates = pointCoordinates;
		this.pointSpeeds = pointSpeeds;
		//var pointAlive = new Array(n);

		for (var i = 0; i < n; i++)
		{
			//pointAlive[i] = 1;
			pointSpeeds[2*i] = 0;
			pointSpeeds[2*i+1] = 0;
			pointCoordinates[2*i] = 10; // outside of bound
			pointCoordinates[2*i+1] = 0;
		}
	
		var pixelValues = new Uint8Array(width*height*4); // for colission deection
		this.pixelValues = pixelValues;

		var pointsBuffer = gl.createBuffer();
		this.pointsBuffer = pointsBuffer;		
		gl.bindBuffer(gl.ARRAY_BUFFER, pointsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, pointCoordinates.byteLength, gl.STATIC_DRAW);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, pointCoordinates);
	}

	ParticleSystem.prototype.draw = function(shader, dish) {
		var gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.pointsBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.pointCoordinates.byteLength, gl.STATIC_DRAW);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pointCoordinates);

		var psContext = this;
		this.reactor.applyShader(shader, dish.getCurrentFramebuffer(), false, function(gl, shader) {
			//gl.bindBuffer(gl.ARRAY_BUFFER, pointsBuffer);
			var pointPosLoc = gl.getAttribLocation(shader, "pointPos");
			gl.enableVertexAttribArray(pointPosLoc);
			gl.vertexAttribPointer(pointPosLoc, 2, gl.FLOAT, gl.FALSE, 0, 0);

			gl.uniform1f(gl.getUniformLocation(shader, "state"), 3./255.);

			gl.drawArrays(gl.POINTS,0, psContext.pointCoordinates.length/2);
		});
	}

	ParticleSystem.prototype.step = function() {
		// move
		for (var i = 0; i < this.n; i++)
		{
			this.pointCoordinates[2*i] += this.pointSpeeds[2*i];
			this.pointCoordinates[2*i+1] += this.pointSpeeds[2*i+1];
		}
	}

	ParticleSystem.prototype.collide = function(dish, cb) {
		var gl = this.gl;

		gl.bindFramebuffer(gl.FRAMEBUFFER, dish.getCurrentFramebuffer());
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, dish.getCurrentTexture(), 0);
		gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, this.pixelValues);

		for (var i = 0; i < this.n; i++)
		{
			var pX = Math.round(this.width*0.5*(this.pointCoordinates[2*i]+1));
			var pY = Math.round(this.height*0.5*(this.pointCoordinates[2*i+1]+1));

			if (pX >= 0 && pX < this.width && pY >= 0 && pY < this.height) {
				if (this.pixelValues[(pX+pY*this.width)*4 + 3] != 0) {
					if (cb) cb([pX, pY]);
					this.pointCoordinates[2*i] = 10.; // out of range
					this.pointCoordinates[2*i+1] = 10.;
					this.pointSpeeds[2*i] = 0;
					this.pointSpeeds[2*i+1] = 0;
				}
			}
		}
	} 

	var allocIdx = 0;
	ParticleSystem.prototype.allocateParticle = function(x, y, xs, ys) {
		var xScale = 2./this.width;
		var yScale = 2./this.height;

		x = xScale * x - 1;
		y = yScale * y - 1;
		xs = xScale * xs;
		ys = yScale * ys;

		for (var j = 0; j < this.n; j++)
		{
			var  i = (j+allocIdx)%this.n;
			var xx = this.pointCoordinates[2*i];
			var yy = this.pointCoordinates[2*i+1];
			if (xx < -1 || xx > 1 || yy < -1 || yy > 1)
			{
				this.pointCoordinates[2*i] = x;
				this.pointCoordinates[2*i + 1] = y;

				this.pointSpeeds[2*i] = xs;
				this.pointSpeeds[2*i + 1] = ys;

				allocIdx = i+1;
				break;
			}  
		}		

	}

	ParticleSystem.prototype.allocateSphere = function(n, x, y, s, angle) {
		this.allocateParticles(n, function(i, n) {
			return [x, y, 
				s * Math.cos(angle+Math.PI*2*i/n), 
				s * Math.sin(angle+Math.PI*2*i/n)
			];
		});
	}

	ParticleSystem.prototype.allocateParticles = function(n, generatorFn) {
		for (var i = 0; i < n; i++) {
			var params = generatorFn(i, n);
			this.allocateParticle.apply(this, params);
		}
	}

	return ParticleSystem;
});
