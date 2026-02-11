.PHONY: tunnel

PORT ?= 5432

tunnel:
	@echo "DB en localhost:$(PORT)  (Ctrl+C para cerrar)"
	ssh -tt -L $(PORT):localhost:5432 root@splitway
