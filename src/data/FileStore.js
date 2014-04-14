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

var request = indexedDB.open(dbName, 2);
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

  // var objectStore = db.transaction(ruleStoreName).objectStore(ruleStoreName);
  // objectStore.openCursor().onsuccess = function(event) {
  //   var cursor = event.target.result;
  //   if (cursor) {
  //     //alert("Rule " + cursor.value.id + " is " + cursor.value.ruleTableSize);
  //     cursor.continue();
  //   }
  //   else {
  //     //alert("No more rules!");
  //   }
  // };

};

request.onupgradeneeded = function(event) { 
  //alert("upgrade from: " + event.oldVersion + " to: " + event.newVersion);
  var db = event.target.result;

  if(db.objectStoreNames.contains(ruleStoreName)) {
    db.deleteObjectStore(ruleStoreName);
  }

  var objectStore = db.createObjectStore(ruleStoreName, { keyPath: "name"});

  // Create an index to search customers by name. We may have duplicates
  // so we can't use a unique index.
  //objectStore.createIndex("name", "name", { unique: true });
};

var storeRule = function(name, ruleData, callback) {
  var transaction = db.transaction([ruleStoreName], "readwrite");
   transaction.oncomplete = function(e) { 
    if (callback) callback(); 
  };

  var objectStore = transaction.objectStore(ruleStoreName);
  var request = objectStore.add({name:name, ruleData:ruleData});
  request.onerror = function(event) {
    alert("me so sorry, could not save: " + name + "\n" + ruleData);
  };
  request.onsuccess = function(event) {
    // dont call callback here call it later when transaction is done!
    //if (callback) callback();
  };
};

var deleteRule = function(name, callback) {
  var transaction = db.transaction([ruleStoreName], "readwrite");
  //transaction.onabort = function(e) { alert("atransbort"); };
  transaction.oncomplete = function(e) { 
   if (callback) callback(); 
  };
  
  var request = transaction
                .objectStore(ruleStoreName)
                .delete(name);
  request.onerror = function(event) {
    alert("me so sorry, could not delte rule named:" + name);
  };
  request.onsuccess = function(event) {
    // It's gone!
  };
};

var loadRule = function(name, callback) {
  var objectStore = db.transaction([ruleStoreName]).objectStore(ruleStoreName);
  var request = objectStore.get(name);
  request.onerror = function(event) {
    alert("me so sorry, could not load rule with id name:" + name);
  };
  request.onsuccess = function(event) {
    var result = event.target.result;
    if (!result)
      alert("Empty result for rule: " + name);
    callback(result);
  };
};

var loadAllRules = function(callback) {
  var rules = [];
  var objectStore = db.transaction(ruleStoreName).objectStore(ruleStoreName);
  objectStore.openCursor().onsuccess = function(event) {
    var cursor = event.target.result;
    if (cursor) {
      //alert("Rule " + cursor.value.id + " is " + cursor.value.ruleTableSize);
      rules.push(cursor.value);
      cursor.continue();
    }
    else {
      callback(rules);
    }
  };
};

var loadAllRuleNames = function(callback) {
  loadAllRules(function(rulesModelData) {
    var names = [];
    for (var ruleIdx in rulesModelData) {
      names.push(rulesModelData[ruleIdx].name);
    }
    callback(names);
  });
} ;


return {
  storeRule: storeRule,
  deleteRule: deleteRule,
  loadRule: loadRule,
  loadAllRules: loadAllRules,
  loadAllRuleNames: loadAllRuleNames,
  ready: ready,
};





  /*var objectStore = db.transaction(["customers"], "readwrite").objectStore("customers");
  var request = objectStore.get("444-44-4444");
  request.onerror = function(event) {
    // Handle errors!
  };
  request.onsuccess = function(event) {
    // Get the old value that we want to update
    var data = request.result;
    
    // update the value(s) in the object that you want to change
    data.age = 42;

    // Put this updated object back into the database.
    var requestUpdate = objectStore.put(data);
     requestUpdate.onerror = function(event) {
       // Do something with the error
        alert("why u no update?");
     };
     requestUpdate.onsuccess = function(event) {
       // Success - the data is updated!
      alert("I haz updated");
     };
  };


var index = objectStore.index("name");
  // Using a normal cursor to grab whole customer record objects
index.openCursor().onsuccess = function(event) {
  var cursor = event.target.result;
  if (cursor) {
    // cursor.key is a name, like "Bill", and cursor.value is the whole object.
    alert("Name: " + cursor.key + ", SSN: " + cursor.value.ssn + ", email: " + cursor.value.email);
    cursor.continue();
  }
};
return;
// Using a key cursor to grab customer record object keys
index.openKeyCursor().onsuccess = function(event) {
  var cursor = event.target.result;
  if (cursor) {
    // cursor.key is a name, like "Bill", and cursor.value is the SSN.
    // No way to directly get the rest of the stored object.
    alert("Name: " + cursor.key + ", SSN: " + cursor.value);
    cursor.continue();
  }
};

/*
  var objectStore2 = db.transaction("customers").objectStore("customers");

  objectStore2.openCursor().onsuccess = function(event) {
    var cursor = event.target.result;
    if (cursor) {
      alert("Name for SSN " + cursor.key + " is " + cursor.value.name);
      cursor.continue();
    }
    else {
      alert("No more entries!");
    }
  };
*/
/*
// readonly
  var transaction = db.transaction(["customers"]);
  var objectStore = transaction.objectStore("customers");
  var request = objectStore.get("444-44-4444");
  request.onerror = function(event) {
    // Handle errors!
  };
  request.onsuccess = function(event) {
    // Do something with the request.result!
    alert("Name for SSN 444-44-4444 is " + request.result.name);
  };
*/

/*
  // readwrite insert
  var transaction = db.transaction(["customers"], "readwrite");
  // Do something when all the data is added to the database.
  transaction.oncomplete = function(event) {
    alert("All done!");
  };

  var objectStore = transaction.objectStore("customers");
  for (var i in customerData) {
    var request = objectStore.add(customerData[i]);
    request.onsuccess = function(event) {
      // event.target.result == customerData[i].ssn;
      alert("added" + event.target.result)
    };
  }
  */
});
