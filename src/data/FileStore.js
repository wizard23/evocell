define(["underscore", "backbone"], function(_, bb) {
  var indexedDB = window.indexedDB;

  const dbName = "EvoCell";
  var db = null;

  const ruleStoreName = "rules";
  var ruleStore = null;

  var readyFns = [];

  var ready = function(fn) {
    if (db) fn();
    else {
      readyFns.push(fn);
    }
  };

  var request = indexedDB.open(dbName, 4);
  request.onerror = function(event) {
    alert("Oh no! Why didn't you allow my web app to use IndexedDB?! Cell is sad now!");
  };
  request.onsuccess = function(event) {
    db = event.target.result;

    _.each(readyFns, function(fn) { fn(); });

    db.onerror = function(event) {
      // Generic error handler for all errors targeted at this database's requests!
      alert("Database error: " + event.target.errorCode);
    };
  };

  request.onupgradeneeded = function(event) { 
    //alert("upgrade from: " + event.oldVersion + " to: " + event.newVersion);
    var db = event.target.result;

    if(!db.objectStoreNames.contains(ruleStoreName)) {
      var objectStore = db.createObjectStore(ruleStoreName, { keyPath: "name"});
    }
    // else
    // {
    //   db.deleteObjectStore(ruleStoreName);
    // }

    if(!db.objectStoreNames.contains("gameStates")) {
       db.createObjectStore("gameStates", { keyPath: "id"});
    }
    // Create an index to search customers by name. We may have duplicates
    // so we can't use a unique index.
    //objectStore.createIndex("name", "name", { unique: true });
  };

  var addObject = function(storeName, data, oncomplete, onerror) {
    var transaction = db.transaction([storeName], "readwrite");
    if (oncomplete) transaction.oncomplete = oncomplete;
    if (onerror) transaction.onerror = onerror;
    var objectStore = transaction.objectStore(storeName);
    var request = objectStore.add(data);
    request.onerror = function(event) {
      //alert("me so sorry, could not add: " + data + "\n" + storeName);
    };
    request.onsuccess = function(event) {
      // dont call callback here call it later when transaction is done!
    };
  };

  var deleteObject = function(storeName, id, callback) {
    var transaction = db.transaction([storeName], "readwrite");
    transaction.oncomplete = function(e) { 
      if (callback) callback(); 
    };
    var request = transaction
                  .objectStore(storeName)
                  .delete(id);
    request.onerror = function(event) {
      alert("me so sorry, could not delte object id:" + id);
    };
    request.onsuccess = function(event) {
      // It's gone!
    };
  };
  var getObject = function(storeName, id, callback) {
    var objectStore = db.transaction([storeName]).objectStore(storeName);
    var request = objectStore.get(id);
    request.onerror = function(event) {
      alert("me so sorry, could not load object with id name:" + id);
    };
    request.onsuccess = function(event) {
      var result = event.target.result;
      if (!result)
        alert("Empty result for id: " + id);
      callback(result);
    };
  };
  var getAllObjects = function(storeName, callback, filter) {
    filter = filter || function(x) { return true; };
    var  objects = [];
    var objectStore = db.transaction(ruleStoreName).objectStore(storeName);

    objectStore.openCursor().onsuccess = function(event) {
      var cursor = event.target.result;
      if (cursor) {
        if (filter(cursor.value))
          objects.push(cursor.value);
        cursor.continue();
      }
      else {
        callback(objects);
      }
    };
  };

  var storeRule = function(name, ruleData, callback) {
    addObject(ruleStoreName, {name: name, ruleData: ruleData}, callback);
  };

  var deleteRule = function(name, callback) {
    deleteObject(ruleStoreName, name, callback);
  };

  var loadRule = function(name, callback) {
    getObject(ruleStoreName, name, callback);
  };

  var loadAllRules = function(callback) {
    getAllObjects(ruleStoreName, callback);
  };

  var loadAllRuleNames = function(callback) {
    getAllObjects(ruleStoreName, function(rules) {
      callback(_.map(rules, function(rule) { return rule.name; }));
    });
  } ;

  return {
    addObject: addObject,
    deleteObject: deleteObject,
    getObject: getObject,
    getAllObjects: getAllObjects,

    // depricated "rule" functions use addObject, deleteObject, ... insted
    storeRule: storeRule,
    deleteRule: deleteRule,
    loadRule: loadRule,
    loadAllRules: loadAllRules,
    loadAllRuleNames: loadAllRuleNames,

    ready: ready,
  };
});
