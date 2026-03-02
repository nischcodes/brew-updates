import Gio from 'gi://Gio';
import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences, gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class BrewUpdatesExtensionPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        // Create a preferences page, with a single group
        const page = new Adw.PreferencesPage({
            title: _('General'),
            icon_name: 'dialog-information-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _('Brew Updates'),
            description: _('Configure the extensions default behavior'),
        });
        page.add(group);

        // Create a new preferences row
        const rowAutoUpdate = new Adw.SwitchRow({
            title: _('Activate auto update check'),
            subtitle: _('Whether to automaticly search for updates'),
        });
        group.add(rowAutoUpdate);

        // Create a new preferences row
        const rowNotifyUpdate = new Adw.SwitchRow({
            title: _('Activate notifications for auto update'),
            subtitle: _('Whether to notify the user for updates'),
        });
        group.add(rowNotifyUpdate);

        // Create a new preferences row
        const rowUpdateInterval = new Adw.SpinRow({
            title: _('Interval'),
            subtitle: _('Time in minutes to check for updates'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 1440,
                step_increment: 1
            }),
            value: this.getSettings().get_uint('update-auto-check-interval'),
        });
        group.add(rowUpdateInterval);
        
        // Create a settings object
        window._settings = this.getSettings();
        // bind the rowAutoUpdate to the `update-auto-check` key
        window._settings.bind('update-auto-check', rowAutoUpdate, 'active', Gio.SettingsBindFlags.DEFAULT);
        // bind the rowNotifyUpdate to the `update-auto-notify` key
        window._settings.bind('update-auto-notify', rowNotifyUpdate, 'active', Gio.SettingsBindFlags.DEFAULT);
        // bind the rowUpdateInterval to the `update-auto-check-interval` key
        window._settings.bind('update-auto-check-interval', rowUpdateInterval, 'value', Gio.SettingsBindFlags.DEFAULT);
    }
}

