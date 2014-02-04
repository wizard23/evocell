var nrSimsRows;
var nrSimsCols;

var nrSims;
var caCanvas;
var caSims = [];
var timer, time;
var width, height, colWidth, rowHeight;
var ctlXRes, ctlYRes, ctlRandomDensity, ctlNrSims, ctlFramerate;
var evoCellData;
var drawRectShaderText;

var MODE_MUTATE = "mutate";
var MODE_DRAW = "draw";

var clickmode = MODE_DRAW;

var drawState = 3;

var useOneCanvas = false;

function setup()
{
	ctlXRes = jQuery('#xres')[0];
	ctlYRes = jQuery('#yres')[0];
	ctlNrSims = jQuery('#nrSims')[0];
	ctlRandomDensity = jQuery('#randomDensity')[0];
	ctlFramerate = jQuery('#framerate')[0];


	document.addEventListener('mousedown', handleDocumentMouseDown, false);
	document.addEventListener('mouseup', handleDocumentMouseUp, false);
	
	document.getElementById('paletteStealth').addEventListener ("click", OnChangeCheckbox, false);

	//document.getElementById('floatingPalette').addEventListener('click', handleFloatingPaletteClick, false);

	if (useOneCanvas)
	{
		document.getElementById('c').addEventListener('contextmenu', handleContextMenu, false);
		document.getElementById('c').addEventListener('click', handleCanvasClick, false);
		caCanvas = new EvoCell.CACanvas(jQuery("#c")[0]);
		caCanvas.setupPaletteShader(getShaderFromElement(caCanvas.gl, "shader-fs-palette"));
	}
	mutationWindow = new Draggable('floatingPalette');
	document.getElementById('floatingPaletteNeighbours').addEventListener("click", function() { activateClickMode(MODE_MUTATE); }, false);
	document.getElementById('floatingPaletteOptions').addEventListener("click", function() { activateClickMode(MODE_MUTATE); }, false);

	document.getElementById('floatingPaletteDrawing').addEventListener("click", function() { activateClickMode(MODE_DRAW); }, false);

	popupWindow = window.open('webevocell_toolbar.html','name','width=400,height=200');
	
	jQuery('#evocellFile').change(handleFileSelect);
	clearInterval(timer);

	//document.getElementById('c2').addEventListener('contextmenu', handleContextMenu, false);
	//document.getElementById('c2').addEventListener('click', handleCanvasClick, false);
	//caCanvas2 = new EvoCell.CACanvas(jQuery("#c2")[0]);
	//caCanvas2.setupPaletteShader(getShaderFromElement(caCanvas2.gl, "shader-fs-palette"));
	
	//caCanvas.gl = caCanvas2.gl;
	
	width = 512*2;
	height = 512*2;
	
	ctlXRes.value = width;
	ctlYRes.value = height;
	
	
	
	getFromURL("src/shaders/drawRect.shader", "text",
		function (shaderText)
		{
			drawRectShaderText = shaderText;
		}
	);
	
	//caCanvas.setSize(width, height);
	
// now in idividual 
/*
	progShow = caCanvas.gl.createProgram();
	caCanvas.gl.attachShader(progShow, getShaderFromElement(caCanvas.gl, "shader-vs-passthrough" ));
	caCanvas.gl.attachShader(progShow, getShaderFromElement(caCanvas.gl, "shader-fs-palette" ));
	caCanvas.gl.linkProgram(progShow);
	var caSpace = createCASpace(caCanvas.gl);
	bindCASpaceToShader(caCanvas.gl, progShow, caSpace);
*/	
	
	var file = getArrayBufferFromURL(
	//"http://dl.dropbox.com/u/2297128/22C3_avgextgrowers_cooler",
	//"http://dl.dropbox.com/u/2297128/Moore4-avg3-sweetship",
	"rules/moore4_wave",
	//"rules/ecoli16",
	//"ccc_rules/annegret2", 
	//"ccc_rules/g2adapded", 
	//"ccc_rules/moore5-explosionz-spaceshyp-boxedin-mut",
	//"ccc_rules/moore5-explosionz-spaceshyp-boxedin-mut",
	//"ccc_rules/orientalischenachtschattengewaechse",
	//"ccc_rules/interestingreplicator2",
	//"ccc_rules/new/22C3_mirrorsymetric_gliders-randomwaver",
	//"ccc_rules/starburst_road", 
	//"ccc_rules/march", 
	//"ccc_rules/machines/gardener/g2adapded",
	//"ccc_rules/s5-2", 
	//"ccc_rules/evoloop/EvoloopN9",
	function (arrayBuffer) {
		arrayBufferData = arrayBuffer;
		
		evoCellData = EvoCell.loadEvoCellFile(arrayBuffer);
		
		
		handleReset();
		
	
		timer = setInterval(fr, 1000);
		time = new Date().getTime();
   
		anim();
	});
}

