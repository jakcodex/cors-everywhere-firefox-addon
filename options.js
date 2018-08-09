// prefs object
let defaultWhitelist = [
    '/^https:\/\/realmofthemadgodhrd\.appspot\.com\/.*$/',
    '/^https:\/\/rotmgtesting\.appspot\.com\/.*$/',
    '/^https:\/\/.*?\.realmofthemadgod\.com\/.*$/'
];

function saveOptions(e) {

    let prefs = {
        enabledAtStartup     : document.querySelector('#enabledAtStartup').checked  || true
        ,staticOrigin        : document.querySelector('#staticOrigin').value        || ''
        ,activationWhitelist : defaultWhitelist
    };

    browser.storage.sync.set(prefs);

    // reload prefs
    browser.runtime.getBackgroundPage().then((res) => {
        res.spenibus_corsEverywhere.loadPrefs(function(){
            // refresh options
            restoreOptions();
        });
    });

    e.preventDefault();
}

function restoreOptions() {
    browser.storage.sync.get('enabledAtStartup').then((res) => {
        document.querySelector('#enabledAtStartup').checked = res.enabledAtStartup || true;
    });
    browser.storage.sync.get('activationWhitelist').then((res) => {
        document.querySelector('#activationWhitelist').value = defaultWhitelist.join('\r\n').replace(/(\/\^|\$\/)/g, '');
    });
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('form').addEventListener('submit', saveOptions);