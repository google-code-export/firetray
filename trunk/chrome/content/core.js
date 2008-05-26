var gfiretrayBundle = Components.classes["@mozilla.org/intl/stringbundle;1"].getService(Components.interfaces.nsIStringBundleService);

var mystrings = gfiretrayBundle.createBundle("chrome://firetray/locale/core.properties");
var firetray_closerequest = mystrings.GetStringFromName("firetray_closerequest");
var firetray_exitrequest = mystrings.GetStringFromName("firetray_exitrequest");
var firetray_restoreall = mystrings.GetStringFromName("firetray_restoreall");
var firetray_exit = mystrings.GetStringFromName("firetray_exit");
var firetray_windowslist = mystrings.GetStringFromName("firetray_windowslist");
var firetray_no_unread_messages = mystrings.GetStringFromName("firetray_no_unread_messages");
var firetray_unread_message = mystrings.GetStringFromName("firetray_unread_message");
var firetray_unread_messages = mystrings.GetStringFromName("firetray_unread_messages");
var firetray_check_mail = mystrings.GetStringFromName("firetray_check_mail");
var firetray_new_mail = mystrings.GetStringFromName("firetray_new_mail");

var minimizeComponent = Components.classes['@mozilla.org/Minimize;1'].getService(Components.interfaces.nsIMinimize);
var pPS=null;

var FireTray = new Object();

var myPrefObserver =
{
  register: function()
  {
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefService);
    this._branch = prefService.getBranch("extensions.firetray.");
    this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
    this._branch.addObserver("", this, false);
  },

  unregister: function()
  {
    if(!this._branch) return;
    this._branch.removeObserver("", this);
  },

  observe: function(aSubject, aTopic, aData)
  {
    if(aTopic != "nsPref:changed") return;
    FireTray.UpdatePreferences();
  }
}

FireTray.interface = Components.classes["@mozilla.org/FireTray;1"].getService(Components.interfaces.nsITray);

FireTray.app_started=false;

FireTray.trayCallback = function() {
    var baseWindows = FireTray.getAllWindows();
    var vis=FireTray.isVisible () ;
    if ( !vis || (baseWindows.length == FireTray.interface.menu_length(minimizeComponent.menu_window_list))) {
    /*    if(FireTray.isMail){

           if(FireTray.prefManager.getBoolPref("extensions.firetray.restore_to_next_unread"))
              MsgNextUnreadMessage();
        } //nextUnreadMessage*/
        
        FireTray.interface.restore(baseWindows.length, baseWindows);
        FireTray.interface.menu_remove_all(minimizeComponent.menu_window_list);
    } else {
        FireTray.interface.menu_remove_all(minimizeComponent.menu_window_list);
        FireTray.hide_to_tray();
    }
};

FireTray.exitCallback = function() {
    try {
	var appStartup = Components.classes['@mozilla.org/toolkit/app-startup;1'].getService(Components.interfaces.nsIAppStartup);
        var do_confirm=true;
        do_confirm=FireTray.prefManager.getBoolPref("extensions.firetray.confirm_exit");
        if (!do_confirm || confirm(firetray_exitrequest)) {
          appStartup.quit(Components.interfaces.nsIAppStartup.eAttemptQuit);
        }
    } catch (err) {
        alert(err);
        return;
    }
   
};

FireTray.restoreCallback = function() {
    var baseWindows = FireTray.getAllWindows();
    FireTray.interface.restore(baseWindows.length, baseWindows);
    FireTray.interface.menu_remove_all(minimizeComponent.menu_window_list);
};

FireTray.UpdatePreferences=function(){
    
    //set windows close command blocking 
    FireTray.interface.set_close_blocking(FireTray.prefManager.getBoolPref("extensions.firetray.close_to_tray"));

    FireTray.UpdateMailTray();

}

