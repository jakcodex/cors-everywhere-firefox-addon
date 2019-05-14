function saveOptions(e) {

    e.preventDefault();

    // reload prefs
    browser.runtime.getBackgroundPage().then((res) => {

        let prefs = {
            enabledAtStartup: document.querySelector('#enabledAtStartup').checked,
            usageAnalytics: document.querySelector('#usageAnalytics').checked
        };

        res.console.log(prefs);

        browser.storage.sync.set(prefs);

        res.muledump_cors.loadPrefs(function(){
            // refresh options
            restoreOptions();
        });

    });

}

function restoreOptions() {
    browser.runtime.getBackgroundPage().then((bg) => {
        browser.storage.sync.get('enabledAtStartup').then((res) => {
            document.querySelector('#enabledAtStartup').checked = ( typeof res.enabledAtStartup === 'boolean' ) ? res.enabledAtStartup : true;
        });
        browser.storage.sync.get('usageAnalytics').then((res) => {
            document.querySelector('#usageAnalytics').checked = ( typeof res.usageAnalytics === 'boolean' ) ? res.usageAnalytics : true;
        });
        browser.storage.sync.get('defaultUrls').then((res) => {
            document.querySelector('#defaultUrls').value = bg.muledump_cors.defaultUrls.join('\r\n').replace(/(\/\^|\$\/)/g, '');
        });
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);
browser.runtime.getBackgroundPage().then((res) => {
    res.muledump_cors.ga('send', 'pageview');
});
