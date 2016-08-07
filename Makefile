all: metric-cooking.xpi

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

metric-cooking.xpi: $(ICONS) manifest.json background.js metric-cooking.js
	rm -f $@
	zip -9 $@ $^