/*
FireTray.observe=function(subject,topic,data){
     alert("observe!");
     if (topic != "nsPref:changed")
     {
       return;
     }
     
/*     switch(data)
     {
       case "symbol":
         this.tickerSymbol = this.prefs.getCharPref("symbol").toUpperCase();
         this.refreshInformation();
         break;
     }*/


FireTray.getBaseWindow = function(win) {
    var rv;
    try {
        var requestor = win.QueryInterface(Components.interfaces.nsIInterfaceRequestor);
        var nav = requestor.getInterface(Components.interfaces.nsIWebNavigation);
        var dsti = nav.QueryInterface(Components.interfaces.nsIDocShellTreeItem);
        var owner = dsti.treeOwner;
        requestor = owner.QueryInterface(Components.interfaces.nsIInterfaceRequestor);
        rv = requestor.getInterface(Components.interfaces.nsIXULWindow);
        rv = rv.docShell;
        rv = rv.QueryInterface(Components.interfaces.nsIDocShell);
        rv = rv.QueryInterface(Components.interfaces.nsIBaseWindow);
    } catch (ex) {
        rv = null;
        setTimeout(function() {throw ex; }, 0);
        /* ignore no-interface exception */
    }
    return rv;    
};

FireTray.getAllWindows = function() {
    try {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    } catch (err) {
        alert(err);
        return;
    }

    var baseWindows = new Array();
    var e = wm.getEnumerator(null);
    var windows = [];
    while (e.hasMoreElements()) {
        var w = e.getNext();
        baseWindows[baseWindows.length] = FireTray.getBaseWindow(w);
    } 

    return baseWindows;
};

FireTray.windows_list_add = function(basewindow) {
    var aWindow = FireTray.interface.menu_item_new(basewindow.title);
    FireTray.interface.menu_append(minimizeComponent.menu_window_list, aWindow, function() {
                FireTray.interface.restoreWindow(basewindow);
                FireTray.interface.menu_remove(minimizeComponent.menu_window_list, aWindow);
            });
};

FireTray.hide_window = function() {
    var basewindow = FireTray.getBaseWindow(window);
    FireTray.interface.hideWindow(basewindow);

    FireTray.windows_list_add(basewindow);
};

FireTray.hide_to_tray = function() {
    FireTray.interface.menu_remove_all(minimizeComponent.menu_window_list);

    var baseWindows = FireTray.getAllWindows();

    for(var i=0; i<baseWindows.length; i++) {
        var basewindow = baseWindows[i];
        FireTray.interface.hideWindow(basewindow);
        FireTray.windows_list_add(basewindow);
    }
};


FireTray.on_close = function() {
   // if the window menubar is not visible (ex.popup windows) don't close to tray
   if(window.menubar.visible && FireTray.prefManager.getBoolPref("extensions.firetray.close_to_tray")) {
      FireTray.hide_to_tray();
      return false;	
   }
   
}

FireTray.on_resize = function() {
   if(!FireTray.app_started){
	Firetray.app_started=true;	
	if(FireTray.prefManager.getBoolPref("extensions.firetray.start_minimized")){	
		FireTray.hide_to_tray();		
	}
   }
}

FireTray.getMozillaAppCode = function() {

  /* RETURN VALUE
   0 - Unknown (defaults to firefox)
   1 - Firefox
   2 - Thunderbird
   3 - Swiftdove
   4 - Swiftweasel
   5 - Icedove
   6 - iceweasel 
   7 - icecat
   8 - songbird
   9 - sunbird
  */

 try {
  var appInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);

  const FIREFOX_ID = "{ec8030f7-c20a-464f-9b0e-13a3a9e97384}";
  const THUNDERBIRD_ID = "{3550f703-e582-4d05-9a08-453d09bdfdc6}";
  const SONGBIRD_ID = "songbird@songbirdnest.com";
  const SUNBIRD_ID = "{718e30fb-e89b-41dd-9da7-e25a45638b28}";
  
  var appname=appInfo.name.toLowerCase()

  switch(appInfo.ID) {
     case FIREFOX_ID:
        FireTray.isBrowser=true; 
        if(appname=="swiftweasel") return 4; 
        if(appname=="iceweasel") return 6; 
        if(appname=="icecat") return 7; 
        return 1;  //Firefox
        break;

     case THUNDERBIRD_ID:
        FireTray.isMail=true; 
        if(appname=="swiftdove") return 3; 
        if(appname=="icedove") return 5; 
        return 2;  //Thunderbird
        break;
     case SONGBIRD_ID:
        FireTray.isSong=true;
        FireTray.interface.init_notification(SONGBIRD_ID);
        return 8; //songbird
        break;

     case SUNBIRD_ID:
        return 9; //sunbird
        break;

     default:
        return 0;
        break;
  }

 }
 catch (err) {
        alert(err);
        return -1;
    }
}


