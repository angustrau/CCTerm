var blessed = require('blessed');
program=blessed.program();
//program.enableMouse();
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

var quitButton = blessed.button({
		width: 6,
		left:0,
		top:0,
		content: " Quit ",
		bg: 'white',
		fg: 'black',
});
quitButton.on('mouse', function(e){if(e.action == 'mousedown')process.exit(0);});
var wipeButton = blessed.button({
		width: 6,
		left:7,
		top:0,
		content: " Wipe ",
		bg: 'white',
		fg: 'black',
});
var shellCmd = require('child_process').execSync;
wipeButton.on('mouse', function(e){
  if(e.action != 'mousedown') return;
  try {
    shellCmd("rm -R data/"+core.getActiveComputer().id+"/*");
  } catch(e){}
});

menuBar.append(quitButton);
menuBar.append(wipeButton);
menuBar.enableMouse();
quitButton.enableMouse();
wipeButton.enableMouse();


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
var SKIPYVAL = function(y){return y==1;};
RenderTerm.setch = function(x, y, ch, bg, fg) {

	if(SKIPYVAL(y)) return;

	if(typeof bg=='undefined' || typeof fg=='undefined' ||
	   typeof x=='undefined' || typeof y=='undefined') {
		return;
	}
	if(typeof ch=='undefined') ch=" ";

	if(!x || !y) return;

	program.bg(bg);
	program.fg(fg);
	program.setx(x);
	program.sety(y);
	program.write(ch);
	if(typeof RenderTerm.buff[y]=='undefined') RenderTerm.buff[y]=[];
	RenderTerm.buff[y][x] = {'bg':bg,'fg':fg,'ch':ch};
};
RenderTerm.setch_nobuf = function(x,y,ch,bg,fg) {

	if(SKIPYVAL(y)) return;

	if(typeof bg=='undefined' || typeof fg=='undefined' ||
	   typeof x=='undefined' || typeof y=='undefined') {
		return;
	}
	if(typeof ch=='undefined') ch=" ";

	if(!x || !y) return;

	program.bg(bg);
	program.fg(fg);
	program.setx(x);
	program.sety(y);
	program.write(ch);
};
RenderTerm.redraw_from_buf = function(x,y) {

	if(SKIPYVAL(y)) return;

	if(!x || !y) return;


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
screen.key(['C-c'], function(ch, key) {
  return process.exit(0);
});
var RE_RENDER = function(){
	b = RenderTerm.buff;
	var cursor_x = RenderTerm.CURSOR_POS.x;
	var cursor_y = RenderTerm.CURSOR_POS.y;
	var drawn_cursor = false;
	for(var y=0;y<RenderTerm.buff.length;y++) {
		if(typeof RenderTerm.buff[y] != 'undefined') {
			for(var x=0;x<RenderTerm.buff[y].length;x++) {
				if(typeof RenderTerm.buff[y][x] != 'undefined') {
					var c = RenderTerm.buff[y][x];
					var pfx = "";
					var sfx = "";
					if(cursor_x == x && cursor_y == y) {
						drawn_cursor = true;
						pfx = "\x1b[4m";
						sfx = "\x1b[24m";
						if(c.ch == " ") {
							c.fg = "light white";
						}
					}
					RenderTerm.setch_nobuf(x,y,pfx+c.ch+sfx,c.bg,c.fg);
				}
			}
		}
	}
};
RenderTerm.rerender = function(){RE_RENDER();};
screen.on('resize', RE_RENDER);
screen.on('resize', RenderTerm.refresh_buff);
RenderTerm.refresh_buff = function(){
	var comp = core.getActiveComputer();


	if(typeof comp !== 'undefined') {
		var w = comp.width;
		var h = comp.height;
		var lbg = 'black';
		var lfg = 'light white';

		for(var y=0;y<h;y++) {
			if(typeof RenderTerm.buff[y] == 'undefined') RenderTerm.buff[y] = [];
			for(var x=0;x<w;x++) {
				if(typeof RenderTerm.buff[y][x] == 'undefined') {
					RenderTerm.buff[y][x] = {ch:" ", bg: lbg, fg: lfg};
				} else {
					var l = RenderTerm.buff[y][x];
					lbg = l.bg;
					lfg = l.fg;
				}
			}
		}
	}
};

RenderTerm.CURSOR_POS = {x:-1,y:-1};

RenderTerm.set_render_cursor = function(rc, x, y) {
	RenderTerm.refresh_buff();
	if(RenderTerm.CURSOR_POS.x>-1)
		RenderTerm.redraw_from_buf(RenderTerm.CURSOR_POS.x,RenderTerm.CURSOR_POS.y);
	if(!rc) {
		RenderTerm.CURSOR_POS = {x:-1,y:-1};
	} else {
		RenderTerm.CURSOR_POS = {x:x,y:y};
	}
	RenderTerm.rerender();
}
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

var KEY_NAME_TO_KEY_CODE = {
	'tab':9,
	'C-`':17,
	'delete':46,
	'down':40,
	'end':35,
	'escape':27,
	'f1':112,
	'f2':113,
	'f3':114,
	'f4':115,
	'f5':116,
	'f6':117,
	'f7':118,
	'f8':119,
	'f9':120,
	'f10':121,
	'f11':122,
	'f12':123,
	'home':36,
	'insert':45,
	'left':37,
	'pagedown':34,
	'pageup':33,
	'right':39,
	'up':38
}

program.on('keypress', function(ch, key){
	//if(key.name=='p') {RE_RENDER(); return;}
	//if(key.name=='o') {RenderTerm.refresh_buff(); return;}
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
	var mappedKc = KEY_NAME_TO_KEY_CODE[key.name];
	if(typeof mappedKc == 'undefined') mappedKc = KEY_NAME_TO_KEY_CODE[key.full];
	if(typeof mappedKc != 'undefined') {
		key.code = mappedKc;
		ch = undefined;
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

	if(typeof key.code == 'undefined') {
		key.code = globals.charCodes[ch||key.name];
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

var interval_rer  = setInterval(RE_RENDER,2000);
var interval_rfsh = setInterval(RenderTerm.refresh_buff, 4000);

function KILL_RENDER_UPDATES() {
	clearInterval(interval_rer);
	clearInterval(interval_rfsh);
}