function handleRandomize(cleanStart)
{
	randomDensity = parseFloat(ctlRandomDensity.value);

	for (var i = 0; i < nrSims; i++)
	{		
		caSims[i].randomize(randomDensity);
	}		

	updateFrame();
}

function handleReset(cleanStart)
{
	width = parseInt(ctlXRes.value);
	height = parseInt(ctlYRes.value);

	nrSimsCols = parseInt(ctlNrSims.value);
	nrSimsRows = nrSimsCols;
	nrSims = nrSimsRows * nrSimsCols;
	
	colWidth = Math.floor((width / nrSimsCols));
	rowHeight = Math.floor((height / nrSimsRows));
	
	randomDensity = parseFloat(ctlRandomDensity.value);
	
	if (useOneCanvas)
	{
		caCanvas.setSize(width, height);
	}
	
	oldSims = caSims;
	caSims = [];
	for (var i = 0; i < nrSims; i++)
	{
		if (!cleanStart && oldSims.length > i)
		{
			
			caSims[i] = oldSims[i];
			caSims[i].setSize(colWidth, rowHeight);
		}
		else
		{
			if (useOneCanvas)
			{	
				caSims[i] = new EvoCell.CASimulation(caCanvas, evoCellData, colWidth, rowHeight);
			}
			else
			{
				var canvasX = EnsureCanvas("genCanvas_" + i);
				canvasX.addEventListener('contextmenu', handleContextMenu2, false);
				canvasX.addEventListener('click', handleCanvasClick2, false);

				canvasX.addEventListener('mousedown', handleCanvasMouseDown, false);
				canvasX.addEventListener('mousemove', handleCanvasMouseMove, false);
				

				var caCanvasX = new EvoCell.CACanvas(canvasX);

				var gl = caCanvasX.gl;
				var progDrawRect = gl.createProgram();
				gl.attachShader(progDrawRect, getShaderFromElement(gl, "shader-vs-passthrough" ));
				gl.attachShader(progDrawRect, getShader(gl, gl.FRAGMENT_SHADER, drawRectShaderText));
				gl.linkProgram(progDrawRect);

				caCanvasX.drawRectshader = progDrawRect;

				//caCanvasX.setupPaletteShader(getShader(caCanvasX.gl, caCanvasX.gl.FRAGMENT_SHADER, paletteShaderText));
				
				//if (i != 0)				
				caCanvasX.setupPaletteShader(getShaderFromElement(caCanvasX.gl, "shader-fs-palette"));
				//else				
				//	caCanvasX.setupPaletteShader(getShaderFromElement(caCanvasX.gl, "shader-fs-paletteAndScale"));

				caSims[i] = new EvoCell.CASimulation(caCanvasX, evoCellData, colWidth, rowHeight);
			}
			
		}
		caSims[i].setSize(colWidth, rowHeight);
		if (!useOneCanvas)
		{
			caSims[i].caCanvas.setSize(colWidth, rowHeight);
			//document.getElementById("div_" + "genCanvas_" + i)).
		}
	}

	if (!useOneCanvas)
	{
		for (var i = nrSims; i < oldSims.length; i++)
		{
			oldSims[i].setSize(10,10);
			oldSims[i].caCanvas.setSize(10, 10);
		}
	}

	fillPalette(caSims[0].ruleData);
}

requestAnimFrame = (function(){
  return  window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function(callback, element){ setTimeout(callback, 1000 / 60); }
})();

var pausePlease = 0;
function anim(){
	oneStep()
	updateFrame();

	frames++;
	if (!pausePlease)
	{
		requestAnimFrame(anim);
	}
}

function oneStep()
{
	for (var i = 0; i < nrSims; i++)
		caSims[i].step();
}

