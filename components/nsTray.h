#ifndef _TRAY_H_
#define _TRAY_H_

#include <map>

#include <gtk/gtk.h>
#include <gdk-pixbuf/gdk-pixbuf.h>
#include <pango/pango.h>
#include <glib-object.h>
#include <gtk/gtksignal.h>
#include <libnotify/notify.h>

#include "nsITray.h"
#include "nsCOMPtr.h"
#include "nsStringAPI.h"

#define NS_ITRAY_CONTRACTID "@mozilla.org/FireTray;1"
#define NS_ITRAY_CLASSNAME "System Tray for Firefox"
#define NS_ITRAY_CID  { 0xbf249f85, 0x20f2, 0x49be, { 0x96, 0xf3, 0x96, 0x81, 0xf3, 0xbb, 0x03, 0x34 } }
#define NS_NOTIFY_TIME 2500

/* Header file */
class nsTray : public nsITray {
public:
    NS_DECL_ISUPPORTS
    NS_DECL_NSITRAY

    nsTray();

    nsCOMPtr<nsITrayCallback> tray_callback;
    std::map <PRUint32, nsCOMPtr<nsITrayCallback> > item_callback_list;
   
    static void activate(GtkStatusIcon*, gpointer);
    static void popup(GtkStatusIcon*, guint, guint, gpointer);
    static void item_event(GtkWidget *, gpointer);
    static void menu_remove_all_callback(GtkWidget *, gpointer);

private:
    ~nsTray();

    bool block_close;

    GtkStatusIcon *systray_icon;
    
    GdkPixbuf *default_icon;
    GdkPixbuf *special_icon;

    GdkPixbuf *icon;

    GtkWidget *pop_menu;
    PangoLayout *layout;

    NotifyNotification *sys_notification;
	
protected:
    /* additional members */
};

#endif //_TRAY_H_
