require.config({
   // baseUrl: 'js/lib',
	paths: {
		jquery: 'libs/jquery-1.10.2',
		"jquery-ui": 'libs/jquery-ui-1.10.4.custom',
		"underscore": "libs/underscore",
		backbone: "libs/backbone",
		knockback: "libs/knockback",
		knockout: "libs/knockout-3.0.0",
		meSpeak: "libs/mespeak/mespeak",
		"jquery-cycle":"libs/jquery.cycle.all",
	},
	shim: {
        "jquery-ui": {
            exports: "$",
            deps: ['jquery', 'libs/farbtastic']
        },
		  "jquery-cycle": {
				deps: ["jquery-ui"]
			},
		  underscore : {
				exports: "_",
		  },
		  backbone : {
				exports: "Backbone",
				deps: ['underscore'],
			},
		  knockback: {
				exports: "kb",
				deps: ["backbone"],			
				},
		
			knockout: {
				exports: "ko",
				deps: [],			
				},
			
			meSpeak: {
				exports: "meSpeak"
			}
    }
});

require([
	"jquery-ui", "Utils", "CellSpaceResources", "EvoCell", "underscore", "backbone", "knockback", "knockout", "meSpeak", "jquery-cycle"], 
	function($, utils, resources, EC, _, Backbone, kb, ko, meSpeak) {

	function getSpeechURL(text, language) {
		if (!language) language = "en";
		var x = "https://translate.google.com/translate_tts?ie=UTF-8&q=" + text +"&tl=" + language;
		//x = "http://translate.google.com/translate_tts?ie=UTF-8&q=" + text +"&tl=en&total=1&idx=0&textlen=23&prev=input";
		return x.replace(/ /g, "%20");
	}

	meSpeak.loadConfig("src/game/libs/mespeak/mespeak_config.json");
meSpeak.loadVoice('src/game/libs/mespeak/voices/en/en-us.json');

	var htmlTemplate = _.template( $('#part-template').html() );

	var story = {
		parts: ["Alerted by <%= reason %>", 
				  "<%= group%>", 
					"used <%= explanation %>", 
					"to shrink <%= device%> down to quantum scale", 
					"What started as <%= description %>", 
					"turned out to be <%= finale %>!"],

		reason: [
			{text: "an urgent national security concern of highly classified nature", image: "Classified.gif"},
			{text: "the ongoing loss of traditional values", image:"traditional-family.jpg" },
			{text: "unexplained oscilations in the social web", image:"social-media1.jpg"},
			{text: "strange quantum events at a macroscopic scale", image:"entangled.jpg"},
			{text: "a sudden increase of global warming", image:"polarbear.jpg"},
			{text: "GNU violation reports", image:"polarbear.jpg"},
		],

		group: [
				{text: "A highly skilled team of Metalab members", image:"metalab.jpeg"}, 
				{text: "A team of alien scientists", image: "socialistspaceWorkers.jpg",
				 url:"http://historiesofthingstocome.blogspot.co.at/2010/08/retro-futurism-4-russians-in-space.html"}, 
				{text:"A paranoid superintelligent bonobo who escaped from a secret CIA prison", image:"bonobo-portrait.jpg"},
				{text: "An adventurous giraffe", image:"giraffe.jpg", url:"http://www.giraffes.org/giraffelink.html"},
		], 

		explanation: [
			{text: "an arduino hack", image: "arduinohack.jpg"},
			{text: "lean management principles", image: "lean.jpg"}, 
			{text: "a classic McGyver technique", image: "macgyver.jpg"}, 
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
		],



		description: [
			{text: "a quest to kill space nazis", image:"spacenazi.jpg"}, 
			{text: "the search for the holy grail of quantum mechanics", image: "quantum.jpg"},
			{text: "an harmless adventure between consenting adults", image: "consenting.jpg"},
			{text: "a quest to enlighten mankind", image: "enlightenment.jpeg"},
		],
 
		finale: [
			{text: "an adventure in a cellular world unseen by anyone before", image: "ca2.jpg"},
			{text: "a universe of cellular automata hidden in every atom", image: "ca1.jpg"}, 
			{text: "ALL YOUR BASE ARE BELONG TO US!", image: "allYourBase.jpg"}, 
		],
	}

	var audios = {};
	
	for (var partIndex in story.parts)
	{
		var part = story.parts[partIndex];
		var partTemplate = _.template(part);
		var paramsRegex=new RegExp(/<%=(.*)%>/g);		

		var r = paramsRegex.exec(part);
		var key = r[1].trim();
		
		var alternatives = story[key];
		var l = alternatives.length;
		var aIdx = Math.floor(l*Math.random());
		var alt = alternatives[aIdx];
		
		if (!alt.text)
			alt = {text: alt};

		var params = {};
		params[key] = alt.text;
		var text = partTemplate(params);
		
		var id = "sc" + partIndex;
		$("#container").append(htmlTemplate({text:text, image: "images/" + alt.image, id:id}));

		var url = getSpeechURL(text);
		var a = new Audio(url);
		audios[id] = a;
	}

		/*_.delay(function(text) {
			meSpeak.speak(text);
		}, 8000*partIndex, text);
*/

		$('#container').cycle({
			timeout: 0, 
		fx: 'fade' // choose your transition type, ex: fade, scrollUp, shuffle, etc...
		});
		
		var callMe = function () {};

		for (var i = story.parts.length - 1; i >= 0; i--) {
			callMe = (function (i, callMe) {
				id = "sc" + i;
				var cont = $("#"+id);
				var a = audios[id];
				var canceled = false;
				
				
				a.addEventListener("ended", function() {
					if (!canceled) {
						$('#container').cycle("next");
						//cont.fadeOut();
						_.delay(callMe, 500);	
					}

				}, false);

				return function() {
					//cont.fadeIn();		
					a.play();
					cont.click(function(){
						$('#container').cycle("next");
						a.pause();
						canceled = true;
					  //cont.fadeOut();
						_.delay(callMe, 500);
					});
				};
			})(i, callMe);
		}

		callMe();	
/*
	storyItem = model({
		text: "",
		image ""
	}
*/
});
