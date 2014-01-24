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
	{
		alert(gl.getShaderInfoLog(shader));
		alert(sourceText);
	}
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
			if (Math.random() < density) 
			{
				pixels.push(0);
				pixels.push(0);
				pixels.push(0);
				pixels.push(Math.floor(Math.random()*8));
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
	//return createCATexture(gl, width, height, new Uint8Array(pixels));
	return createRGBATexture(gl, width, height, new Uint8Array(pixels))
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


function relMouseCoords(event){
    var totalOffsetX = 0;
    var totalOffsetY = 0;
    var canvasX = 0;
    var canvasY = 0;
    var currentElement = this;

    do{
        totalOffsetX += currentElement.offsetLeft;
        totalOffsetY += currentElement.offsetTop;
    }
    while(currentElement = currentElement.offsetParent)

    canvasX = event.pageX - totalOffsetX;
    canvasY = event.pageY - totalOffsetY;

    return {x:canvasX, y:canvasY}
}
HTMLCanvasElement.prototype.relMouseCoords = relMouseCoords;

//from: https://gist.github.com/958841
// Converts an ArrayBuffer directly to base64, without any intermediate 'convert to string then
// use window.btoa' step. According to my tests, this appears to be a faster approach:
// http://jsperf.com/encoding-xhr-image-data/5

function arrayBufferToBase64(arrayBuffer) {
  var base64    = ''
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  var bytes         = new Uint8Array(arrayBuffer)
  var byteLength    = bytes.byteLength
  var byteRemainder = byteLength % 3
  var mainLength    = byteLength - byteRemainder

  var a, b, c, d
  var chunk

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048)   >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032)     >>  6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63               // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength]

    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3)   << 4 // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008)  >>  4 // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15)    <<  2 // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }
  
  return base64
}

