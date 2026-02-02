#!/bin/bash
/data/data/com.termux/files/usr/bin/pnpm dev --host > server.log 2>&1 &
echo $! > server.pid
sleep 3
cat server.log
