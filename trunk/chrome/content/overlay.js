var minimizeComponent = Components.classes['@mozilla.org/Minimize;1'].getService(Components.interfaces.nsIMinimize);

var FireTray = new Object();

FireTray.interface = Components.classes["@mozilla.org/FireTray;1"].getService(Components.interfaces.nsITray);

FireTray.trayCallback = function() {
    if (minimizeComponent.all_hidden) {
        FireTray.interface.restore();
        if (minimizeComponent.menu_window_list) {
            FireTray.interface.menu_remove_all(minimizeComponent.menu_window_list);
        }
        minimizeComponent.all_hidden = false;

        var _status_icon = document.getElementById("menu_statusIcon");
        if (_status_icon && !_status_icon.getAttribute("checked")) {
            FireTray.interface.hideTray();
        }
    } else {
        FireTray.hide_to_tray();
    }
};

FireTray.exitCallback = function() {
    try {
        var wm = Components.classes["@mozilla.org/appshell/closeallwindows;1"].getService(Components.interfaces.nsICloseAllWindows);
    } catch (err) {
        alert(err);
        return;
    }

    if (confirm("Do you want close all windows?")) {
        wm.closeAll(true);
    }
};

FireTray.restoreCallback = function() {
    if (minimizeComponent.all_hidden) {
        FireTray.interface.restore();
        if (minimizeComponent.menu_window_list) {
            FireTray.interface.menu_remove_all(minimizeComponent.menu_window_list);
        }
        minimizeComponent.all_hidden = false;
    }
};

FireTray.init = function() {
    FireTray.interface.trayActivateEvent(FireTray.trayCallback);

    // Init basic pop-up menu items.
    var tray_menu = FireTray.interface.get_tray_menu();
    if (tray_menu) {
        var item_s_one = FireTray.interface.separator_menu_item_new();
        FireTray.interface.menu_append(tray_menu, item_s_one, null);
        var item_restore = FireTray.interface.menu_item_new("Restore");
        FireTray.interface.menu_append(tray_menu, item_restore, FireTray.restoreCallback);
        var item_s_two = FireTray.interface.separator_menu_item_new();
        FireTray.interface.menu_append(tray_menu, item_s_two, null);
        var item_exit = FireTray.interface.menu_item_new("Exit");
        FireTray.interface.menu_append(tray_menu, item_exit, FireTray.exitCallback);
        var item_s_three = FireTray.interface.separator_menu_item_new();
        FireTray.interface.menu_insert(tray_menu, item_s_three, 0, null);
        var item_windows_list = FireTray.interface.menu_item_new("Windows List");
        FireTray.interface.menu_insert(tray_menu, item_windows_list, 1, null);
        minimizeComponent.menu_window_list = FireTray.interface.menu_new();
        FireTray.interface.menu_sub(item_windows_list, minimizeComponent.menu_window_list);
    }
};

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

FireTray.hide_window = function() {
    if (!minimizeComponent.menu_window_list) {
        FireTray.init();
    }

    var basewindow = FireTray.getBaseWindow(window);
    FireTray.interface.hideWindow(basewindow);

    var _status_icon = document.getElementById("menu_statusIcon");
    if (_status_icon && !_status_icon.getAttribute("checked")) {
        FireTray.interface.showTray();
    }

    var aWindow = FireTray.interface.menu_item_new(FireTray.getBaseWindow(window).title);
    FireTray.interface.menu_append(minimizeComponent.menu_window_list, aWindow, function() {
                FireTray.interface.restoreWindow(basewindow);
                FireTray.interface.menu_remove(minimizeComponent.menu_window_list, aWindow);

                var _status_icon = document.getElementById("menu_statusIcon");
                if (_status_icon && !_status_icon.getAttribute("checked")) {
                    FireTray.interface.hideTray();
                }
            });
};

FireTray.status_icon = function(check_box) {
    if (!minimizeComponent.menu_window_list) {
        FireTray.init();
    }

    if (check_box.getAttribute("checked")) {
        FireTray.interface.showTray();
    } else {
        FireTray.interface.hideTray();
    }
};

FireTray.hide_to_tray = function() {
    minimizeComponent.all_hidden = true;

    if (!minimizeComponent.menu_window_list) {
        FireTray.init();
    }

    try {
        var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
    } catch (err) {
        alert(err);
        return;
    }

    var _status_icon = document.getElementById("menu_statusIcon");
    if (_status_icon && !_status_icon.getAttribute("checked")) {
        FireTray.interface.showTray();
    }

    var baseWindows = new Array();
    var e = wm.getEnumerator(null);
    var windows = [];
    while (e.hasMoreElements()) {
        var w = e.getNext();
        baseWindows[baseWindows.length] = FireTray.getBaseWindow(w);
    } 
    FireTray.interface.minimize(baseWindows.length, baseWindows);
};
