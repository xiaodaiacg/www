
var $useHtml5Audio = false;

Game_Battler.prototype.onDamage = function(value) {
    this.removeStatesByDamage();
};

Game_Battler.prototype.onBattleEnd = function() {
    this.clearResult();
    this.removeBattleStates();
    this.removeAllBuffs();
    this.clearActions();
    if (!this.isPreserveTp()) {
        this.setTp(Math.randomInt(25 + this._tp/2));
    }
    this.appear();
};

Game_Battler.prototype.onBattleStart = function() {
    this.setActionState('undecided');
    this.clearMotion();
};

Scene_Boot.prototype.isGameFontLoaded = function() {
        return true;
};



Graphics._createGameFontLoader = function() {
};





AudioManager.checkWebAudioError = function(webAudio) {
    if (webAudio && webAudio.isError()) {
        //throw new Error('Failed to load: ' + webAudio.url);
    }
};

Html5Audio._onError = function () {
    alert('Html5Audio Failed to load: ' + Html5Audio._url);
};


Bitmap.prototype._onError = function() {
    this._hasError = true;
    
};

ImageManager.isReady = function() {
    for (var key in this._cache) {
        var bitmap = this._cache[key];
        if (bitmap.isError()) {
           // throw new Error('Failed to load: ' + bitmap.url);
           alert('Failed to load: ' + bitmap.url);
           bitmap._hasError = false;
           return true;
        }
        if (!bitmap.isReady()) {
            return false;
        }
    }
    return true;
};


DataManager.makeSavefileInfo = function() {
    var info = {};
    info.globalId   = this._globalId;
    info.title      = $dataSystem.gameTitle;
    info.characters = $gameParty.charactersForSavefile();
    info.faces      = $gameParty.facesForSavefile();
    info.playtime   = $gameSystem.playtimeText();
    info.timestamp  = Date.now();
    return info;
};

WebAudio.prototype._load = function(url) {
    if (WebAudio._context) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
            if (xhr.status < 400) {
                this._onXhrLoad(xhr);
            }
        }.bind(this);
        xhr.onerror = function() {
            this._hasError = true;
        }.bind(this);
        xhr.send();
    }
};

SceneManager.initAudio = function() {
    var noAudio = Utils.isOptionValid('noaudio');
    if (!WebAudio.initialize(noAudio) && !noAudio) {
        $useHtml5Audio = true;//throw new Error('Your browser does not support Web Audio API.');
    }
};

AudioManager.shouldUseHtml5Audio = function() {
    // We use HTML5 Audio to play BGM instead of Web Audio API
    // because decodeAudioData() is very slow on Android Chrome.
    return Utils.isAndroidChrome() || $useHtml5Audio;
};


Scene_Map.prototype.onMapLoaded = function() {
    if (this._transfer) {
        $gamePlayer.performTransfer();
        $gameSystem.onBeforeSave();
        DataManager.saveGame(1);
    }
    this.createDisplayObjects();
};

Game_Player.prototype.moveStraight = function(d) {
    if (this.canPass(this.x, this.y, d)) {
        NetworkPlayerManager.updateMove();
        this._followers.updateMove();
        NetworkManager.sendMsg("MoveStraight:"+ d +"," +
         this.realMoveSpeed());
    }
    Game_Character.prototype.moveStraight.call(this, d);
};

Game_Player.prototype.reserveTransfer = function(mapId, x, y, d, fadeType) {
    this._transferring = true;
    this._newMapId = mapId;
    this._newX = x;
    this._newY = y;
    this._newDirection = d;
    this._fadeType = fadeType;
    NetworkPlayerManager.MapPlayerList.forEach(function(player){
        NetworkPlayerManager.DelMapPlayer(player.Id);
    }, this);
    $gameSystem.enableEncounter();
    NetworkManager.sendMsg("MapChange:"+mapId+
    ","+x+","+y+
    ","+(ConfigManager.PKFlag?1:0)+
    ","+$gamePlayer.actorName()
    );
};

Game_Player.prototype.actorName = function() {
    var actor = $gameParty.members()[0];
    return actor ? actor.name() : '';
};
Scene_Load.prototype.onLoadSuccess = function() {
    SoundManager.playLoad();
    this.fadeOutAll();
    this.reloadMapIfUpdated();
    SceneManager.goto(Scene_Map);
    this._loadSuccess = true;
    NetworkPlayerManager.MapPlayerList.forEach(function(player){
        NetworkPlayerManager.DelMapPlayer(player.Id);
    }, this);
    NetworkManager.sendMsg("MapChange:"+$gameMap.mapId()+
    ","+$gamePlayer.x+
    ","+$gamePlayer.y+
    ","+(ConfigManager.PKFlag?1:0)+
    ","+$gamePlayer.actorName()
    );
};


function Game_NetPlayer() {
    this.initialize.apply(this, arguments);
}

