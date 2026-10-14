function add_note(time, note_name)
{
   if(_parent != undefined)
   {
      _parent.addNote(note_name,time);
   }
}
function stop_note(time, note_name)
{
   if(_parent != undefined)
   {
      _parent.stopNote(note_name,time);
   }
}
function PlaySound(soundNote)
{
   var _loc4_;
   if(_parent.instrument_option.value == "piano")
   {
      gotoAndStop(soundNote);
      _loc4_ = new Sound(this);
      _loc4_.attachSound(soundNote);
      _loc4_.start();
   }
   else
   {
      gotoAndStop(soundNote);
      instrument_sounds[_parent.instrument_option.value][oldnotes[soundNote]].start();
   }
}
function text_focus()
{
   write = true;
}
function text_blur()
{
   write = false;
}
var pianoSound = new Sound(this);
var prev_press;
var key_map = new Array();
var write = false;
key_map["50"] = "c1s";
key_map["51"] = "d1s";
key_map["53"] = "f1s";
key_map["54"] = "g1s";
key_map["55"] = "a1s";
key_map["57"] = "c2s";
key_map["48"] = "d2s";
key_map["187"] = "f2s";
key_map["81"] = "c1";
key_map["87"] = "d1";
key_map["69"] = "e1";
key_map["82"] = "f1";
key_map["84"] = "g1";
key_map["89"] = "a1";
key_map["85"] = "b1";
key_map["73"] = "c2";
key_map["79"] = "d2";
key_map["80"] = "e2";
key_map["219"] = "f2";
key_map["221"] = "g2";
key_map["220"] = "a2";
key_map["65"] = "c2s";
key_map["83"] = "d2s";
key_map["70"] = "f2s";
key_map["71"] = "g2s";
key_map["72"] = "a2s";
key_map["16"] = "c2";
key_map["90"] = "d2";
key_map["88"] = "e2";
key_map["67"] = "f2";
key_map["86"] = "g2";
key_map["66"] = "a2";
key_map["78"] = "b2";
key_map["77"] = "c3";
var instrument_sounds = new Array();
var oldnotes = Array();
oldnotes.c1 = 1;
oldnotes.c1s = 2;
oldnotes.d1 = 3;
oldnotes.d1s = 4;
oldnotes.e1 = 5;
oldnotes.f1 = 6;
oldnotes.f1s = 7;
oldnotes.g1 = 8;
oldnotes.g1s = 9;
oldnotes.a1 = 10;
oldnotes.a1s = 11;
oldnotes.b1 = 12;
oldnotes.c2 = 13;
oldnotes.c2s = 14;
oldnotes.d2 = 15;
oldnotes.d2s = 16;
oldnotes.e2 = 17;
oldnotes.f2 = 18;
oldnotes.f2s = 19;
oldnotes.g2 = 20;
oldnotes.g2s = 21;
oldnotes.a2 = 22;
oldnotes.a2s = 23;
oldnotes.b2 = 24;
oldnotes.c3 = 25;
var key_presses = new Array();
keyObject = new Object();
keyObject.onKeyDown = function()
{
   if(write)
   {
      return undefined;
   }
   n1 = key_map[Key.getCode()];
   if(n1 == undefined)
   {
      return undefined;
   }
   if(!key_presses[Key.getCode()])
   {
      key_presses[Key.getCode()] = true;
      if(n1 != undefined)
      {
         add_note(getTimer(),n1);
         PlaySound(n1);
      }
   }
};
keyObject.onKeyUp = function()
{
   n1 = key_map[Key.getCode()];
   if(n1 == undefined)
   {
      return undefined;
   }
   key_presses[Key.getCode()] = false;
   stop_note(getTimer(),n1);
   gotoAndStop(2);
};
Key.addListener(keyObject);
var loading_amt = 0;
_parent.instrument_option.addEventListener("change",function(evt)
{
   trace(_parent.instrument_option.value);
   var _loc2_;
   if(instrument_sounds[_parent.instrument_option.value] == undefined)
   {
      instrument_sounds[_parent.instrument_option.value] = new Array();
      loading_status.text = "Loading. Please wait...";
      loading_amt = 0;
      loading_bar.visible = true;
      loading_bar.setProgress(0,25);
      _loc2_ = 1;
      while(_loc2_ <= 25)
      {
         instrument_sounds[_parent.instrument_option.value][_loc2_] = new Sound();
         instrument_sounds[_parent.instrument_option.value][_loc2_].loadSound("http://joshkoo.comp.nus.edu.sg/mymusic/notes/" + _parent.instrument_option.value + "/" + _loc2_ + ".mp3",false);
         instrument_sounds[_parent.instrument_option.value][_loc2_].setPan(int((_loc2_ - 12.5) * 200 / 25));
         instrument_sounds[_parent.instrument_option.value][_loc2_].onLoad = function()
         {
            loading_amt++;
            var _loc1_;
            if(loading_amt < 25)
            {
               _loc1_ = "Loading " + (loading_amt * 4).toString() + "%";
               loading_status.text = _loc1_;
               loading_bar.setProgress(loading_amt,25);
            }
            else
            {
               loading_status.text = "";
               loading_bar.visible = false;
            }
         };
         _loc2_ = _loc2_ + 1;
      }
   }
}
);
gotoAndStop(2);
