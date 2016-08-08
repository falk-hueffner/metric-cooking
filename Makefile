all: firefox chrome

clean:
	rm -f metric-cooking.xpi

test:
	@./test.js

ICONS = \
	icons/measuring-cup-pressed-19.png  \
	icons/measuring-cup-pressed-38.png  \
	icons/measuring-cup-pressed-48.png  \
	icons/measuring-cup-pressed-128.png \
	icons/measuring-cup-19.png	    \
	icons/measuring-cup-38.png          \

JS = \
	background.js     \
	metric-cooking.js \

firefox: $(ICONS) manifest.json.m4 $(JS)
	rm -f metric-cooking-firefox.xpi
	m4 -DFIREFOX < manifest.json.m4 > manifest.json
	zip -9 metric-cooking-firefox.xpi $(ICONS) manifest.json $(JS)

chrome: $(ICONS) manifest.json.m4 $(JS)
	rm -f metric-cooking-chrome.zip
	m4 -DCHROME < manifest.json.m4 > manifest.json
	zip -9 metric-cooking-chrome.zip $(ICONS) manifest.json $(JS)
