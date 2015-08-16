// this file defines global constants for CellSpace

define(function(){
    // Example: local resources in the same directory
    // resPath: "./"
    // resources in res_evocell repository
    var GLOBALS = {
        devMode: true,  // true to enable loading of dev options, false to disable
        resPath: "../res_evocell/",
        canvasElement: document.getElementById('c'),
        gameW: 850,
        gameH: 650,
        maxParticles: 2000,
        shotSpeed: 3.4
    };
    GLOBALS.libPath = "../" + GLOBALS.resPath + "src/libs/";

    return GLOBALS;
});