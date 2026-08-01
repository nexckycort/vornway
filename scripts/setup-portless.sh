#!/usr/bin/env bash

set -e

# Stopping first makes this safe to run when the proxy is already active.
portless proxy stop || true
portless proxy start --https --tld dev.vornway.com
portless hosts sync
