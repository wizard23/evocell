define(function(){
    // Example: local resources in the same directory
    // resPath: "./"
    // resources in res_evocell repository
    var GLOBALS = {
        resPath: "../res_evocell/",
        canvasElement: document.getElementById('c'),
        gameW: 256,
        gameH: 256

    };
    GLOBALS.libPath = "../" + GLOBALS.resPath + "src/libs/";

    return GLOBALS;
});