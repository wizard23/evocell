// sets up devMode if enabled
require(["GLOBALS", "jquery"], function(GLOBALS, $){
    if (GLOBALS.devMode){
        $('.devModeSection').show();
        return
    } else {
        return
    }
});