FireTray.UpdateMailTray = function () {

  if(FireTray.prefManager.getBoolPref("extensions.firetray.show_num_unread"))
    var res=FireTray.localfolders.getNumUnread(true); //gets the number of all unread mails
  else res=0;

  if(FireTray.lastnum==res) return; //update the icon only if something has changed
  FireTray.lastnum=res;
  var tooltip="";
  var num=""+res;
  if(res==0) { num=""; tooltip=firetray_no_unread_messages; }
  else if(res==1)  tooltip=res + " " + firetray_unread_message; 
       else tooltip = res + " " + firetray_unread_messages;

  FireTray.interface.set_icon_text(num);
  FireTray.interface.set_tray_tooltip(tooltip);
}


FireTray.subscribe_to_mail_events = function()
{

  var mailSession = Components.classes["@mozilla.org/messenger/services/session;1"].
  getService(Components.interfaces.nsIMsgMailSession);
 
  var folderListener = {
  OnItemAdded: function(parent, item) {},
  OnItemBoolPropertyChanged: function(item, property, oldValue, newValue) {},
  OnItemEvent: function(item, event)  {},
  OnItemIntPropertyChanged: function(item, property, oldValue, newValue) { FireTray.UpdateMailTray(); },
  OnItemPropertyChanged: function(parent, item, viewString) {},
  OnItemPropertyFlagChanged: function(item, property, oldFlag, newFlag) {},
  OnItemRemoved: function(parent, item) {},
  OnItemUnicharPropertyChanged: function(item, property, oldValue, newValue) {},
}
 
  var nFlags = Components.interfaces.nsIFolderListener.added | Components.interfaces.nsIFolderListener.intPropertyChanged; mailSession.AddFolderListener(folderListener,nFlags);
}

FireTray.check_mail = function() {
  MsgGetMessagesForAllAuthenticatedAccounts();    
}

FireTray.new_mail = function() {
  goOpenNewMessage();  
}

FireTray.playASong = function () {
	if(pPS != null){
			if(pPS.paused || !pPS.playing){
				pPS.play();
				FireTray.interface.set_tray_icon(1);
			}
	}
}
FireTray.pauseASong = function () {
	if(pPS != null && !pPS.paused){
		pPS.pause();
	}
}
FireTray.stopASong = function () {
	if(pPS != null && pPS.playing){
			pPS.stop();
			pPS.pause(); /* For now... because there is a bug into songbird API*/
	}
}

FireTray.get_app_icon = function() {
    var basewindow = FireTray.getBaseWindow(window);
    FireTray.interface.get_default_from_app(basewindow);
}

/*FireTray.raise()
{

}*/

FireTray.isVisible = function() {
    var baseWindows = FireTray.getAllWindows();
    var cnt=0;
    var res=false;

    for(var i=0; i<baseWindows.length; i++) {
        var basewindow = baseWindows[i];
          res=false;
          res=FireTray.interface.get_focus_state(basewindow);
          if(res) cnt++;
        //basewindow.addEventListener("close", FireTray.on_close2, false);
        //FireTray.interface.hideWindow(basewindow);
        //FireTray.windows_list_add(basewindow);
    }
    if(cnt>0) return true;
    return false;
}


