import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import GTop from 'gi://GTop';
import St from 'gi://St';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const INTERVAL_MINUTES = 60;

class Indicator extends PanelMenu.Button {
    static {
        GObject.registerClass(this);
    }

    constructor(settings, refreshCallback, prefsCallback) {
        GTop.glibtop_init();
        super(0.5, _('Brew Updates'), false);
        
        this._refreshCallback = refreshCallback;
        this._prefsCallback = prefsCallback;
        this._settings = settings; 
        
        this._showNotification = this._settings.get_boolean('update-auto-notify');
        
        // connect destroy event
        this.connect('destroy', () => {
            this._refreshCallback = null;
            this._prefsCallback = null;
            this._settings = null;
            this._gioIdleIcon = null;
            this._gioLoadingIcon = null;
            this._gioUpdatesIcon = null;
            this._notificationSource = null;
        });
                
        // build a new panel box to align icon and label
        this._box = new St.BoxLayout({ style_class: 'brew-update-section' });
        
        // load icon from the ext path
        const ext = Extension.lookupByURL(import.meta.url);
        const idleIconFile = ext.dir.resolve_relative_path("icons/pub-symbolic.svg");
        const loadingIconFile = ext.dir.resolve_relative_path("icons/spinner-symbolic.svg");
        const updatesIconFile = ext.dir.resolve_relative_path("icons/shield-warning-symbolic.svg");
        
        // create two gio file instances
        this._gioIdleIcon = new Gio.FileIcon({file: idleIconFile});
        this._gioLoadingIcon = new Gio.FileIcon({file: loadingIconFile});
        this._gioUpdatesIcon = new Gio.FileIcon({file: updatesIconFile});

        // create a new icon with the file loaded from the ext path
        this._icon = new St.Icon({
            style_class: 'brew-update-icon',
            gicon: this._gioIdleIcon,
        });
        
        // create empty label for displaying the number of updates
        this._label = new St.Label({
            text: '',
            style_class: 'brew-update-label',
            y_expand: true,
            y_align: Clutter.ActorAlign.CENTER,
        });
        // add label actor for the label
        this.label_actor = this._label

        // add icon and label to the box
        this._box.add_child(this._icon);
        this._box.add_child(this._label);
        
        // add box to the panel
        this.add_child(this._box);
        
        // build the default Menu
        this.buildDefaultMenu();
    }
    
    getNotificationSource() {
        if(!this._notificationSource) {
            // get a new notification policy
            const notificationPolicy = new MessageTray.NotificationGenericPolicy();
            
            // build the extensions notification source
            this._notificationSource = new MessageTray.Source({
                // The source name (e.g. application name)
                title: _('Brew Updates'),
                // An icon for the notification (defaults to the source's icon)
                icon: this._gioIdleIcon,
                // The notification policy
                policy: notificationPolicy,
            });
            
            // Reset the notification source if it's destroyed
            this._notificationSource.connect('destroy', _source => {
                this._notificationSource = null;
            });
            
            // add notification source to the shell
            Main.messageTray.add(this._notificationSource);
        }
        
        // return notification source
        return this._notificationSource;
    }
    
    buildDefaultMenu() {
        // add action for updates
        this.menu.addAction(_('Check for Update'), this._refreshCallback);
        // add separator between update action and preferences
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        // Add a menu item to open the preferences window
        this.menu.addAction(_('Preferences'), () => this._prefsCallback());
    }
    
    setState(count) {
        // check for updates
        const hasUpdates = Number.isFinite(count) && count > 0;

        // set the icon and the text
        this._icon.gicon = hasUpdates ? this._gioUpdatesIcon : this._gioIdleIcon;
        this._label.text = hasUpdates ? String(count) : '';
        
        // check if there are updates and notify user
        if(hasUpdates && this._showNotification){       
            // build notification
            const notification = new MessageTray.Notification({
                // The source of the notification
                source: this.getNotificationSource(),
                // A title for the notification
                title: _('New brew updates'),
                // The content of the notification
                body: _('There are brew updates avaliable'),
                // An icon for the notification (defaults to the source's icon)
                gicon: this._gioUpdatesIcon,
                // The urgency of the notification
                urgency: MessageTray.Urgency.NORMAL,
            });
            
            // fire notification
            this._notificationSource.addNotification(notification);
        }
    }
    
    setLoadingState() {
        // set the icon and the text
        this._icon.gicon = this._gioLoadingIcon;
        this._label.text = '';
    }
    
