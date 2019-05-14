var version = '2.1.2';
var gaID = 'UA-111254659-6';
var debug = false;
var allurls = false;

var muledump_cors = {

    //  config
    enabled: true,
    usageAnalytics: true,
    uaLoad: false,
    cid: Date.now(),
    prefs: {}, // holds user prefs
    transactions: {}, // contains requests/responses
    defaultUrls: [
        "https://realmofthemadgodhrd.appspot.com/*",
        "https://rotmgtesting.appspot.com/*",
        "https://*.realmofthemadgod.com/*"
    ],

    //  initialize
    init: function() {

        console.log('MCA: Initializing');

        browser.storage.sync.get([
            'enabledAtStartup',
            'usageAnalytics',
            'cid'
        ]).then((res) => {

            muledump_cors.enabled = ( typeof res.enabledAtStartup === 'boolean' ) ? res.enabledAtStartup : muledump_cors.enabled;
            muledump_cors.usageAnalytics = (typeof res.usageAnalytics === 'boolean' ) ? res.usageAnalytics : muledump_cors.usageAnalytics;
            muledump_cors.cid = res.cid || muledump_cors.cid;
            browser.storage.sync.set({cid: muledump_cors.cid});

            // toggle activation on button click
            browser.browserAction.onClicked.addListener(function () {
                muledump_cors.toggle();
            });

            // load prefs
            muledump_cors.loadPrefs(function () {

                // enact enabled at startup
                muledump_cors.enabled ? muledump_cors.on() : muledump_cors.off();

            });

            //  usage analytics
            muledump_cors.ga('send', 'event', {
                eventCategory: 'State',
                eventAction: 'loaded'
            });

            muledump_cors.ga('send', 'event', {
                eventCategory: 'Platform',
                eventAction: 'firefox',
                eventLabel: version
            });

        });

        return this;
    },

    //  toggle state
    toggle: function(state) {

        // set state by input
        if(typeof state === 'boolean') {
            muledump_cors.enabled = state;
        }
        // set state by toggle
        else {
            muledump_cors.enabled = !muledump_cors.enabled;
        }

        // add observer
        muledump_cors.enabled ? muledump_cors.on() : muledump_cors.off();

        muledump_cors.ga('send', 'event', {
            eventCategory: 'Active',
            eventLabel: ( muledump_cors.enabled === true ) ? 'true' : 'false'
        });

        return this;
    },

    //  activate extension and enable listener
    on: function() {

        console.log('MCA: Listening for URLs: ', muledump_cors.defaultUrls.join(', '));
        chrome.webRequest.onHeadersReceived.removeListener(muledump_cors.responseListener);
        chrome.webRequest.onHeadersReceived.addListener(muledump_cors.responseListener, {
            urls: (allurls === true) ? ["<all_urls>"] : muledump_cors.defaultUrls
        }, ["blocking", "responseHeaders"]);
        muledump_cors.updateButton(true);

    },

    //  deactivate extension and remove listener
    off: function() {

        console.log('MCA: Disabled');
        chrome.webRequest.onHeadersReceived.removeListener(muledump_cors.responseListener);
        muledump_cors.updateButton(false);

    },

    //  toggle use of <all_urls> for debugging
    toggle_allurls: function(d) {

        if ( typeof d === 'boolean' ) debug = d;
        allurls = !allurls;
        muledump_cors.on();

    },

    //  load preferences
    loadPrefs: function(callback) {

        browser.storage.sync.get([
            'enabledAtStartup',
            'usageAnalytics',
            'cid'
        ]).then((res) => {

            console.log('prefs', res);
            muledump_cors.enabled = ( typeof res.enabledAtStartup === 'boolean' ) ? res.enabledAtStartup : muledump_cors.enabled;
            muledump_cors.usageAnalytics = (typeof res.usageAnalytics === 'boolean' ) ? res.usageAnalytics : muledump_cors.usageAnalytics;
            muledump_cors.cid = res.cid || muledump_cors.cid;
            if (callback) callback();

        });

        return this;

    },

    //  update browser button
    updateButton: function(state) {

        if ( state === undefined ) state = muledump_cors.enabled;
        if ( typeof state !== 'boolean' ) state = muledump_cors.enabled;
        muledump_cors.enabled = state;

        // icon
        var buttonStatus = state ? 'on' : 'off';

        // tooltip text
        var buttonTitle = state
            ? 'Muledump CORS Adapter enabled'
            : 'Muledump CORS Adapter disabled';

        // proceed
        browser.browserAction.setIcon({path:{48:'media/icon-48-'+buttonStatus+'.png'}});
        browser.browserAction.setTitle({title:buttonTitle});

        return this;

    },

    //  handle responses
    responseListener: function(details) {

        var flag = false,
            rule = {
                "name": "Access-Control-Allow-Origin",
                "value": "*"
            };

        //  generate a sanitized url (details.url without the query string)
        var url = details.url.substring(0, details.url.indexOf('?') === -1 ? details.url.length : details.url.indexOf('?'));
        if ( debug === true ) console.log('MCA considering: ', url);

        //  all ajax requests from jakcodex projects include `__source=jakcodex-`
        if ( details.url.match(/(__source=jakcodex-)/) ) {

            if ( debug === true ) console.log('MCA modifying: ' + url);

            //  update the header if it is already present
            for (var i = 0; i < details.responseHeaders.length; ++i) {
                if (details.responseHeaders[i].name.toLowerCase() === rule.name.toLowerCase()) {
                    flag = true;
                    details.responseHeaders[i].value = rule.value;
                    break;
                }
            }

            //  add the header if it wasn't already present
            if (!flag) details.responseHeaders.push(rule);

            //  add an extension header so the request source can see this extension handled the request
            details.responseHeaders.push({"name": "Access-Control-Allow-Methods", "value": "GET, PUT, POST, DELETE, HEAD, OPTIONS"});
            details.responseHeaders.push({"name": "Access-Control-Expose-Headers", "value": "X-Jakcodex-CORS"});
            details.responseHeaders.push({"name": "X-Jakcodex-CORS", "value": version});

            //  send usage analytics for the rewritten request if enabled
            var last = url.substring(url.lastIndexOf('/'));
            if (
                last.indexOf('.') === -1 &&
                last !== '/'
            ) muledump_cors.ga('send', 'event', {
                eventCategory: 'Header Rewrite',
                eventAction: 'muledump',
                eventLabel: url
            });

        }

        return {responseHeaders: details.responseHeaders};

    },

    //  wrapper for google analytics to dump all activity to console
    ga: function() {

        var gaargs = arguments;

        browser.storage.sync.get([
            'enabledAtStartup',
            'usageAnalytics',
            'cid'
        ]).then((res) => {

            //  do not run if analytics is disabled
            if ( res.usageAnalytics === false  ) return;

            var args = ['UA:'];
            for ( var i = 0; i < gaargs.length; i++ ) args.push(gaargs[i]);
            console.log.apply(null, args);
            var request = new XMLHttpRequest();
            var message = "v=1&tid=" + gaID + "&cid=" + (res.cid || muledump_cors.cid) + "&aip=1&ds=firefox-addon";
            if ( gaargs[1] === 'pageview' ) message += "&t=pageview&dp=options.html";
            if ( gaargs[1] === 'event' ) message += "&t=event&ec=" + (gaargs[2].eventCategory || '') + "&ea=" + (gaargs[2].eventAction || '') + "&el=" + (gaargs[2].eventLabel || '');
            request.open("POST", "https://www.google-analytics.com/collect", true);
            request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            request.send(message);

        });

    }

};

muledump_cors.init();
