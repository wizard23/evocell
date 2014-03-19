define([
	"jquery-ui", "Utils", "EvoCell", "underscore", "backbone", "knockback", "knockout", "meSpeak", "jquery-cycle"], 
	function($, utils, EC, _, Backbone, kb, ko, meSpeak) {

	function getSpeechURL(text, language) {
		if (!language) language = "en";
		var x = "https://translate.google.com/translate_tts?ie=UTF-8&q=" + text +"&tl=" + language;
		//x = "http://translate.google.com/translate_tts?ie=UTF-8&q=" + text +"&tl=en&total=1&idx=0&textlen=23&prev=input";
		return x.replace(/ /g, "%20");
	}

	meSpeak.loadConfig(resPath + "src/libs/mespeak/mespeak_config.json");
	meSpeak.loadVoice(resPath + 'src/libs/mespeak/voices/en/en-us.json');

	//meSpeak.speak("hello", {}, function() {alert();});

	var templateSrc = $('#part-template').html();
	
	var htmlTemplate = templateSrc ? _.template(templateSrc) : function() { return "TODO: ADD TEMPLATE"};

	var story = {
		parts: ["Alerted by <%= reason %>...", 
				  "...<%= group%>...", 
					"...used <%= explanation %>...", 
					"...to shrink <%= device%> down to quantum scale.", 
					"What started as <%= description %>...", 
					"...turned out to be <%= finale %>!"],

		reason: [
			{text: "an urgent national security concern of highly classified nature", image: "Classified.gif"},
			{text: "the ongoing loss of traditional values", image:"traditional-family.jpg" },
			{text: "unexplained oscilations in the social web", 
				image:["social-media1.jpg"]},
			{text: "strange quantum events at a macroscopic scale", image:"entangled.jpg"},
			{text: "a sudden increase of global warming", 
				image:["polarbear.jpg", "Fight-Global-Warming-global-warming-prevention-725103_1280_1024.jpg"]},
			{text: "GNU violation reports", image:"GNU-Linux.png"},
		],

		group: [
				{text: "a highly skilled team of Metalab members", 
					image:["metalab.jpeg", "Metalab06LR.jpg", "600px-Metalab_wappen_neu.png", 
					"800px-Lounge_idealzustand.JPG"]}, 
				{text: "a team of alien scientists", image: "socialistspaceWorkers.jpg",
				 url:"http://historiesofthingstocome.blogspot.co.at/2010/08/retro-futurism-4-russians-in-space.html"}, 
				{text:"a paranoid superintelligent bonobo who escaped from a secret CIA prison", 
					image:["bonobo-portrait.jpg", "bonobo.jpg"]},
				{text: "an adventurous giraffe", 
					image:["giraffe.jpg", "giraffe2.jpeg", "giraffe3.jpeg", "giraffe4.jpeg"],
					url:"http://www.giraffes.org/giraffelink.html"},
				{text:"the US goverment in accordance with their handlers", 
					image:["usalien.png", "illuminati.jpg", "usalien.png"] },
				{text:"Boxxy", image:["boxxy.jpg", "boxxy2.png"]},
		], 

		explanation: [
			{text: "an arduino hack", image: ["arduinohack.jpg", "Arduino-Powerglove.jpg"]},
			{text: "lean management principles", image: "lean.jpg"}, 
			{text: "a classic McGyver technique", image: ["macgyver.jpg", "macgyver2.jpg", "macgyver3.jpg"]}, 
			{text: "innovative js libraries", image:"JavaScript_Tools_Library_Frameworks.jpg"},
			{text: "a digital matter manipulator", image: "complexdevice.jpg"},
			{text: "a directed explosion aproach not unlike some of the concepts of project Orion", image: "orion.gif"},
		],

		device: [
					{text: "a retrofited space shuttle", image:"spaceShuttle.jpg", 
					 url: "http://www.wired.com/images_blogs/wiredscience/2012/04/space-shuttle-discovery-jurvetson-flickr.jpg"}, 
					{text: "a russian nuclear submarine with a critical core", image:"submarine.jpg"},
					{text:"a timemachine", image:"timemachine.jpg"},
					{text:"a DIY spaceship", image: "diy-spacecraft-1.jpg"},
					{text:"a spaceship from a parallel timeline", image: "rocketpreparations.jpg"},
					{text:"a huge robot", image:["landwalker.jpeg", "robotbog.jpg", "kidswalkerrobot.jpg"]},
		],



		description: [
			{text: "a quest to kill space nazis", image:"spacenazi.jpg"}, 
			{text: "the search for the holy grail of quantum mechanics", image: "quantum.jpg"},
			{text: "an harmless adventure between consenting adults", image: "consenting.jpg"},
			{text: "a quest to enlighten mankind", image: "enlightenment.jpeg"},
			{text: "as a simple preparation step", image: "xkcdsuccess.png"},
			{text: "as a public backup solution for classified power point presentations", 
				image:["publicBackup.jpg", "big-prism-snowden-greenwald.jpg"]},
		],
 
		finale: [
			{text: "an adventure in a cellular world unseen by anyone before", image: "blue.jpg"},
			{text: "a universe of cellular automata hidden in every atom", image: "cellcity.jpg"}, 
			{text: "ALL YOUR BASE ARE BELONG TO US", image: "allYourBase.jpg"}, 
		],
	}

	var probabilities = {};

	function choose(key) {
		var alternatives = story[key];
		//var l = alternatives.length;

		if (!probabilities[key]) {
			var prob = [];
			for (var idx in alternatives) {
				prob[idx] = 1;
			}
			probabilities[key] = prob;
		}
		var prob = probabilities[key];
		var sum = _.reduce(prob, function(a, b) {return a+b;});

		var selectedIdx = -1;
		_.reduce(prob, function(a, b, idx) {
			var v = a-b;
			if (v <= 0 && a > 0)
				selectedIdx = idx;
			return v;
		}, sum*Math.random());

		var aIdx = selectedIdx;
		prob[aIdx] /= 2;
		//var aIdx = sum*Math.random();

		var alt = alternatives[aIdx];
		return alt;
	}

	var RunIntro = function() {
		$("#container").html("");
		$("#container").fadeIn();

		//var audios = {};
		var texts = [];	

		for (var partIndex in story.parts)
		{
			var part = story.parts[partIndex];
			var partTemplate = _.template(part);
			var paramsRegex=new RegExp(/<%=(.*)%>/g);		

			var r = paramsRegex.exec(part);
			var key = r[1].trim();
		
			//var alternatives = story[key];
			//var l = alternatives.length;
			//var aIdx = Math.floor(l*Math.random());
			//var alt = alternatives[aIdx];
			var alt = choose(key);


			var image = alt.image;
			if (Array.isArray(image)) {
				image = image[Math.floor(image.length*Math.random())];
			} 
		
			if (!alt.text)
				alt = {text: alt};

			var params = {};
			params[key] = alt.text;
			var text = partTemplate(params);
			texts.push(text);
		
			var id = "sc" + partIndex;
			$("#container").append(htmlTemplate({text:text, image: resPath + "images/" + image, id:id}));

			//var url = getSpeechURL(text);
			//var a = new Audio(url);
			//audios[id] = a;
		}

		/*_.delay(function(text) {
			meSpeak.speak(text);
		}, 8000*partIndex, text);
*/

		$('#container').cycle({
			timeout: 0, 
		fx: 'fade' // choose your transition type, ex: fade, scrollUp, shuffle, etc...
		});
	
		var callMe = function () {
			$('#container').fadeOut()
		};

		for (var i = story.parts.length - 1; i >= 0; i--) {
			callMe = (function (i, callMe) {
				id = "sc" + i;
				var cont = $("#"+id);
				//var a = audios[id];
				var canceled = false;


				var fired = false;
				var next = function() {
					if (!fired)
					{
						fired = true;
						if (i != story.parts.length - 1)
							$('#container').cycle("next");
						_.delay(callMe, 700);	
					}
				}
			
			
			/*
				a.addEventListener("ended", function() {
					if (!canceled) {
						next();
					}
				}, false);
*/

				return function() {
					
					meSpeak.speak(texts[i], {}, next);
					//a.play();
					cont.click(function() {
						meSpeak.stop();
						next();
						canceled = true;
						//a.pause();
					 	//next();
					});
				};
			})(i, callMe);
		}

		callMe();	
	};

	var RunDeath = function() {
		//alert("You died!");
		//RunIntro();
		MessageBox("You died! Avoid the enemy cells!", "rgb(255, 0, 0)", 2000)
	};

	var MessageBox = function(html, color, delay) {
		$("#centeredMessage").html(html);
		$("#centeredContainer").fadeIn(300, function() {
			$("#centeredContainer").fadeOut(delay);
		});
	};

	return {
		RunIntro: RunIntro,
		RunDeath: RunDeath
	}
});
