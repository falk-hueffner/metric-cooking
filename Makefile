all: metric-cooking-firefox.xpi metric-cooking-chrome.zip

clean:
	rm -f manifest.json metric-cooking-firefox.xpi metric-cooking-chrome.zip

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

metric-cooking-firefox.xpi: $(ICONS) manifest.json.m4 $(JS)
	rm -f metric-cooking-firefox.xpi
	m4 -DFIREFOX < manifest.json.m4 > manifest.json
	zip -9 metric-cooking-firefox.xpi $(ICONS) manifest.json $(JS)

metric-cooking-chrome.zip: $(ICONS) manifest.json.m4 $(JS)
	rm -f metric-cooking-chrome.zip
	m4 -DCHROME < manifest.json.m4 > manifest.json
	zip -9 metric-cooking-chrome.zip $(ICONS) manifest.json $(JS)
