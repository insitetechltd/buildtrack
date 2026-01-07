#!/bin/bash
# Check if upload key keystore is in git history

set -e

EXPECTED_SHA1="5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Checking Git for Upload Key Keystore${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Expected SHA-1:${NC} ${EXPECTED_SHA1}"
echo ""

# Check if we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo -e "${RED}❌ Not a git repository${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Checking if keystores are gitignored...${NC}"
if grep -qE "\.(jks|keystore)" .gitignore 2>/dev/null; then
    echo -e "${GREEN}✅ Keystores are gitignored (good practice)${NC}"
    echo -e "${YELLOW}   But checking history in case they were committed before being ignored...${NC}"
else
    echo -e "${YELLOW}⚠️  Keystores are NOT gitignored${NC}"
fi
echo ""

echo -e "${BLUE}Step 2: Checking git history for keystore files...${NC}"
KEYSTORE_FILES=$(git log --all --full-history --pretty=format: --name-only --diff-filter=A -- "*.jks" "*.keystore" | sort -u | grep -E "\.(jks|keystore)$")

if [ -z "$KEYSTORE_FILES" ]; then
    echo -e "${YELLOW}⚠️  No keystore files found in git history${NC}"
    echo -e "${GREEN}✅ This is good - keystores should not be in git${NC}"
    echo ""
    echo -e "${BLUE}Step 3: Checking for keystore references in commits...${NC}"
    COMMITS_WITH_KEYSTORE=$(git log --all --full-history -S "keystore" --oneline | head -10)
    if [ -n "$COMMITS_WITH_KEYSTORE" ]; then
        echo -e "${YELLOW}Found commits mentioning 'keystore':${NC}"
        echo "$COMMITS_WITH_KEYSTORE"
    else
        echo -e "${YELLOW}No commits found mentioning 'keystore'${NC}"
    fi
    exit 0
fi

echo -e "${GREEN}Found keystore files in git history:${NC}"
echo "$KEYSTORE_FILES" | while read file; do
    echo -e "  - ${YELLOW}$file${NC}"
done
echo ""

echo -e "${BLUE}Step 3: Checking each keystore file in git history...${NC}"
FOUND_MATCH=false

for file in $KEYSTORE_FILES; do
    echo -e "${BLUE}Checking: ${YELLOW}$file${NC}"
    
    # Get all commits that touched this file
    COMMITS=$(git log --all --full-history --pretty=format:"%H" -- "$file")
    
    for commit in $COMMITS; do
        # Try to extract the file from this commit
        if git cat-file -e "$commit:$file" 2>/dev/null; then
            # Save to temp file
            TEMP_KEYSTORE=$(mktemp).jks
            git show "$commit:$file" > "$TEMP_KEYSTORE" 2>/dev/null
            
            # Try to verify with common passwords/aliases
            # Try the credentials we know about
            for pass in "dfc88498be1516dad38326fe0c39bcf7" "59b6299dec7d2ca0593156274e73cf7"; do
                for alias in "e8005967b342362185383e2d4758121d" "0480c2c855f333132cb9ac4f6a41b596"; do
                    SHA1=$(keytool -list -v -keystore "$TEMP_KEYSTORE" -storepass "$pass" -alias "$alias" 2>&1 | grep "SHA1:" | awk '{print $2}' | head -1)
                    
                    if [ -n "$SHA1" ] && [ "$SHA1" != "null" ]; then
                        echo -e "  Commit: ${YELLOW}$(git log -1 --pretty=format:"%h %s" $commit)${NC}"
                        echo -e "  SHA-1: ${SHA1}"
                        
                        # Normalize for comparison
                        SHA1_NORM=$(echo "$SHA1" | tr -d ':' | tr '[:lower:]' '[:upper:]')
                        EXPECTED_NORM=$(echo "$EXPECTED_SHA1" | tr -d ':' | tr '[:upper:]' '[:upper:]')
                        
                        if [ "$SHA1_NORM" == "$EXPECTED_NORM" ]; then
                            echo -e "  ${GREEN}✅✅✅ MATCH FOUND! ✅✅✅${NC}"
                            echo ""
                            echo -e "${GREEN}Found matching keystore in git!${NC}"
                            echo -e "  File: ${YELLOW}$file${NC}"
                            echo -e "  Commit: ${YELLOW}$commit${NC}"
                            echo -e "  To extract: ${YELLOW}git show $commit:$file > upload-key.keystore${NC}"
                            FOUND_MATCH=true
                            rm -f "$TEMP_KEYSTORE"
                            break 2
                        fi
                    fi
                done
            done
            
            rm -f "$TEMP_KEYSTORE"
        fi
    done
done

echo ""
if [ "$FOUND_MATCH" = false ]; then
    echo -e "${RED}❌ Upload key keystore not found in git history${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Check EAS profiles: ${YELLOW}./download-all-eas-keystores.sh${NC}"
    echo -e "  2. Check backups and other locations"
    echo -e "  3. Consider resetting upload key in Play Console"
else
    echo -e "${GREEN}✅ Upload key keystore found in git!${NC}"
fi

