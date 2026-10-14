function container_fn(container, swf_file, pos_x, pos_y, wid, hgt)
{
   _root.createEmptyMovieClip(container,_root.getNextHighestDepth());
   tlistener = new Object();
   tlistener.onLoadInit = function(target_mc)
   {
      target_mc._x = pos_x;
      target_mc._y = pos_y;
   };
   image_mcl = new MovieClipLoader();
   image_mcl.addListener(tlistener);
   image_mcl.loadClip(swf_file,container);
}
container_fn("container_piano","3Dpiano.swf",0,0);
_root.attachMovie("dialog_box","dialog_mc",_root.getNextHighestDepth());
dialog_mc._x = 150;
dialog_mc._y = 150;
dialog_mc._visible = false;
_focusrect = false;
var focusListener = new Object();
focusListener.onSetFocus = function(oldFocus, newFocus)
{
   if(oldFocus != undefined && oldFocus instanceof TextField)
   {
      container_piano.text_blur();
   }
   if(newFocus instanceof TextField)
   {
      container_piano.text_focus();
   }
};
Selection.addListener(focusListener);
instrument_option.onSetFocus = function()
{
   Selection.setFocus(null);
};