function updateFrame() 
{	
	for (var r = 0; r < nrSimsRows; r++)
	{
		for (var c = 0; c < nrSimsCols; c++)
		{
			var idx = r*nrSimsCols+c;
			if (useOneCanvas)
			{
				caCanvas.draw(caSims[idx], null, [(width / nrSimsCols) * (c + 0.5) - colWidth/2, (height / nrSimsRows) * (r + 0.5) - rowHeight/2, colWidth, rowHeight]);		}
			else
			{
				caSims[idx].caCanvas.draw(caSims[idx]);
			}
			
		}
	}

	//caCanvas2.draw(caSims[0]);
	
}

function fr(){
  var ti = new Date().getTime();
  var fps = Math.round(1000*frames/(ti - time));
  ctlFramerate.value = fps;
  frames = 0;  time = ti;
}



function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object
	
	var reader = new FileReader();
	reader.onload = function(evt) {	
			arrayBufferData = evt.target.result;
			var evoCellData = EvoCell.loadEvoCellFile(arrayBufferData);
			caSims[0].setRule(evoCellData);
			//handleReset();
		};
	reader.readAsArrayBuffer(files[0]); // start async operation
}

function extractIdxFromId(id)
{
	
	var nrRegex = /\d+/;
	var m = nrRegex.exec(id);

	return parseInt(m[0]);
	
}

function handleContextMenu2(evt) {
	evt.preventDefault();

	var clickedCA = extractIdxFromId(evt.target.id);

	var ruleAsBlob = EvoCell.saveRuleToBlob(caSims[clickedCA].ruleData);
	saveAs(ruleAsBlob, "evocellrule");

	var ruleAsDataURL = EvoCell.saveRuleToDataURL(caSims[clickedCA].ruleData);
	document.getElementById('downloadRuleFile').href = ruleAsDataURL;
	//window.location = ruleAsDataURL;
}



function activateClickMode(newMode)
{
	clickmode = newMode;
}

function checkDrawState(newState)
{
	drawState = newState;
	clickmode = MODE_DRAW;
}



var isMousePressed = false;

function handleDocumentMouseDown(evt)
{
	isMousePressed = true;
}

function handleDocumentMouseUp(evt)
{
	isMousePressed = false;
}


function handleCanvasMouseDown(evt)
{
	drawAtEvtLocation(evt);
}

function handleCanvasMouseMove(evt)
{
	if (isMousePressed)
		drawAtEvtLocation(evt);
}

function drawAtEvtLocation(evt)
{
	var clickedCA = extractIdxFromId(evt.target.id);
	var sim = caSims[clickedCA];
	var coords = evt.target.relMouseCoords(evt);
	
	var x = coords.x;
	var y = coords.y;

	y = sim.height - y;

	if (clickmode == MODE_DRAW)
	{
		var w = 15
		var x1 = x-Math.ceil(w/2.);
		var x2 = x1 + w;
		var y1 = y-Math.ceil(w/2.);
		var y2 = y1 + w;
	 	
		sim.executeCustomShader(sim.caCanvas.drawRectshader, 
			function(gl, shader) 
			{ 
				gl.uniform4f(gl.getUniformLocation(shader, "rectParam"), x1, y1, x2, y2);
				gl.uniform1f(gl.getUniformLocation(shader, "state"), drawState/255.);
			}
		);
		updateFrame();
	}
}


function handleCanvasClick2(evt) {
	var clickedCA = extractIdxFromId(evt.target.id);
	var sim = caSims[clickedCA];
	var coords = evt.target.relMouseCoords(evt);
	
	var x = coords.x;
	var y = coords.y;
	
	if (clickmode == MODE_MUTATE)
	{
		DoTheMutation(clickedCA);
	}

	evt.preventDefault();
	evt.stopPropagation();
}  


function handleContextMenu(evt) {
	evt.preventDefault();

	var canvas = document.getElementById('c');
	
	var coords = canvas.relMouseCoords(evt);
	var x = coords.x;
	var y = coords.y;
	
	var clickedCA;
	clickedCA = nrSimsCols * Math.floor(nrSimsRows * (height - coords.y) / height);
	clickedCA += Math.floor(nrSimsCols * coords.x / width);

	document.getElementById('downloadRuleFile').href = EvoCell.saveRuleToDataURL(caSims[clickedCA]);
	//EvoCell.saveRule(caSims[clickedCA]);
}

