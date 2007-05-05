#include "nsTray.h"
#include "pixmaps/tray.xpm"

#include "nsMemory.h"
#include "nsIBaseWindow.h"

static GtkStatusIcon *systray_icon = NULL;
static GdkPixbuf *icon = NULL;
static GtkWidget *pop_menu = NULL;

static void activate(GtkStatusIcon* status_icon, gpointer user_data) {
    PRBool ret = TRUE;
    ((nsTray*)user_data)->tray_callback->Call(&ret);
}

static void popup(GtkStatusIcon *status_icon, guint button, guint activate_time, gpointer user_data) {
    if (pop_menu) {
        gtk_widget_show_all(pop_menu);
        gtk_menu_popup(GTK_MENU(pop_menu), NULL, NULL, gtk_status_icon_position_menu, systray_icon, button, activate_time);
    }
}

static void item_event(GtkWidget *widget, gpointer user_data) {
    PRBool ret = TRUE;
    if(((nsTray*)user_data)->item_callback_list[(PRUint32)widget]) {
        ((nsTray*)user_data)->item_callback_list[(PRUint32)widget]->Call(&ret);
    }
}

/* Implementation file */
NS_IMPL_ISUPPORTS1(nsTray, nsITray)

nsTray::nsTray() {
    /* member initializers and constructor code */
    this->windowList = NULL;
    this->windowListCount = 0;
    this->tray_callback = NULL;

    systray_icon = gtk_status_icon_new();
    icon = gdk_pixbuf_new_from_xpm_data((const char**)tray_icon);
    gtk_status_icon_set_from_pixbuf(GTK_STATUS_ICON(systray_icon), GDK_PIXBUF(icon));
    gtk_status_icon_set_tooltip(systray_icon, "Firetray");

    /* Connect signals */
    g_signal_connect(G_OBJECT(systray_icon), "activate", G_CALLBACK(activate), this);
    g_signal_connect(G_OBJECT(systray_icon), "popup-menu", G_CALLBACK(popup), NULL);

    pop_menu = gtk_menu_new();

    gtk_status_icon_set_visible(systray_icon, FALSE);
}

nsTray::~nsTray() {
    /* destructor code */
    if (this->windowList) {
        delete [] this->windowList;
        this->windowList = NULL;
    }
    this->tray_callback = NULL;
}

/* void showTray (); */
NS_IMETHODIMP nsTray::ShowTray() {
    if (systray_icon) {
        gtk_status_icon_set_visible(systray_icon, TRUE);
    }

	return NS_OK;
}

/* void hideTray (); */
NS_IMETHODIMP nsTray::HideTray() {
    gtk_status_icon_set_visible(systray_icon, FALSE);

	return NS_OK;
}

/* void trayActivateEvent (in nsITrayCallback aCallback); */
NS_IMETHODIMP nsTray::TrayActivateEvent(nsITrayCallback *aCallback) {
    this->tray_callback = aCallback;
    return NS_OK;
}

/* void hideWindow (in PRUint32 aCount, [array, size_is (aCount)] in nsIBaseWindow aBaseWindows); */
NS_IMETHODIMP nsTray::HideWindow(PRUint32 aCount, nsIBaseWindow **aBaseWindows) {
    nsresult rv;
    PRUint32 i;

    NS_ENSURE_ARG(aCount);
    NS_ENSURE_ARG_POINTER(aBaseWindows);

    for (i = 0; i < aCount; ++i) {
        nativeWindow aNativeWindow;
        rv = aBaseWindows[i]->GetParentNativeWindow(&aNativeWindow);
        NS_ENSURE_SUCCESS(rv, rv);

        gdk_window_hide(gdk_window_get_toplevel(NS_REINTERPRET_CAST(GdkWindow*, aNativeWindow)));
    }

    return NS_OK;
}

/* void minimize (in PRUint32 aCount, [array, size_is (aCount)] in nsIBaseWindow aBaseWindows); */
NS_IMETHODIMP nsTray::Minimize(PRUint32 aCount, nsIBaseWindow **aBaseWindows) {
    nsresult rv;
    PRUint32 i;

    NS_ENSURE_ARG(aCount);
    NS_ENSURE_ARG_POINTER(aBaseWindows);
    NS_ENSURE_TRUE(0 == this->windowListCount, NS_ERROR_ALREADY_INITIALIZED);

    this->windowList = new GdkWindow*[aCount];
    if (!this->windowList) {
        return NS_ERROR_OUT_OF_MEMORY;
    }
    this->windowListCount = aCount;

    for (i = 0; i < aCount; ++i) {
        nativeWindow aNativeWindow;
        rv = aBaseWindows[i]->GetParentNativeWindow(&aNativeWindow);
        NS_ENSURE_SUCCESS(rv, rv);

        this->windowList[i] = NS_REINTERPRET_CAST(GdkWindow*, aNativeWindow);
        NS_ENSURE_ARG_POINTER(this->windowList[i]);
    }

    // everything worked, now hide the window
    for (i = 0; i < aCount; ++i) {
        gdk_window_hide(gdk_window_get_toplevel(this->windowList[i]));
    }

    return NS_OK;
}

