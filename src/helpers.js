var delay=5;

requestAnimFrame = (function(){
  return  window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function(callback, element){ setTimeout(callback, 1000 / 60); }
})();

function anim(){
   updateFrame();
   setTimeout("requestAnimFrame(anim)", delay);
}

function fr(){
  var ti = new Date().getTime();
  var fps = Math.round(1000*frames/(ti - time));
  document.getElementById("framerate").value = fps;
  frames = 0;  time = ti;
}

function index2GOL(index)
{
	var i;
	var count = 0;
	var alive = index % 2;
	index >>= 1;
	for (i = 0; i<8; i++)
	{
		if ((index % 2) == 1)
		{
			count++;
		}
		index >>= 1;
	}
	if (alive == 1 && (count >= 2 && count <= 3))
		return true;
	if (count == 3)
		return true;
	return false;
}

function createGOLTexture(gl)
{
	var pixelsGOL = [], width = 32, height = 16;
	for(var i = 0; i<height; i++) // y axis
	{
		for(var j = 0; j<width; j++) // x axis
		{
			var alive = index2GOL(i*width+j);
			if (alive) pixelsGOL.push(255, 255,0,255 );
			else pixelsGOL.push( 0, 0, 0 ,255 );
		}
	}
	return createRGBATexture(gl, width, height, new Uint8Array(pixelsGOL));
}


function getShaderFromElement( gl, id )
{
	var shaderScript = document.getElementById (id);
	var str = "";
	var k = shaderScript.firstChild;
	while (k)
	{
		if (k.nodeType == 3) str += k.textContent;
		k = k.nextSibling;
	}
	var shaderType;
	if (shaderScript.type == "x-shader/x-fragment")
	   shaderType = gl.FRAGMENT_SHADER;
	else if ( shaderScript.type == "x-shader/x-vertex" )
	   shaderType = gl.VERTEX_SHADER;
	else return null;

	return getShader(gl, shaderType, str)
}

function getShader(gl, shaderType, sourceText)
{
	var shader;
	shader = gl.createShader(shaderType);
	gl.shaderSource(shader, sourceText);
	gl.compileShader(shader);
	if (gl.getShaderParameter(shader, gl.COMPILE_STATUS) == 0)
		alert(gl.getShaderInfoLog(shader));
	return shader;
}


function createCASpace(gl)
{
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

function bindCASpaceToShader(gl, prog, space)
{
	gl.bindBuffer(gl.ARRAY_BUFFER, space.buffer);
	var aPosLoc = gl.getAttribLocation(prog, "aPos");
	gl.enableVertexAttribArray( aPosLoc );
	var aTexLoc = gl.getAttribLocation(prog, "aTexCoord");
	gl.enableVertexAttribArray( aTexLoc );
	gl.vertexAttribPointer(aPosLoc, 3, gl.FLOAT, gl.FALSE, 0, 0);
	gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, gl.FALSE, 0, space.texCoordOffset);
}


function createFrameTextureRandom(gl, width, height, density)
{
	var pixels = [];
	for(var i = 0; i < height; i++) // y axis
	{
		for(var j = 0; j < width; j++) // x axis
		{
			//if(Math.random() < density) pixels.push(Math.floor(Math.random()*4), 0, 0, 255);
			//else pixels.push(0, 0, 0, 255);
			
			if(Math.random() < density) pixels.push(Math.floor(Math.random()*8));
			else pixels.push(0);
		}
	}
	return createCATexture(gl, width, height, new Uint8Array(pixels));
}

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

function getArrayBufferFromURL(url, cb) {
	getFromURL(url, "arraybuffer", cb);
}

function getFromURL(url, responseType, cb) {
	var r = new XMLHttpRequest();
	r.open("GET", url, true);  
	// "blob" or "arraybuffer"
	r.responseType = responseType;
	r.onload = function() {   // XHR2
		if (cb) cb(r.response); // XHR2
	}      
	r.send();            
}

function getGL(c) {
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



function ruleSelected(e) {
	parseEvoCellFile(arrayBuffer);

}


function updateFrame()
{
	gl.useProgram(progCA);

	if (frameFlip > 0)
	{
		gl.uniform1i(gl.getUniformLocation(progCA, "texFrame"), 0);
		gl.activeTexture(gl.TEXTURE0);    
		gl.bindTexture(gl.TEXTURE_2D, texture1);
		
		gl.uniform1i(gl.getUniformLocation(progCA, "texRule"), 1);
		gl.activeTexture(gl.TEXTURE1);    
		gl.bindTexture(gl.TEXTURE_2D, textureGOL);

		gl.bindFramebuffer(gl.FRAMEBUFFER, fb2);
	}
	else
	{
		gl.uniform1i(gl.getUniformLocation(progCA, "texFrame"), 0);
		gl.activeTexture(gl.TEXTURE0);    
		gl.bindTexture(gl.TEXTURE_2D, texture2);

		
		gl.uniform1i(gl.getUniformLocation(progCA, "texRule"), 1);
		gl.activeTexture(gl.TEXTURE1);    
		gl.bindTexture(gl.TEXTURE_2D, textureGOL);
	
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb1);
	}
	 
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	gl.flush();
	
	gl.useProgram(progShow);
	if (frameFlip > 0)
	{
		gl.uniform1i(gl.getUniformLocation(progShow, "texFrame"), 0);
		gl.activeTexture(gl.TEXTURE0);    
		gl.bindTexture(gl.TEXTURE_2D, texture2);
	}
	else
	{
		gl.uniform1i(gl.getUniformLocation(progShow, "texFrame"), 0);
		gl.activeTexture(gl.TEXTURE0);    
		gl.bindTexture(gl.TEXTURE_2D, texture1);
	}
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
	gl.flush();

	frameFlip = -frameFlip;  
	frameCount++;
	frames++;
}