function handleCanvasClick(evt) {
	var canvas = document.getElementById('c');
	
	var coords = canvas.relMouseCoords(evt);
	var x = coords.x;
	var y = coords.y;
	
	var clickedCA;
	clickedCA = nrSimsCols * Math.floor(nrSimsRows * (height - coords.y) / height);
	clickedCA += Math.floor(nrSimsCols * coords.x / width);

	if (evt.target == "adasD")
	{	
		//alert("sss");	
		return;
	}
	

	if (evt.button == 0) {
		
	}
	evt.preventDefault();
	evt.stopPropagation();
}  


function DoTheMutation(clickedCA)
{
	var mutReg;
	var mutTarget;
	var mutTimes;

	var rule = caSims[clickedCA].ruleData;


	mutReg = [];
	for (i = 0; i < rule.neighbourhood.length; i++)
	{
		mutReg.push(document.getElementById('nPattern_' + i).value);
	}
	mutTarget = mutTimes = document.getElementById('nPattern_target').value;			
	mutTimes = document.getElementById('nPattern_mutations').value;
	mutAll = document.getElementById('nPattern_all').checked;

	if (mutAll)
	{
		var newRule = myClone(rule);
		newRule.ruleTable = new Uint8Array(rule.ruleTable);
		EvoCell.mutateAllEvoCellRule(newRule, mutReg, mutTarget, mutTimes);
		caSims[clickedCA].setRule(newRule);
	}
	else
	{
		for (var i = 0; i < nrSims; i++)
		{
			if (i != clickedCA)
			{
				var newRule = myClone(rule);
				newRule.ruleTable = new Uint8Array(rule.ruleTable);
		
				EvoCell.mutateEvoCellRule(newRule, mutReg, mutTarget, mutTimes);
				caSims[i].setRule(newRule);
			}
			else
			{
				caSims[i].invalidateProgram(); // TODO: this is a hack to trandomize clean this up
			}
		}
	}
}

function fillPalette(evoCellData)
{
	var leftOffset = 60, topOffset = 30, xOffset = 55, yOffset = 25;
	var s="<div style=\"background-color:#ccf;\">Dont hesitate...MUTATE!</div>";
	s+="mutations: <input type='number' id='nPattern_mutations' value='1000' style='width:70px;' /> <input type='checkbox' id='nPattern_all' /> All rules ";
	document.getElementById('floatingPaletteOptions').innerHTML = s;
	s = "";

	for (var nIndex = 0; nIndex < evoCellData.neighbourhood.length; nIndex++)
	{
		var neighbour = evoCellData.neighbourhood[nIndex];
		
		var x = neighbour[0];
		var y = neighbour[1];
		var posx = leftOffset + x * xOffset;
		var posy = topOffset + y * yOffset;

	 	s+= "<input type=\"text\" id=\"nPattern_" + nIndex + "\" value=\"?\" style=\"position:absolute; width:40px; left:" + posx + "px; top:" + posy + "px;\" />";
	}

	var posx = leftOffset + 2.3 * xOffset;
	var posy = topOffset;
	s+="<input type=\"text\" id=\"nPattern_target\" value=\"?\" style=\"position:absolute; width:40px; left:" + posx + "px; top:" + posy + "px;\" />";

	var div = document.getElementById('floatingPaletteNeighbours');
	div.innerHTML = s;
	//alert(s);
		
}

function OnChangeCheckbox()
{
	if (document.getElementById('paletteStealth').checked)
	{
		new Effect.Opacity('floatingPalette', { from: 1.0, to: 0.3, duration: 0.5 });
		
		//document.getElementById('floatingPalette').style.opacity = "0.2";

	}
	else
	{
		new Effect.Opacity('floatingPalette', { from: 0.3, to: 1.0, duration: 0.5 });
		//document.getElementById('floatingPalette').style.opacity = "1";
	}

}

function EnsureCanvas(id)
{
	var container = document.getElementById('canvasContainer');
	var canvas = document.getElementById(id);
	if (!canvas)
	{
		
		canvas = document.createElement("canvas");
		canvas.id = id;

		var div = document.createElement("div");
		div.id = "div_" + id;
		div.style["display"] = "inline-block";
		div.style["background-color"] = "#cdc";
		div.style["border"] = "2px solid gray";
		div.style["padding"] = "2px";
		div.style["margin"] = "2px";
		//div.style["z-index"] = 0;	
		div.appendChild(canvas);
		//div.appendChild(document.createTextNode("Eine sehr dynamische Seite"))
		
		container.appendChild(div);
		
		//new Draggable(div);
	}
	return canvas;
}

