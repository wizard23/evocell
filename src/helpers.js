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
