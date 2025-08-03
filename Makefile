all: firefox chrome

clean:
	rm -f manifest.json background.js metric-cooking-chrome.zip metric-cooking-firefox.xpi 

test:
	@./test.js

ICONS = \
	icons/measuring-cup-pressed-19.png  \
	icons/measuring-cup-pressed-38.png  \
	icons/measuring-cup-pressed-48.png  \
	icons/measuring-cup-pressed-128.png \
	icons/measuring-cup-19.png	    \
	icons/measuring-cup-38.png

JS = \
	metric-cooking.js

firefox: $(ICONS) manifest.json.firefox background.js.firefox $(JS)
	rm -f metric-cooking-firefox.xpi
	cp manifest.json.firefox manifest.json
	cp background.js.firefox background.js
	zip -9 metric-cooking-firefox.xpi $(ICONS) manifest.json background.js $(JS)

chrome: $(ICONS) manifest.json.chrome background.js.chrome $(JS)
	rm -f metric-cooking-chrome.zip
	cp manifest.json.chrome manifest.json
	cp background.js.chrome background.js
	zip -9 metric-cooking-chrome.zip $(ICONS) manifest.json background.js $(JS)