    setIdleState() {
        // set the icon and the text
        this._icon.gicon = this._gioIdleIcon;
        this._label.text = '';
    }
    
    toggleShowNotification() {
        this._showNotification = this._settings.get_boolean('update-auto-notify');
    }
}

export default class BrewUpdatesExtension extends Extension {
    enable() {
        // create timout id property
        this._timeoutId = 0;
        
        // local save of the settings object
        this._settings = this.getSettings();
        
        console.log("[BREW UPDATES]");
        console.log(this._settings.get_boolean('update-auto-check'));
        console.log(this._settings.get_boolean('update-auto-notify'));
        console.log(this._settings.get_uint('update-auto-check-interval'));
        console.log("[BREW UPDATES]");
        
        // get the current interval value
        this._interval = this._settings.get_uint('update-auto-check-interval');
        
        // get the current autoUpdate value
        this._autoUpate = this._settings.get_boolean('update-auto-check');
        
        // create indicatior instance
        this._indicator = new Indicator(this.getSettings(), () => this._refresh(), () => this.openPreferences());
        
        // add the indicator to the panel
        Main.panel.addToStatusArea(this.uuid, this._indicator);
        
        // run the refresh function and the schedule function
        if(this._autoUpate) {
            this._refresh();
            this._schedule();
        }
        
        // Watch for changes to a specific setting
        this._settings.connect('changed', (settings, key) => {            
            // check if the key is `update-auto-check` and start the schedule
            if(key == 'update-auto-check') {
                // get the current autoUpdate value
                this._autoUpate = this._settings.get_boolean('update-auto-check');
    
                // check auto update value
                if(this._autoUpate) {
                    // run the refresh function and the schedule function
                    this._refresh();
                    this._schedule();
                } else {
                    // check if the timout object is set, if yes we destroy it
                    if (this._timeoutId) {
                        GLib.Source.remove(this._timeoutId);
                        this._timeoutId = 0;
                    }
                    // set idle state
                    this._indicator.setIdleState();
                }
            }
            
            // check if the key is `update-auto-notify` and update the showNotification value of the indicator
            if(key == 'update-auto-notify') {
                // toggle show notification
                this._indicator.toggleShowNotification();
            }
            
            // check if the key is `update-auto-check-interval` and update the interval
            if(key == 'update-auto-check-interval') {
                // get the new value
                this._interval = this._settings.get_uint('update-auto-check-interval');
                
                console.log(this._interval);
                
                // restart the schedule
                this._schedule();
            }
        });
    }
    
    disable() {
        // destroy timeout object
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = 0;
        }
        // destroy indicator instance
        this._indicator?.destroy();
        this._indicator = null;
    }
  
    _schedule() {
        // log that the auto scheduler is started
        console.log("[BREW UPDATES]: Auto update scheduler started");
    
        // check if the timout object is set, if yes we destroy it
        if (this._timeoutId) {
            GLib.Source.remove(this._timeoutId);
            this._timeoutId = 0;
        }

        // start a timeout and save it locally
        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            INTERVAL_MINUTES * this._interval,
            () => {
                // run refresh
                this._refresh();
                // notify the timeout can continue
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    async _refresh() {
        // log that the auto update has started
        console.log("[BREW UPDATES]: Auto Update started");
        
        // set loading state
        this._indicator.setLoadingState();
        // run bash programm to determine the update count and set the update count
        try {
            const { stdout, status } = await this._spawnCapture(['bash', '-lc', 'brew outdated']);
            
            // check if status is not zero, therefore the result is no update
            if(status !== 0) {
                // set idle state
                this._indicator.setIdleState();
                // return early
                return;
            }

            // extract the number of packages for update
            const lines = (stdout || '')
                .split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 0);
            
            // send the number of upates to the indicator
            this._indicator.setState(lines.length);
            
        } catch (e) {
            console.error(e);
            // set idle state
            this._indicator.setIdleState();
        }
    }
    
    _spawnCapture(argv) {
        // Return promise with a subprocess
        return new Promise((resolve, reject) => {
            try {
                // create the subprocess via GIO lib
                const proc = Gio.Subprocess.new(argv,Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE);

                // try to run the given command
                proc.communicate_utf8_async(null, null, (p, res) => {
                    try {
                        // waiting for response
                        const [, stdout, stderr] = p.communicate_utf8_finish(res);
                        // go back to the code, where the promise is waiting for the return
                        resolve({ stdout, stderr, status: p.get_exit_status() });
                    } catch (err) {
                        reject(err);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }
}
