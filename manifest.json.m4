{
    "description": "Annotates US cooking units with their metric equivalent (e.g. 1 3/4 cups sugar [350 g])",
    "manifest_version": 2,
    "name": "Metric Cooking",
    "version": "1.2",
    "homepage_url": "https://github.com/falk-hueffner/metric-cooking",
    "icons": {
        "19": "icons/measuring-cup-pressed-19.png",
        "38": "icons/measuring-cup-pressed-38.png",
        "48": "icons/measuring-cup-pressed-48.png",
        "128": "icons/measuring-cup-pressed-128.png"
    },

ifdef(`FIREFOX',`dnl
    "applications": {
        "gecko": {
            "id": "metric-cooking@hueffner.de",
            "strict_min_version": "45.0"
        }
    },

')dnl
    "permissions": [
        "*://*/*"
    ],

    "background": {
        "scripts": ["background.js"]
    },

    "browser_action": {
        "browser_style": true,
        "default_icon": {
            "19": "icons/measuring-cup-19.png",
            "38": "icons/measuring-cup-38.png"
        },
        "default_title": "Metric cooking units"
    }
}
