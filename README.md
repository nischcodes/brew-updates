# brew-updates
A small GNOME shell extension to check for outdated brew packages on linux.

Target GNOME version: 45 – 49 (tested on GNOME 49)

## Table of Contents
1. Overview
2. Prerequisites
3. Installation
4. Configuration (Preferences)
5. How It Works
6. Troubleshooting
7. Development & Contribution
8. License

### Overview
The Homebrew Updates extension adds a small panel icon that shows the number of pending Homebrew upgrades on your system. You can either get automaticly check and get a notification or set the extension into the manual mode, where you can start the checkup by clicking on "Check for Update" in the icon menu.

**Features:**

|  Feature  |   Description |
|-----------|---------------|
|Automatic periodic checks (configurable interval)|Set the interval in minutes; the extension polls brew outdated.|
|Manual refresh|“Check for Update” menu entry forces an immediate scan.|
|Visual cue|Icon changes to an Icon to indicate avaliable upates when updates exist, otherwise an idle icon.|
|Notification|Fires a native notification if updates exists.|
|Settings UI|Toggle automatic checking, enables/disables notifications and adjust the interval via the GNOME Extensions preferences dialog.|

### Prerequisites
* GNOME Shell 48 and 49 (the extension uses the modern ES‑module import syntax, which requires GJS ≥ 1.78 – shipped with GNOME 48+).
* Homebrew installed and available in the user’s $PATH (the command brew outdated must succeed).
* GNOME Extensions infrastructure (installed via your distribution’s package manager).

### Installation
1. Download / Clone the repository
```bash
git clone https://github.com/nischcodes/brew-updates.git
cd brew-updates
```
2. Compile the GSettings schema
```bash
glib-compile-schemas schemas/
```
3. Install the extension
Copy the entire directory to the local extensions folder:
```bash
mkdir -p ~/.local/share/gnome-shell/extensions/brew-updates@nischcodes.github.io
cp -r * ~/.local/share/gnome-shell/extensions/brew-updates@nischcodes.github.io/
```
4. Enable the extension
```bash
gnome-extensions enable brew-updates@nischcodes.github.io
```
Or use GNOME Extensions (or Extension Manager) GUI to toggle it on.

5. Restart GNOME Shell (optional)
Press **Alt** + **F2**, type r, and press **Enter** (on Xorg) or log out/in (on Wayland).

### Configuration (Preferences)
Open the preferences dialog:

* **Via GNOME Extensions UI** → find Brew Updates → click the gear icon.
* **Or** run ```gnome-extensions prefs brew-updates@nischcodes.github.io.```

You will see three options:

|  Setting  |   Control |  Effect   | 
|-----------|-----------|-----------|
| **Activate auto update check**|Switch (ON/OFF)|Enables/disables the periodic timer.|
| **Activate notifications for auto update**|Switch (ON/OFF)|Enables/disables the notification.|
| **Interval (minutes)**|Spin button (1 – 1440)|How often the extension runs brew outdated. Default is 60 min.|

Changes take effect immediately; the timer is recreated on each modification.

### How It Works
1. Timer initialization – When the extension starts (or when the “Activate auto update check” setting changes), a GLib.timeout_add_seconds timer is created based on the configured interval.
2. Update check – The timer (or a manual request) runs brew outdated. The JSON output is parsed into an array of objects {name, current_version, latest_version}.
3. UI update –
    * If the array is empty, the panel icon switches to idle icon and the label is cleared.
    * If updates exist, the icon becomes shield with exclamation mark and the label shows the count.
    * If notifications are active the extensions fires a notification.

### Troubleshooting
|  Symptom  |   Likely cause |  Fix   | 
|-----------|----------------|--------|
|No icon appears after enabling the extension|Extension not loaded or schema not compiled|Run ```gnome-extensions list``` to confirm it’s enabled; re‑run ```glib-compile-schemas schemas/```.|
|“Check for Update” does nothing / console shows errors|```brew``` not in PATH for the GNOME shell process|Ensure Homebrew is installed for the same user; add ```export PATH=$HOME/.linuxbrew/bin:$PATH``` to ```~/.profile``` and restart GNOME.|
|Icon stays the same even after upgrades|Cached state not refreshed|Click “Now check” after upgrading, or temporarily disable “Activate auto update check” and re‑enable it.|

Check the GNOME Shell log for detailed messages:
```bash
journalctl /usr/bin/gnome-shell -f
```

### Development & Contribution
1. Clone the repo (see Installation).
2. Watch for changes while developing:
```bash
gnome-extensions enable homebrew-updates@yourdomain
# In another terminal
tail -f ~/.local/share/gnome-shell/extensions/homebrew-updates@yourdomain/*.log
```
3. Submit PRs – please keep the ES‑module import style and update metadata.json if you add support for newer GNOME versions.

### License
GNU GPL Version 2 – feel free to fork, modify, and redistribute. Attribution to the original author (nisch) is appreciated.

--- 

**Enjoy staying up‑to‑date with Homebrew right from your GNOME panel!**