Game_NetPlayer.prototype = Object.create(Game_Character.prototype);
Game_NetPlayer.prototype.constructor = Game_NetPlayer;

Game_NetPlayer.prototype.initialize = function() {
    Game_Character.prototype.initialize.call(this);
    this.Id = 0;
    this.mapCreateSprite = null;
    this.deleteState = 0;
    this.netName = "Guest";
    this.PKFlag = 0;
    this.battleState = 0;
    this.refreshState = 0;
//    this.textSprite = null;
};


Spriteset_Map.prototype.update = function() {
    Spriteset_Base.prototype.update.call(this);
    this.updateTileset();
    this.updateParallax();
    this.updateTilemap();
    this.updateShadow();
    this.updateWeather();
    this.updateNetPlayer();
};

Spriteset_Map.prototype.updateNetPlayer = function() {

    var list = NetworkPlayerManager.MapPlayerList;
    for (var i = 0; i < list.length; i++) {
        var player = list[i];
        if (player.deleteState == 1) {
            this._tilemap.removeChild(player.mapCreateSprite);
            console.log("removeChild");
            delete player.mapCreateSprite;
            var index = list.indexOf(player);
            list.splice(index, 1);
        }
        else if (player.mapCreateSprite == null) {
           // if (this.IsLoaded){

        player.mapCreateSprite = new Sprite_OtherCharacter(player);
        player.updateState = 1;
        this._tilemap.addChild(player.mapCreateSprite);
        console.log("addChild");

        }
        if (player.updateState == 1 && player.mapCreateSprite) {
           player.updateState = 0;
           player.mapCreateSprite.drawInfo();
        }
    }
}

Spriteset_Map.prototype.createLowerLayer = function() {
    Spriteset_Base.prototype.createLowerLayer.call(this);
    this.createParallax();
    this.createTilemap();
    this.createCharacters();
    this.createShadow();
    this.createDestination();
    this.createWeather();
    //this.IsLoaded = true;
    console.log("createLowerLayer");
};

Spriteset_Map.prototype.initialize = function() {
    Spriteset_Base.prototype.initialize.call(this);
    console.log("Spriteset_Map");
    this.nametext = null;
    this.batInfo = null;
};


Spriteset_Map.prototype.createCharacters = function() {
    this._characterSprites = [];
    console.log("_characterSprites");
    $gameMap.events().forEach(function(event) {
        this._characterSprites.push(new Sprite_Character(event));
    }, this);
    $gameMap.vehicles().forEach(function(vehicle) {
        this._characterSprites.push(new Sprite_Character(vehicle));
    }, this);
    $gamePlayer.followers().reverseEach(function(follower) {
        this._characterSprites.push(new Sprite_Character(follower));
    }, this);
    NetworkPlayerManager.MapPlayerList.forEach(function(player) {
        if (player.mapCreateSprite) {
            delete player.mapCreateSprite;
        }
        player.mapCreateSprite = new Sprite_OtherCharacter(player);
        player.updateState = 1;
        this._characterSprites.push(player.mapCreateSprite); 
    }, this);
    this._characterSprites.push(new Sprite_Character($gamePlayer));
    for (var i = 0; i < this._characterSprites.length; i++) {
        this._tilemap.addChild(this._characterSprites[i]);
    }
};






Game_Map.prototype.update = function(sceneActive) {
    this.refreshIfNeeded();
    if (sceneActive) {
        this.updateInterpreter();
    }
    this.updateScroll();
    this.updateEvents();
    this.updateMapPlayers();
    this.updateVehicles();
    this.updateParallax();
};

Game_Map.prototype.updateMapPlayers = function() {
    NetworkPlayerManager.MapPlayerList.forEach(function(player) {
        player.update();
    });
};


SceneManager.update = function() {
        this.tickStart();
        this.updateInputData();
        this.updateMain();
        this.tickEnd();
        NetworkManager.update();
};

SceneManager.onSceneStart = function() {
    Graphics.endLoading();
    this._scene.showListBox();
};

DataManager.isThisGameFile = function(savefileId) {
    var globalInfo = this.loadGlobalInfo();
    if (globalInfo && globalInfo[savefileId]) {
        if (StorageManager.isLocalMode()) {
            return true;
        } else {
            var savefile = globalInfo[savefileId];
            return (savefile.globalId === this._globalId);
        }
    } else {
        return false;
    }
};

function Sprite_OtherCharacter() {
    this.initialize.apply(this, arguments);
}

Sprite_OtherCharacter.prototype = Object.create(Sprite_Character.prototype);
Sprite_OtherCharacter.prototype.constructor = Sprite_OtherCharacter;

Sprite_OtherCharacter.prototype.updateOther = function() {
    Sprite_Character.prototype.updateOther.call(this);
    
    
};

