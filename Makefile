all: zip

clean:
	rm -f metric-cooking.zip

test:
	@./test.js

FILES = \
	background.js		            \
	icons/measuring-cup-19.png	    \
	icons/measuring-cup-38.png	    \
	icons/measuring-cup-pressed-128.png \
	icons/measuring-cup-pressed-19.png  \
	icons/measuring-cup-pressed-38.png  \
	icons/measuring-cup-pressed-48.png  \
	manifest.json		            \
	metric-cooking.js

zip: $(FILES)
	rm -f metric-cooking.zip
	zip -9 metric-cooking.zip $(FILES)
