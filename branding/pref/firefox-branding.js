// OnyxThorn-specific default preferences (replaces browser/branding/.../pref/firefox-branding.js)
//
// Anything user-visible that differs from upstream Firefox lives here, so the
// patch series stays small. Anything that requires changing C++/Rust code
// lives in patches/.

// Branding URLs
pref("startup.homepage_override_url", "https://onyxthorn.example/whatsnew");
pref("startup.homepage_welcome_url",  "chrome://onyxthorn/content/welcome/welcome.html");
pref("startup.homepage_welcome_url.additional", "");
pref("app.releaseNotesURL",           "https://onyxthorn.example/releasenotes/%VERSION%/");
pref("app.update.url.details",        "https://onyxthorn.example/update/");
pref("app.update.url.manual",         "https://onyxthorn.example/download/");
pref("app.feedback.baseURL",          "https://onyxthorn.example/feedback/");

// Home / new-tab
pref("browser.startup.homepage",      "chrome://onyxthorn/content/home/home.html");
pref("browser.newtabpage.enabled",    true);
pref("browser.newtab.url",            "chrome://onyxthorn/content/home/home.html");
pref("browser.startup.page",          1);

// Default UI surface
pref("browser.uidensity",             0);
pref("browser.tabs.tabmanager.enabled", true);
pref("browser.compactmode.show",      true);
pref("browser.theme.toolbar-theme",   2);  // 2 = system, but we override accent below

// OnyxThorn accent (user can change in Settings → General)
pref("onyxthorn.theme.accent",        "#8B2BE2");
pref("onyxthorn.theme.mode",          "auto");      // "light" | "dark" | "auto"
pref("onyxthorn.tabs.orientation",    "horizontal"); // "horizontal" | "vertical"
pref("onyxthorn.font.family",         "Times New Roman");
pref("onyxthorn.font.size",           16);
pref("onyxthorn.zoom.default",        1.0);
pref("onyxthorn.ui.language",         "ru");

// Welcome flow
pref("onyxthorn.welcome.completed",   false);
pref("onyxthorn.welcome.last-step",   0);

// Default search → DuckDuckGo
pref("browser.search.region",         "");
pref("browser.search.geoSpecificDefaults", false);
pref("browser.search.suggest.enabled", false);
pref("browser.urlbar.suggest.searches", true);
pref("browser.urlbar.update2.engineAliasRefresh", true);
pref("browser.search.defaultenginename", "DuckDuckGo");

// Download path: c:\onyxthorn\downloads (per request)
pref("browser.download.useDownloadDir", true);
pref("browser.download.folderList",   2);
pref("browser.download.dir",          "C:\\onyxthorn\\downloads");
pref("browser.download.lastDir.savePerSite", false);

// Anonymity-first defaults
pref("datareporting.policy.dataSubmissionEnabled", false);
pref("datareporting.healthreport.uploadEnabled", false);
pref("toolkit.telemetry.enabled",     false);
pref("toolkit.telemetry.unified",     false);
pref("toolkit.telemetry.archive.enabled", false);
pref("toolkit.telemetry.bhrPing.enabled", false);
pref("toolkit.telemetry.firstShutdownPing.enabled", false);
pref("toolkit.telemetry.newProfilePing.enabled", false);
pref("toolkit.telemetry.shutdownPingSender.enabled", false);
pref("toolkit.telemetry.updatePing.enabled", false);
pref("toolkit.telemetry.coverage.opt-out", true);
pref("toolkit.coverage.opt-out",      true);
pref("toolkit.coverage.endpoint.base", "");
pref("app.shield.optoutstudies.enabled", false);
pref("app.normandy.enabled",          false);
pref("app.normandy.api_url",          "");
pref("extensions.pocket.enabled",     false);
pref("browser.newtabpage.activity-stream.feeds.section.topstories", false);
pref("browser.newtabpage.activity-stream.feeds.snippets", false);
pref("browser.newtabpage.activity-stream.feeds.telemetry", false);
pref("browser.newtabpage.activity-stream.telemetry", false);
pref("browser.ping-centre.telemetry", false);
pref("breakpad.reportURL",            "");
pref("browser.tabs.crashReporting.sendReport", false);

pref("privacy.donottrackheader.enabled", true);
pref("privacy.trackingprotection.enabled", true);
pref("privacy.trackingprotection.socialtracking.enabled", true);
pref("privacy.trackingprotection.cryptomining.enabled", true);
pref("privacy.trackingprotection.fingerprinting.enabled", true);
pref("privacy.fingerprintingProtection", true);
pref("privacy.firstparty.isolate",    false);  // off by default — opt-in in privacy panel
pref("privacy.resistFingerprinting",  false);  // off by default — opt-in in privacy panel

pref("network.cookie.cookieBehavior", 5); // dFPI

// Disable Mozilla Account / Firefox Sync entirely — we use our own.
pref("identity.fxaccounts.enabled",   false);
pref("identity.fxaccounts.autoconfig.uri", "");
pref("services.sync.enabled",         false);

// OnyxThorn Sync (your VPS). User-visible base URL in Settings → Sync.
pref("onyxthorn.sync.server",         "https://sync.onyxthorn.example");
pref("onyxthorn.sync.enabled",        false);
pref("onyxthorn.sync.signed-in",      false);
pref("onyxthorn.sync.collections.bookmarks", true);
pref("onyxthorn.sync.collections.history",   true);
pref("onyxthorn.sync.collections.passwords", true);
pref("onyxthorn.sync.collections.settings",  true);
pref("onyxthorn.sync.collections.tabs",      false);

// Disable Mozilla VPN / Mozilla Hello / About-Welcome multistage flows
pref("browser.aboutwelcome.enabled",  false);
pref("browser.startup.homepage_override.mstone", "ignore");

// Default search engines bundled — search.json.mozlz4 is generated at runtime
// from list.json (engines installed below). DuckDuckGo first.
pref("browser.search.order.1",        "DuckDuckGo");
pref("browser.search.order.2",        "Startpage");
pref("browser.search.order.3",        "Brave Search");
pref("browser.search.order.4",        "SearXNG");
pref("browser.search.order.5",        "Google");
pref("browser.search.order.6",        "Bing");
pref("browser.search.order.7",        "Yandex");

// Update endpoint (your release infrastructure)
pref("app.update.url",                "https://onyxthorn.example/update/check/%VERSION%/%CHANNEL%/");
pref("app.update.channel",            "release");
pref("app.update.auto",               false);
pref("app.update.enabled",            true);

// Disable Pocket, Pulse, Hello, screenshots
pref("extensions.pocket.api",         "");
pref("extensions.pocket.oAuthConsumerKey", "");
pref("extensions.screenshots.disabled", true);
