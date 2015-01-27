define(
    [
        "Utils",
        "data/FileStore",
        "gl/Reactor",
        "gl/Dish",
        "gl/Rule",
        "gl/Palette",
        "gl/ParticleSystem"
    ],
    function(utils, FileStore,  Reactor, Dish, Rule, Palette, ParticleSystem){

        var ResLoader = function() {
            this.queue = {};
            this.types = {};
            this.factories = {
                "ecfile": function(arraybuffer) { return new ECFile(arraybuffer); },
            };
            this.objs = {};
        };

        ResLoader.prototype.load = function(id, url, type) {
            this.queue[id] = url;
            this.types[id] = type;
            var o = {};
            this.objs[id] = o;
            return o;
        };

        ResLoader.prototype.start = function(useDB, cb) {
            var item;
            var data = {};
            var loaderCtx = this;
            var itemsToLoad = Object.keys(this.queue).length;
            var loadedCount = 0;

            var doParsing = function(result, givenType) {
                if (loaderCtx.factories[givenType])
                    result = loaderCtx.factories[givenType](result);
                return result;
            };

            var createBla = function(key) {
                return function(result) {
                    data[key] = result;
                    loadedCount++;
                    loaderCtx.objs[key].value = result;
                    if (loadedCount == itemsToLoad) {
                        cb(data);
                    }
                };
            };
            var ctx = this;
            var iterateAll = function(cachedNames) {
                _.each(ctx.queue, function(url, key) {
                    var givenType = ctx.types[key];
                    var factory = loaderCtx.factories[givenType];
                    var type = factory ? "arraybuffer" : givenType || "arraybuffer";

                    // used cache version if availab
                    if (useDB && _.contains(cachedNames, url))
                    {
                        FileStore.loadRule(url, function(rule) {
                            var result = rule.ruleData;
                            createBla(key)(result);
                        });
                    }
                    else
                    {
                        utils.getFromURL(ctx.queue[key], type, function(result) {
                            result = doParsing(result, givenType);

                            if (useDB)
                                FileStore.storeRule(url, result);

                            createBla(key)(result);
                        });
                    }
                });
            };

            if (useDB) {
                var oldIterateAll = iterateAll;
                iterateAll = function() {
                    FileStore.ready(function() {
                        FileStore.loadAllRuleNames(function(cachedNames) {
                            oldIterateAll(cachedNames);
                        });
                    });
                };
            }

            iterateAll();
        };

        var ECFile = function(arrayBuffer) {
            if (arrayBuffer)
                this.loadFromArrayBuffer(arrayBuffer);
        };

        ECFile.prototype.saveToBlob = function() {
            var evoCellData = this;
            var rawData = this.saveToArrayBuffer();
            var blob = new Blob([rawData], {type: 'application/octet-stream'});
            return blob;
        };

        ECFile.prototype.saveToDataURL = function() {
            var evoCellData = this;
            var rawData = this.saveToArrayBuffer();
            var base64Encoded = arrayBufferToBase64(rawData);
            return 'data:application/octet-stream;base64,' + base64Encoded;
        };

        ECFile.prototype.saveToArrayBuffer = function() {
            var evoCellData = this;
            //calculate target size
            var bufferSize = 20; //magic + contains flags + reserved

            if (evoCellData.containsRule) {
                bufferSize += 12; //magic + nrStates + nrNeighbours
                bufferSize += evoCellData.ruleTableSize;
            }

            if (evoCellData.containsNeighbourhood) {
                bufferSize += 12; //magic + nrNeighbours + nrDimensions
                bufferSize += 8 * evoCellData.neighbourhood.length;
            }

            if (evoCellData.containsPattern) {
                bufferSize += 16; //magic + nrDimensions + width + height
                bufferSize += evoCellData.patternWidth * evoCellData.patternHeight;
            }

            var arrayBuffer = new ArrayBuffer(bufferSize);
            var dv = new DataView(arrayBuffer);
            var index = 0;

            //general part
            dv.setUint32(index, 0x0000002A); index += 4;
            dv.setUint32(index, evoCellData.containsRule ? 1 : 0); index += 4;
            dv.setUint32(index, evoCellData.containsNeighbourhood ? 1 : 0); index += 4;
            dv.setUint32(index, evoCellData.containsPattern ? 1 : 0); index += 4;
            dv.setUint32(index, 0); index += 4;

            if (evoCellData.containsRule) {
                dv.setUint32(index, 0x00000913); index += 4;
                dv.setUint32(index, evoCellData.nrStates); index += 4;
                dv.setUint32(index, evoCellData.nrNeighbours); index += 4;
                var ruleTableBuffer = new Uint8Array(arrayBuffer, index, evoCellData.ruleTableSize);
                ruleTableBuffer.set(evoCellData.ruleTable, 0);
                index += Math.pow(evoCellData.nrStates, evoCellData.nrNeighbours);
            }

            if (evoCellData.containsNeighbourhood) {
                dv.setUint32(index, 0x0000004E31); index += 4;
                dv.setUint32(index, evoCellData.nrNeighbours); index += 4;
                dv.setUint32(index, 2); index += 4;
                for (var i = 0; i < evoCellData.nrNeighbours; i++) {
                    dv.setUint32(index, evoCellData.neighbourhood[i][0]); index += 4;
                    dv.setUint32(index, evoCellData.neighbourhood[i][1]); index += 4;
                }
            }

            if (evoCellData.containsPattern) {
                dv.setUint32(index, 0x00005ABF); index += 4;
                dv.setUint32(index, 2); index += 4;
                dv.setUint32(index, evoCellData.patternWidth); index += 4;
                dv.setUint32(index, evoCellData.patternHeight); index += 4;
                var patternDataAlias = new Uint8Array(arrayBuffer, index, evoCellData.patternWidth * evoCellData.patternHeight);
                patterDataAlias.set(evoCellData.patternData, 0);
            }

            return arrayBuffer;
        }

        // returns an object with up to 3 fileds: neighbourhood, ruletable, pattern
        // or null if a fileformat error is detected
        ECFile.prototype.loadFromArrayBuffer = function(arrayBuffer) {
            var evoCellData = this;
            var nrNeighbours, nrStates, nrDimensions;
            var magic, containsRules, containsNeighbourhood, containsPattern, neighbourCount;

            var dv = new DataView(arrayBuffer);
            var index = 0;

            magic = dv.getUint32(index); index += 4;
            // all evocellfiles must start with 0x002A
            if (magic != 42) return null;

            containsRules = dv.getUint32(index); index += 4;
            containsNeighbourhood = dv.getUint32(index); index += 4;
            containsPattern = dv.getUint32(index); index += 4;
            index += 4; // ignore reserved but unused value

            if (containsRules) {
                var rulesMagic = dv.getUint32(index); index += 4;
                // valid rules must have this magic value here
                if (rulesMagic != 2323) return null;
                nrStates =  dv.getUint32(index); index += 4;
                nrNeighbours  = dv.getUint32(index); index += 4;

                var ruleTableSize = Math.pow(nrStates, nrNeighbours);
                var ruleTable = new Uint8Array(arrayBuffer, index, ruleTableSize);
                //var ruleTableView = new Uint8Array(ruleTableSize);
                //var ruleTable = ruleTableView.buffer;
                //alert(ruleTableView.subarray);
                index += ruleTableSize;

                evoCellData.containsRule = true;
                evoCellData.nrStates = nrStates;
                evoCellData.nrNeighbours = nrNeighbours;
                evoCellData.ruleTable = ruleTable;
                evoCellData.ruleTableSize = ruleTableSize; // convinient to have but redundant
            }
            else
                evoCellData.containsRule = false;

            if (containsNeighbourhood) {
                var neighbourhoodMagic = dv.getUint32(index); index += 4;
                // valid rules must have this magic value here
                if (neighbourhoodMagic != 0x4E31) return null;
                var nrNeighboursRedundant  = dv.getUint32(index); index += 4;
                // nr of neighbours has to match
                if (nrNeighbours != nrNeighboursRedundant) return null;
                nrDimensions =  dv.getUint32(index); index += 4;
                if (nrDimensions != 2) return null;

                var neighbourhood = [];
                for (n = 0; n < nrNeighbours; n++)
                {
                    var x = dv.getInt32(index); index += 4;
                    var y = dv.getInt32(index); index += 4;
                    neighbourhood.push([x, y]);
                }

                evoCellData.containsNeighbourhood = true;
                evoCellData.nrDimensions = nrDimensions;
                evoCellData.neighbourhood = neighbourhood;
                evoCellData.symmetries = calculateSymmetries(evoCellData);
            }
            else
                evoCellData.containsNeighbourhood = false;

            if (containsPattern) {
                var patternMagic = dv.getUint32(index); index += 4;
                // valid rules must have this magic value here
                if (patternMagic != 23231) return null;
                var nrDimensions =  dv.getUint32(index); index += 4;
                if (nrDimensions != 2) return null;

                var sizeX = dv.getInt32(index); index += 4;
                var sizeY = dv.getInt32(index); index += 4;

                var pattern = new Uint8Array(arrayBuffer, index, sizeX*sizeY);

                evoCellData.containsPattern = true;
                evoCellData.patternWidth = sizeX;
                evoCellData.patternHeight = sizeY;
                evoCellData.patternData = pattern;
            }
            else
                evoCellData.containsPattern = false;

            return evoCellData;
        }

        function calculateSymmetries(evoCellData){
            symmetryPermutations = [];

            for (var rot = 0; rot < 4; rot++)
            {
                var rotVals = [];
                for (var i = 0; i < evoCellData.nrNeighbours; i++)
                {
                    var roted = evoCellData.neighbourhood[i];
                    for (var r = 0; r < rot; r++)
                        roted = rot90(roted);

                    for (var s = 0; s < evoCellData.nrNeighbours; s++)
                    {
                        if (evoCellData.neighbourhood[s][0] == roted[0] && evoCellData.neighbourhood[s][1] == roted[1])
                        {
                            rotVals.push(s);
                            break;
                        }
                    }
                }
                // check if rotation was successful
                if (rotVals.length == evoCellData.neighbourhood.length)
                {
                    symmetryPermutations.push(rotVals);
                }
            }
            return symmetryPermutations;
        }

        // dirty does not allocate assumes 4 states, moore
        ECFile.prototype.MakeStarWarsRule = function() {
            var rt = this.ruleTable;
            var states = 4;

            var d = [0,0,0, 0,0,0, 0,0,0];

            var idx = 0;
            for (d[8] = 0; d[8] < states; d[8]++) {
                for (d[7] = 0; d[7] < states; d[7]++) {
                    for (d[6] = 0; d[6] < states; d[6]++) {
                        for (d[5] = 0; d[5] < states; d[5]++) {
                            for (d[4] = 0; d[4] < states; d[4]++) {
                                for (d[3] = 0; d[3] < states; d[3]++) {
                                    for (d[2] = 0; d[2] < states; d[2]++) {
                                        for (d[1] = 0; d[1] < states; d[1]++) {
                                            for (d[0] = 0; d[0] < states; d[0]++) {

                                                var res = 0;

                                                var sum = 0;
                                                for (var i = 1; i < 9; i++) {
                                                    if (d[i] == 3) {
                                                        sum++;
                                                    }
                                                }

                                                if (d[0] == 0) {
                                                    if (sum ==2) res = 3;
                                                    else res = 0;
                                                }
                                                else if (d[0] == 3) {
                                                    if (sum == 3 || sum == 4 || sum == 5) res = 3;
                                                    else res = d[0]-1;
                                                }
                                                else {
                                                    res = d[0]-1;
                                                }

                                                rt[idx] = res;
                                                idx++;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        function rot90(xy){
            return [-xy[1], xy[0]];
        }

        return {
            ECFile : ECFile,
            Reactor: Reactor,
            Dish: Dish,
            Rule: Rule,
            Palette : Palette,
            ParticleSystem: ParticleSystem,
            ResLoader: ResLoader
        }
    }
);
