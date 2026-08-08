#!/bin/bash
set -e
cd ~/Documents/hr-recruitment

# Ensure database exists
npx prisma db push --skip-generate 2>/dev/null

# Build for production
npx next build 2>/dev/null

# Start
npx next start --port 3000
