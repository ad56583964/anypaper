all: start

start:
	yarn run dev -- --host 0.0.0.0

.PHONY: start