Sprite_OtherCharacter.prototype.drawInfo = function() {
    var player = this._character;
    this.nametext.bitmap.textColor = (player.PKFlag == 1)?'#ff0000':'#ffffff';
    var bitmap = ImageManager.loadSystem('IconSet');
    var iconIndex = 0;
    if (player.battleState != 0) {
        iconIndex = (player.battleState == 2)? 82:5;
    }
    this.nametext.bitmap.clear();
    this.batInfo.bitmap.clear();
    this.batInfo.bitmap.blt(bitmap, iconIndex % 16 * 32, Math.floor(iconIndex / 16) * 32, 32, 32, 0, 0);
    this.nametext.bitmap.drawText(player.netName, 0, 0, 128 , 16, 'center');
};

Sprite_OtherCharacter.prototype.initialize = function(character) {
    Sprite_Character.prototype.initialize.call(this,character);
    this.batInfo = new Sprite(new Bitmap(32, 32));
    this.nametext = new Sprite(new Bitmap(128, 16));
    this.nametext.anchor.x = 0.5;
    this.nametext.anchor.y = 4;
    this.batInfo.anchor.x = 0.5;
    this.batInfo.anchor.y = 1;
    this.nametext.bitmap.outlineWidth = 3;
    this.nametext.bitmap.fontSize = 12;
    this.addChild(this.batInfo);
    this.addChild(this.nametext);
};



Graphics._createUpperCanvas = function() {
    this._upperCanvas = document.createElement('canvas');
    this._upperCanvas.id = 'UpperCanvas';
    this._updateUpperCanvas();
    document.body.appendChild(this._upperCanvas);
    this.e2 = document.createElement("lable");
    
    this.e3 = document.createElement("input");
    this.e3.type = "text"
    this.e3.id = "inputT"; 
    this.e3.value = ""; 
    
    this.e4 = document.createElement("input");
    this.e4.type = "button";
    this.e4.id = "button";
    this.e4.value = "发送";
    this.e4.onclick = function(){
    if (document.getElementById("inputT").value =="") {
        return;
    }
        NetworkManager.sendMsg("Say:"+","+"-1"+","+$gamePlayer.actorName()+":"+document.getElementById("inputT").value);
        document.getElementById("inputT").value='';
        document.getElementById("inputT").focus();
    }
    this.e3.onkeydown = function(event){
    if (document.getElementById("inputT").value =="") {
        return;
    }
        var evt=evt?evt:(window.event?window.event:null);//兼容IE和FF
        if (evt.keyCode==13){

            NetworkManager.sendMsg("Say:"+","+"-1"+","+$gamePlayer.actorName()+":"+document.getElementById("inputT").value);
            document.getElementById("inputT").value='';
            document.getElementById("inputT").focus();
        }
    }
    this.e2.id = "inputbox";
    this.e2.display = "none"
    this.e2.width = 300;
    this.e2.height = 24;
    this.e2.style.zIndex = 5;
    this._centerElement(this.e2);
    this.e2.style.top = 600 +"px";
    this.e2.style.left = 100+"px";
    this.e3.width = 240+"px";
    this.e2.appendChild(this.e3);
    this.e2.appendChild(this.e4);
    //this.e2.hide();
    document.body.appendChild(this.e2);
    this.e2.style.display="none";
};

Graphics._updateUpperCanvas = function() {
    this._upperCanvas.width = this._width;
    this._upperCanvas.height = this._height;
    this._upperCanvas.style.zIndex = 3;
    this._centerElement(this._upperCanvas);
};

$canInput         = true;

SceneManager.updateInputData = function() {
    Input.update();
    TouchInput.update();
};

SceneManager.initialize = function() {
    this.initGraphics();
    this.checkFileAccess();
    this.initAudio();
    this.initInput();
    this.initNwjs();
    this.checkPluginErrors();
    this.setupErrorHandlers();
    $canInput = true;
};

SceneManager.onTalkDown = function() {
    if ($canInput) {
        document.getElementById("inputbox").style.display = "inline";
        document.getElementById("inputT").focus();
        $canInput = false;
    }
    else{
        document.getElementById("inputbox").style.display = "none";
        $canInput = true;
    }
    console.log($canInput);
    
}

Game_Player.prototype.canMove = function() {
    if ($gameMap.isEventRunning() || $gameMessage.isBusy()) {
        return false;
    }
    if (this.isMoveRouteForcing() || this.areFollowersGathering()) {
        return false;
    }
    if (this._vehicleGettingOn || this._vehicleGettingOff) {
        return false;
    }
    if (this.isInVehicle() && !this.vehicle().canMove()) {
        return false;
    }
    if (!$canInput) {
        return false;
    }
    return true;
};

Input._onKeyDown = function(event) {
    if (this._shouldPreventDefault(event.keyCode)) {
        event.preventDefault();
    }
    if (event.keyCode === 144) {    // Numlock
        this.clear();
    }
    if (event.keyCode === 13){
        SceneManager.onTalkDown.call(this);
    }
    var buttonName = this.keyMapper[event.keyCode];
    if (buttonName) {
        this._currentState[buttonName] = true;
    }
};

$version = "0.25"