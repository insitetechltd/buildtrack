#!/bin/bash
# Verify if a keystore file matches the upload key certificate

set -e

UPLOAD_CERT_SHA1="5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16"

if [ $# -lt 3 ]; then
    echo "Usage: $0 <keystore-file> <keystore-password> <key-alias>"
    echo ""
    echo "Example:"
    echo "  $0 ./my-keystore.jks mypassword mykeyalias"
    echo ""
    echo "This script checks if a keystore's SHA-1 matches the upload key certificate."
    exit 1
fi

KEYSTORE_FILE="$1"
KEYSTORE_PASSWORD="$2"
KEY_ALIAS="$3"

if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "❌ Error: Keystore file not found: $KEYSTORE_FILE"
    exit 1
fi

echo "Checking keystore: $KEYSTORE_FILE"
echo "Key alias: $KEY_ALIAS"
echo ""

KEYSTORE_SHA1=$(keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" 2>&1 | grep "SHA1:" | awk '{print $2}')

if [ -z "$KEYSTORE_SHA1" ]; then
    echo "❌ Error: Could not extract SHA-1 from keystore. Check password and alias."
    exit 1
fi

echo "Keystore SHA-1:    $KEYSTORE_SHA1"
echo "Expected SHA-1:    $UPLOAD_CERT_SHA1"
echo ""

# Normalize SHA-1 for comparison (remove colons and convert to uppercase)
KEYSTORE_SHA1_NORM=$(echo "$KEYSTORE_SHA1" | tr -d ':' | tr '[:lower:]' '[:upper:]')
UPLOAD_CERT_SHA1_NORM=$(echo "$UPLOAD_CERT_SHA1" | tr -d ':' | tr '[:lower:]' '[:upper:]')

if [ "$KEYSTORE_SHA1_NORM" == "$UPLOAD_CERT_SHA1_NORM" ]; then
    echo "✅ SUCCESS! This keystore matches the upload key certificate!"
    echo ""
    echo "You can use this keystore for signing your app."
    exit 0
else
    echo "❌ This keystore does NOT match the upload key certificate."
    exit 1
fi


