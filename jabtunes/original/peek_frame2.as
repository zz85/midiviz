function stop_running()
{
   running = false;
}
function play_note(pitch, id)
{
   if(play_id == id)
   {
      container_piano.PlaySound(pitch);
   }
}
function move_key_up(pitch, id)
{
   if(play_id == id)
   {
      container_piano.gotoAndStop(2);
   }
}
function convert()
{
   var _loc2_ = "";
   var _loc3_ = 89;
   var _loc1_ = 0;
   while(_loc1_ < notes.length)
   {
      dur = notes[_loc1_].duration != undefined ? notes[_loc1_].duration : 100;
      _loc2_ += notes[_loc1_].start + "-" + int(oldnotes[notes[_loc1_].pitch] + 89) + "-" + dur + "/";
      _loc1_ = _loc1_ + 1;
   }
   if(_loc2_.length > 1)
   {
      _loc2_ = _loc2_.substr(0,_loc2_.length - 1);
   }
   return _loc2_;
}
function save(where)
{
   var _loc2_ = convert();
   trace(_loc2_);
   var _loc1_ = "index.php?page=search&";
   _loc1_ += "sourceid=melody-url&tx_mpsearch_pi1[submit_button]=Search&";
   _loc1_ += "tx_mpsearch_pi1[pc]=hum " + _loc2_ + "&";
   _loc1_ += "coll=" + searchwhat.value + "&";
   if(searchterms.text != undefined)
   {
      _loc1_ += "filtertext=" + searchterms.text + "&";
   }
   _loc1_ += "onlymatchfrom=" + searchwhere.value;
   trace(song_content);
   getURL(_loc1_,"_new");
}
function addNote(pitch, time)
{
   if(start_time == undefined)
   {
      start_time = getTimer();
   }
   var _loc1_ = notes.length;
   notes[_loc1_] = new Object();
   notes[_loc1_].pitch = pitch;
   notes[_loc1_].start = getTimer() - start_time;
   keys.text += notes[_loc1_].pitch + " ";
   song_content = keys.text;
}
function stopNote(pitch, time)
{
   var _loc1_ = notes.length;
   while(_loc1_ >= 0)
   {
      if(notes[_loc1_].pitch == pitch)
      {
         notes[_loc1_].duration = getTimer() - start_time - notes[_loc1_].start;
         break;
      }
      _loc1_ = _loc1_ - 1;
   }
}
var notes = new Array();
var start_time;
var song_content = "";
keys.text = "";
var running = false;
back_Button.onPress = function()
{
   notes.pop();
   if(notes.length > 1)
   {
      start_time = getTimer() - notes[notes.length - 1].start;
   }
   else
   {
      start_time = undefined;
   }
   keys.text = "";
   var _loc1_ = 0;
   while(_loc1_ < notes.length)
   {
      keys.text += notes[_loc1_].pitch + " ";
      _loc1_ = _loc1_ + 1;
   }
};
clearButton.onPress = function()
{
   start_time = undefined;
   keys.text = "";
   song_content = "";
   var _loc2_ = notes.length;
   var _loc1_ = 0;
   while(_loc1_ < _loc2_)
   {
      notes.pop();
      _loc1_ = _loc1_ + 1;
   }
};
ButtonPlay.onPress = function()
{
   if(running == false)
   {
      start_time = int(notes[i].start);
      running = true;
      var i = 0;
      while(i < notes.length)
      {
         setTimeout(container_piano,"PlaySound",int(notes[i].start) - start_time,notes[i].pitch);
         up = notes[i].duration != undefined ? notes[i].duration : 100;
         setTimeout(container_piano,"gotoAndStop",int(notes[i].start) + up - start_time,2);
         i++;
      }
      setTimeout(stop_running,notes[notes.length - 1].start - start_time + 500);
   }
   start_time = getTimer();
};
search1.onPress = function()
{
   save("_blank");
};
search2.onPress = function()
{
   save("_parent");
};
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
stop();