/* void restore (); */
NS_IMETHODIMP nsTray::Restore() {
    for (PRInt32 i = 0; i < this->windowListCount; ++i) {
        gdk_window_show(gdk_window_get_toplevel(this->windowList[i]));
    }

    delete [] this->windowList;
    this->windowList = NULL;
    this->windowListCount = 0;

    return NS_OK;
}

/* void restoreWindow (in PRUint32 aCount, [array, size_is (aCount)] in nsIBaseWindow aBaseWindows); */
NS_IMETHODIMP nsTray::RestoreWindow(PRUint32 aCount, nsIBaseWindow **aBaseWindows) {
    nsresult rv;
    PRUint32 i;

    NS_ENSURE_ARG(aCount);
    NS_ENSURE_ARG_POINTER(aBaseWindows);

    for (i = 0; i < aCount; ++i) {
        nativeWindow aNativeWindow;
        rv = aBaseWindows[i]->GetParentNativeWindow(&aNativeWindow);
        NS_ENSURE_SUCCESS(rv, rv);

        gdk_window_show(gdk_window_get_toplevel(NS_REINTERPRET_CAST(GdkWindow*, aNativeWindow)));
    }

    return NS_OK;
}

/* PRUint32 get_tray_menu (); */
NS_IMETHODIMP nsTray::Get_tray_menu(PRUint32 *_retval) {
    *_retval = (PRUint32)pop_menu;

    return NS_OK;
}

/* PRUint32 menu_new (in string label); */
NS_IMETHODIMP nsTray::Menu_new(PRUint32 *_retval) {
    GtkWidget *menu = gtk_menu_new();
    *_retval = (PRUint32)menu;

    return NS_OK;
}

/* PRUint32 menu_item_new (in string label); */
NS_IMETHODIMP nsTray::Menu_item_new(const char *label, PRUint32 *_retval) {
    GtkWidget *item = gtk_menu_item_new_with_label(label);
    *_retval = (PRUint32)item;

    return NS_OK;
}

/* PRUint32 separator_menu_item_new (); */
NS_IMETHODIMP nsTray::Separator_menu_item_new(PRUint32 *_retval) {
    GtkWidget *item = gtk_separator_menu_item_new();
    *_retval = (PRUint32)item;

    return NS_OK;
}

/* void menu_append (in PRUint32 menu_item); */
NS_IMETHODIMP nsTray::Menu_append(PRUint32 menu, PRUint32 item, nsITrayCallback *aCallback) {
    gtk_menu_shell_append(GTK_MENU_SHELL(menu), GTK_WIDGET(item));
    nsCOMPtr<nsITrayCallback> item_callback = aCallback;
    this->item_callback_list[item] = item_callback;
    g_signal_connect(G_OBJECT(item), "activate", G_CALLBACK(item_event), this);

    return NS_OK;
}

/* void menu_prepend (in PRUint32 item, in nsITrayCallback aCallback); */
NS_IMETHODIMP nsTray::Menu_prepend(PRUint32 menu, PRUint32 item, nsITrayCallback *aCallback) {
    gtk_menu_shell_prepend(GTK_MENU_SHELL(menu), GTK_WIDGET(item));
    nsCOMPtr<nsITrayCallback> item_callback = aCallback;
    this->item_callback_list[item] = item_callback;
    g_signal_connect(G_OBJECT(item), "activate", G_CALLBACK(item_event), this);

    return NS_OK;
}
/* void menu_insert (in PRUint32 menu, in PRUint32 item, in PRUint32 pos, in nsITrayCallback aCallback); */
NS_IMETHODIMP nsTray::Menu_insert(PRUint32 menu, PRUint32 item, PRUint32 pos, nsITrayCallback *aCallback) {
    gtk_menu_shell_insert(GTK_MENU_SHELL(menu), GTK_WIDGET(item), pos);
    nsCOMPtr<nsITrayCallback> item_callback = aCallback;
    this->item_callback_list[item] = item_callback;
    g_signal_connect(G_OBJECT(item), "activate", G_CALLBACK(item_event), this);

    return NS_OK;
}

/* void menu_sub (in PRUint32 item, in PRUint32 sub_menu); */
NS_IMETHODIMP nsTray::Menu_sub(PRUint32 item, PRUint32 sub_menu) {
    gtk_menu_item_set_submenu(GTK_MENU_ITEM(item), GTK_WIDGET(sub_menu));

    return NS_OK;
}

/* void menu_remove (in PRUint32 menu, in PRUint32 item); */
NS_IMETHODIMP nsTray::Menu_remove(PRUint32 menu, PRUint32 item) {
    gtk_container_remove(GTK_CONTAINER(menu), GTK_WIDGET(item));
    this->item_callback_list.erase(item);

    return NS_OK;
}

/* void menu_remove_all (in PRUint32 menu); */
NS_IMETHODIMP nsTray::Menu_remove_all(PRUint32 menu) {
    gtk_container_foreach(GTK_CONTAINER(menu), (GtkCallback)gtk_widget_destroy, NULL);

    return NS_OK;
}
