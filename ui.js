var blessed = require('blessed');
program=blessed.program();

var screen = blessed.screen({
  autoPadding: true,
  smartCSR: true,
});

var box = blessed.box({
  top: '0',
  left: '0',
  width: '100%',
  height: '100%',
  autoPadding:true,
  padding:{left:1,top:0,right:1,bottom:1},
  content: '',
  tags: true,
  style: {
    fg: '#ffffff',
    bg: '#333333'
  }
});


screen.append(box);

var menuBar = blessed.box({
	height: 1,
	top: 0,
	left: 0,
});
box.append(menuBar);

makeMenuBarButton = require("./menubar")(blessed, box, screen, menuBar);

makeMenuBarButton("File", [
	["test", function(){console.log("A");}],
	["hi!", function(){console.log("B");}]
]);

RenderTerm = blessed.box({
	top:2,
	left:0,
	content:'Testing',
	style: {
		fg: 'white',
		bg: 'black'
	}
});
RenderTerm.buff = [];

RenderTerm.setch = function(x, y, ch, bg, fg) {
	if(typeof bg=='undefined' || typeof fg=='undefined' ||
	   typeof x=='undefined' || typeof y=='undefined') {
		return;
	}
	if(typeof ch=='undefined') ch=" ";
	
	program.bg(bg);
	program.fg(fg);
	program.setx(x||1);
	program.sety(y||1);
	program.write(ch);
	if(typeof RenderTerm.buff[y]=='undefined') RenderTerm.buff[y]=[];
	RenderTerm.buff[y][x] = {'bg':bg,'fg':fg,'ch':ch};
};
RenderTerm.setch_nobuf = function(x,y,ch,bg,fg) {
	if(typeof bg=='undefined' || typeof fg=='undefined' ||
	   typeof x=='undefined' || typeof y=='undefined') {
		return;
	}
	if(typeof ch=='undefined') ch=" ";
	program.bg(bg);
	program.fg(fg);
	program.setx(x);
	program.sety(y);
	program.write(ch);
};
RenderTerm.redraw_from_buf = function(x,y) {
	if(typeof RenderTerm.buff[y]=='undefined') RenderTerm.buff[y]=[];
	if(typeof RenderTerm.buff[y][x]=='undefined') RenderTerm.buff[y][x]={ch:" ",fg:'white',bg:'black'};
	var c = RenderTerm.buff[y][x];
	RenderTerm.setch(x,y,c.ch,c.bg,c.fg);
};
RenderTerm.setsize = function(w,h) {
	RenderTerm.width = w;
	RenderTerm.height= h;
};
box.append(RenderTerm);



// Focus our element.
box.focus();

// Render the screen.
screen.render();

// Quit on Escape, q, or Control-C.
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});
var RE_RENDER = function(){
	b = RenderTerm.buff;
	for(var y=0;y<RenderTerm.buff.length;y++) {
		if(typeof RenderTerm.buff[y] != 'undefined') {
			for(var x=0;x<RenderTerm.buff[y].length;x++) {
				if(typeof RenderTerm.buff[y][x] != 'undefined') {
					var c = RenderTerm.buff[y][x];
					RenderTerm.setch(x,y,c.ch,c.bg,c.fg);
				}
			}
		}
	}
};
screen.on('resize', RE_RENDER);
var keylist = [];
var keytimeoutlist = [];

//TODO: Is it possible to detect keyup?  This is a terrible hack.

var keyListeners = [];
AddKeyListener = function(down, up) {
	var kl = {d:down,u:up};
	keyListeners.push(kl);
	return keyListeners.indexOf(kl);
};
RemKeyListener = function(id) {
	keyListeners.splice(id, 1);
};

var enterCaught = false;
program.on('keypress', function(ch, key){
	
	// Enter key sends both "enter" and "return"`` events.
	// We only need one, so we filter out the second (return).
	if(key.name=="enter") {
		enterCaught=true;
		key.name="";
		key.full="";
		ch=undefined;
		key.code=13;
	} else if(key.name=="return") {
		//if(enterCaught) {
		//	console.log("ENTER WAT");
		//	enterCaught = false;
			return;
		//}
	} else {
		enterCaught = false;
	}
	
	if(key.name=="backspace") {
		key.code = 8; // Backspace key from globals.js
		setTimeout(RE_RENDER,50);
		ch=undefined;
	}

	if(key.name=="tab") {
		key.code = 9;
		ch = undefined;
	}

	if(key.full=="C-`") {
		ch = undefined;
		key.code = 17;
	}
	//if(key.full=="C-t") {
	//	ch = undefined;
	//	key.code = 
	//}

	var pos = keylist.indexOf(key.full);
	var wasdown = false;
	if(pos>-1) {
		wasdown = true;
		keylist.splice(pos, 1);
		clearTimeout(keytimeoutlist[pos]);
		keytimeoutlist.splice(pos, 1);
	}

	for(var i=0;i<keyListeners.length;i++) {
		keyListeners[i].d(ch, key);
	}
	keylist.push(key.full);
	keytimeoutlist.push(setTimeout(function(){

		var pos = keylist.indexOf(key.full);		
		for(var i=0;i<keyListeners.length;i++) {
			keyListeners[i].u(ch, key);
		}
		if(pos>-1) {
			keylist.splice(pos, 1);
			keytimeoutlist.splice(pos, 1);
		}

	}, wasdown?100:700));
});

setInterval(RE_RENDER,500);
