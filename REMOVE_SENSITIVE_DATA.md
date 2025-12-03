# Removing Sensitive Data from Git History

## ⚠️ WARNING
Rewriting git history is **destructive** and will change commit hashes. If you've already pushed to a remote repository:
1. **Coordinate with your team** - everyone will need to re-clone or reset their local repos
2. **Force push will be required** - `git push --force`
3. **Consider if the repo is public** - exposed keys may already be compromised

## Method 1: Using git filter-branch (Built-in)

### Remove sensitive files from entire history:
```bash
# Remove specific files from all commits
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch start_mushfiq.sh start-demo.sh" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up backup refs
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d

# Force garbage collection
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### Remove specific strings/patterns from entire history:
```bash
# Remove API keys and passwords from all files
git filter-branch --force --tree-filter \
  "find . -type f -name '*.sh' -exec sed -i 's/DB_PASSWORD=\"postgres\"/DB_PASSWORD=\"\"/g' {} \;" \
  --prune-empty --tag-name-filter cat -- --all

# Clean up
git for-each-ref --format="%(refname)" refs/original/ | xargs -n 1 git update-ref -d
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## Method 2: Using BFG Repo-Cleaner (Recommended - Faster)

### Install BFG:
```bash
# Download from https://rtyley.github.io/bfg-repo-cleaner/
# Or use Homebrew (Mac): brew install bfg
# Or use apt (Linux): sudo apt install bfg
```

### Remove files:
```bash
# Clone a fresh copy (BFG works on fresh clones)
cd /tmp
git clone --mirror /path/to/your/repo.git

# Remove sensitive files
bfg --delete-files start_mushfiq.sh
bfg --delete-files start-demo.sh

# Or remove specific strings
bfg --replace-text passwords.txt  # Create passwords.txt with patterns to replace

# Clean up
cd /path/to/your/repo.git
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## Method 3: Complete History Rewrite (Nuclear Option)

If you want to start fresh but keep the current state:

```bash
# Create a new orphan branch with current state
git checkout --orphan new-main
git add .
git commit -m "Initial commit - cleaned history"

# Delete old main branch
git branch -D main  # or master

# Rename new branch to main
git branch -m main

# Force push (⚠️ DANGEROUS - will rewrite remote history)
git push origin main --force
```

## After Cleaning History:

1. **Update .gitignore** to prevent future commits:
```bash
echo "start_mushfiq.sh" >> .gitignore
echo ".env.local" >> .gitignore
echo "*.env" >> .gitignore
echo "*.key" >> .gitignore
echo "*.pem" >> .gitignore
```

2. **Rotate all exposed credentials**:
   - Change database passwords
   - Regenerate API keys
   - Update any services using old credentials

3. **Verify cleanup**:
```bash
# Search history for sensitive data
git log --all --full-history -- "start_mushfiq.sh"
git log -S "DB_PASSWORD" --all
git log -S "GEMINI_API_KEY" --all
```

4. **Notify team members**:
   - Everyone needs to: `git fetch origin` then `git reset --hard origin/main`
   - Or re-clone the repository

## Quick Fix (If repo is private and not shared):

If the repository is private and hasn't been shared widely, the simplest approach:

```bash
# Remove sensitive files from tracking
git rm --cached start_mushfiq.sh
git rm --cached start-demo.sh

# Add to .gitignore
echo "start_mushfiq.sh" >> .gitignore
echo "start-demo.sh" >> .gitignore

# Commit the removal
git add .gitignore
git commit -m "Remove sensitive files and add to gitignore"

# Note: This only removes from future commits, not history
# For complete removal, use Method 1 or 2 above
```
