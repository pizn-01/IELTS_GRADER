#!/bin/bash
# Double-click on macOS to open the Social Ops menu.
cd "$(dirname "$0")/scripts" || exit 1
echo "Starting Social Ops Agent…"
python3 menu.py
echo
read -r -p "Press Enter to close…"