FireTray.set_close_handler = function() {
    
    var baseWindows = FireTray.getAllWindows();

    for(var i=0; i<baseWindows.length; i++) {
        var basewindow = baseWindows[i];
          FireTray.interface.set_window_handler(basewindow);
        //basewindow.addEventListener("close", FireTray.on_close2, false);
        //FireTray.interface.hideWindow(basewindow);
        //FireTray.windows_list_add(basewindow);
    }
};


FireTray.init = function() {
    FireTray.isMail=false;
    FireTray.isSong=false;
    FireTray.lastnum=-1;

    //window.onunload = FireTray.on_unload
    //window.onclose = FireTray.on_close
    window.onresize = FireTray.on_resize

    //register an observer for getting prefs changes 
    FireTray.prefManager = Components.classes["@mozilla.org/preferences-service;1"]
                                .getService(Components.interfaces.nsIPrefBranch);
    myPrefObserver.register();

    var accountManager;
    var app=FireTray.getMozillaAppCode();

    if (!minimizeComponent.menu_window_list) {
        FireTray.interface.trayActivateEvent(FireTray.trayCallback);
	
        // Init basic pop-up menu items.
        var tray_menu = FireTray.interface.get_tray_menu();
        if (tray_menu) {
            var item_s_one = FireTray.interface.separator_menu_item_new();
            FireTray.interface.menu_append(tray_menu, item_s_one, null);
            var item_restore = FireTray.interface.menu_item_new(firetray_restoreall);
            FireTray.interface.menu_append(tray_menu, item_restore, FireTray.restoreCallback);
            var item_s_two = FireTray.interface.separator_menu_item_new();
            FireTray.interface.menu_append(tray_menu, item_s_two, null);
 
            if(FireTray.isMail) { 
		//thunderbird special menu entries
                var mail_check = FireTray.interface.menu_item_new(firetray_check_mail);
                FireTray.interface.menu_append(tray_menu, mail_check, FireTray.check_mail);

                var new_mail = FireTray.interface.menu_item_new(firetray_new_mail);
                FireTray.interface.menu_append(tray_menu, new_mail, FireTray.new_mail);

/*                var getapp = FireTray.interface.menu_item_new("GET APP ICON");
                FireTray.interface.menu_append(tray_menu, getapp, FireTray.get_app_icon);*/

                var mail_end_separator = FireTray.interface.separator_menu_item_new();
                FireTray.interface.menu_append(tray_menu, mail_end_separator, null);
	    }

            if(FireTray.isBrowser) { 
		//thunderbird special menu entries
              /*  var newwin = FireTray.interface.menu_item_new("Open new window");
                FireTray.interface.menu_append(tray_menu, newwin, FireTray.new_window);

                var newtab = FireTray.interface.menu_item_new("Open new tab");
                FireTray.interface.menu_append(tray_menu, newtab, FireTray.new_tab);

                var closewins = FireTray.interface.menu_item_new("Close windows");
                FireTray.interface.menu_append(tray_menu, closewins, FireTray.close_windows);

                var mail_end_separator = FireTray.interface.separator_menu_item_new();
                FireTray.interface.menu_append(tray_menu, mail_end_separator, null);*/
		
            }
            var item_exit = FireTray.interface.menu_item_new(firetray_exit);
            FireTray.interface.menu_append(tray_menu, item_exit, FireTray.exitCallback);
            var item_s_three = FireTray.interface.separator_menu_item_new();
            FireTray.interface.menu_insert(tray_menu, item_s_three, 0, null);
            var item_windows_list = FireTray.interface.menu_item_new(firetray_windowslist);
            FireTray.interface.menu_insert(tray_menu, item_windows_list, 1, null);
            minimizeComponent.menu_window_list = FireTray.interface.menu_new();
            FireTray.interface.menu_sub(item_windows_list, minimizeComponent.menu_window_list);
        }
    }


    FireTray.interface.set_default_xpm_icon(app);
    FireTray.interface.showTray();

    //window.addEventListener("close", FireTray.on_close2, true);

    if(FireTray.isMail) {

      accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
      FireTray.localfolders = accountManager.localFoldersServer.rootFolder;
      FireTray.subscribe_to_mail_events();
      FireTray.UpdateMailTray();
    }

    
	if(FireTray.isSong){

		pPS = Components.classes["@songbirdnest.com/Songbird/PlaylistPlayback;1"]
                    	.getService(Components.interfaces.sbIPlaylistPlayback);
		/* Song controls */

		var music_list = FireTray.interface.menu_new();
		
		var item_play = FireTray.interface.menu_item_new("Play");
		FireTray.interface.menu_append(music_list, item_play, FireTray.playASong);
		
		var item_s_four = FireTray.interface.separator_menu_item_new();
		FireTray.interface.menu_append(tray_menu, item_s_four, null);
		var item_pause = FireTray.interface.menu_item_new("Pause");
		FireTray.interface.menu_append(music_list, item_pause, FireTray.pauseASong);
		
		var item_s_five = FireTray.interface.separator_menu_item_new();
		FireTray.interface.menu_append(tray_menu, item_s_five, null);
		var item_stop = FireTray.interface.menu_item_new("Stop");
		FireTray.interface.menu_append(music_list, item_stop, FireTray.stopASong);
		
		tray_menu = FireTray.interface.get_tray_menu();
		
		var item_s_six = FireTray.interface.separator_menu_item_new();
		FireTray.interface.menu_insert(tray_menu, item_s_six, 0, null);
		var item_music_ctrl = FireTray.interface.menu_item_new("Music");
		FireTray.interface.menu_sub(item_music_ctrl, music_list);
		FireTray.interface.menu_insert(tray_menu, item_music_ctrl, 1, null);
		
		
		var myPlaylistPlaybackServiceListener = {
 			init: function() {
   				pPS.addListener(this);
 			},
 			onTrackChange: function(aMediaItem, aMediaView, aIndex) {
             	var artist=SBDataGetStringValue("metadata.artist");
   				var title=SBDataGetStringValue("metadata.title");
   				var album=SBDataGetStringValue("metadata.album");
   			    var showSong=FireTray.prefManager.getBoolPref("extensions.firetray.show_notification");
   				
   				/*Check on null or empty infos and length*/
   				if(artist =="" |artist == null)
   					artist ="Unknown";
   				if(title =="" |title == null)
   					title ="Unknown";
   				if(album =="" | album == null)
   					album ="Unknown";
   				
   				if(artist.length > 30){
   					artist = artist.substring(0,30);	
   				}
   				if(title.length > 30){
   					title = title.substring(0,30);	
   				}
   				if(album.length > 30){
   					album = album.substring(0,30);	
   				}
   				
   				FireTray.interface.set_tray_tooltip("Artist:"+artist+"\nTitle:"+title+"\nAlbum:"+album);
   				FireTray.interface.set_tray_icon(1);
   				if(showSong)
   					FireTray.interface.show_a_notification(artist,"Title:"+title+"\nAlbum:"+album,null);
 			},
 			onStop: function() {
 				FireTray.interface.set_tray_icon(0);
 			}
		};
		myPlaylistPlaybackServiceListener.init();
	}


    window.setTimeout(function() {
                window.removeEventListener("load", FireTray.init, true);
                window.onclose = FireTray.on_close
            }, 0);

    FireTray.UpdatePreferences();
    if(!FireTray.isBrowser)FireTray.set_close_handler();
   // FireTray.hide_to_tray();
};

window.addEventListener("load", FireTray.init, true);
//window.addEventListener("close", FireTray.on_close2, false);
//window.onclose = FireTray.on_close2;
