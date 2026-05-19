/*
 * Browser-side controller for the OnyxThorn panel menu.
 * Loaded by patch 0007-onyxthorn-panelmenu.patch into browser.xhtml.
 */

const OnyxThornPanel = {
  init() {
    const btn = document.getElementById("PanelUI-menu-button") || document.getElementById("PanelUI-button");
    if (btn) {
      btn.addEventListener("command", (e) => {
        const panel = document.getElementById("OnyxThornPanelMenu");
        if (!panel) return;
        e.preventDefault(); e.stopPropagation();
        if (panel.state === "open") { panel.hidePopup(); return; }
        panel.openPopup(btn, "bottomleft topleft");
        this._refreshZoom();
      }, true);
    }
  },

  _refreshZoom() {
    try {
      const tab = window.gBrowser?.selectedBrowser;
      const z = tab ? Math.round(ZoomManager.getZoomForBrowser(tab) * 100) : 100;
      document.getElementById("OT-zoom-value").value = z + "%";
    } catch (e) {}
  },

  zoom(action) {
    const browser = window.gBrowser?.selectedBrowser;
    if (!browser) return;
    let z = ZoomManager.getZoomForBrowser(browser);
    if (action === "+")        z = Math.min(3.0, z + 0.1);
    else if (action === "-")   z = Math.max(0.3, z - 0.1);
    else if (action === "reset") z = 1.0;
    ZoomManager.setZoomForBrowser(browser, z);
    this._refreshZoom();
  },

  cmd(name, event) {
    switch (name) {
      case "newtab":
        BrowserOpenTab();
        break;
      case "newwin":
        OpenBrowserWindow();
        break;
      case "newprivate":
        OpenBrowserWindow({ private: true });
        break;
      case "bookmarks":
        document.getElementById("Browser:ShowAllBookmarks")?.doCommand();
        break;
      case "history":
        document.getElementById("Browser:ShowAllHistory")?.doCommand();
        break;
      case "downloads":
        DownloadsPanel.showPanel();
        break;
      case "passwords":
        gBrowser.ownerGlobal.openTrustedLinkIn("about:logins", "tab");
        break;
      case "settings":
        gBrowser.ownerGlobal.openTrustedLinkIn("about:preferences", "tab");
        break;
      case "exit":
        Services.startup.quit(Ci.nsIAppStartup.eForceQuit);
        break;
    }
    document.getElementById("OnyxThornPanelMenu").hidePopup();
  },
};

window.addEventListener("load", () => OnyxThornPanel.init(), { once: true });
