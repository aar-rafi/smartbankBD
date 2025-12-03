#!/bin/bash

# Script to remove sensitive data from git history
# WARNING: This will rewrite git history. Use with caution!

set -e

echo "============================================"
echo "  Git History Cleanup - Remove Sensitive Data"
echo "============================================"
echo ""
echo "⚠️  WARNING: This will rewrite git history!"
echo "⚠️  If you've pushed to remote, you'll need to force push"
echo "⚠️  All team members will need to re-clone or reset"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Removing sensitive files from git history..."
echo ""

# Remove files from entire history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch start_mushfiq.sh" \
  --prune-empty --tag-name-filter cat -- --all

echo ""
echo "Step 2: Cleaning up backup refs..."
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d 2>/dev/null || true

echo ""
echo "Step 3: Expiring reflog..."
git reflog expire --expire=now --all

echo ""
echo "Step 4: Running garbage collection..."
git gc --prune=now --aggressive

echo ""
echo "============================================"
echo "✅ Git history cleaned!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Verify: git log --all -- 'start_mushfiq.sh'"
echo "2. If pushed to remote: git push origin --force --all"
echo "3. Notify team members to re-clone or reset"
echo "4. Rotate any exposed credentials (passwords, API keys)"
echo ""
