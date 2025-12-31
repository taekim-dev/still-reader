#!/bin/bash
# Script to create Chrome extension package

VERSION=$(node -p "require('./manifest.json').version")
PACKAGE_NAME="still-reader-v${VERSION}.zip"

echo "Building extension..."
npm run build

echo "Creating package: ${PACKAGE_NAME}"
cd dist
zip -r "../${PACKAGE_NAME}" . -x "*.DS_Store" "*.git*"
cd ..

echo "✓ Package created: ${PACKAGE_NAME}"
echo "✓ Ready to upload to Chrome Web Store"
