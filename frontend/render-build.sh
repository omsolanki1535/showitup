#!/usr/bin/env bash
set -e

echo "Installing dependencies from the lockfile..."
npm ci

echo "Building project..."
npm run build
