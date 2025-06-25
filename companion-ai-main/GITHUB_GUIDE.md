# GitHub Guide for AI Companion Extension

This guide will help you push your changes to GitHub and collaborate with your team.

## Prerequisites

1. **Git Installation**: Make sure Git is installed on your computer
2. **GitHub Account**: You need a GitHub account
3. **Repository Access**: You should have access to the repository

## Pushing Your Changes

### Step 1: Initialize Git Repository (if not already done)

```bash
# Navigate to your project directory
cd companion-ai-main

# Initialize a new Git repository
git init
```

### Step 2: Add Remote Repository

```bash
# Add the remote repository URL
git remote add origin https://github.com/yourusername/companion-ai.git

# Verify the remote was added
git remote -v
```

### Step 3: Create a New Branch

It's best practice to create a new branch for your changes:

```bash
# Create and switch to a new branch
git checkout -b vrm-avatar-implementation
```

### Step 4: Add Your Changes

```bash
# Add all files
git add .

# Or add specific files
git add src/js/content.js src/js/popup.js src/js/popup-vrm-viewer.js
```

### Step 5: Commit Your Changes

```bash
# Commit with a descriptive message
git commit -m "Implement VRM avatar functionality with model management"
```

### Step 6: Push to GitHub

```bash
# Push your branch to GitHub
git push -u origin vrm-avatar-implementation
```

### Step 7: Create a Pull Request

1. Go to the GitHub repository page
2. Click on "Pull requests" tab
3. Click "New pull request"
4. Select your branch "vrm-avatar-implementation"
5. Add a title and description explaining your changes
6. Click "Create pull request"

## Collaborating with Your Team

### Keeping Your Branch Updated

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Switch back to your branch
git checkout vrm-avatar-implementation

# Merge changes from main
git merge main

# Resolve any conflicts if they occur
```

### Reviewing Pull Requests

1. Go to the "Pull requests" tab on GitHub
2. Click on a pull request to review
3. Review the code changes
4. Add comments or suggestions
5. Approve or request changes

## Best Practices

1. **Commit Often**: Make small, focused commits with clear messages
2. **Pull Before Push**: Always pull the latest changes before pushing
3. **Test Before Commit**: Make sure your changes work before committing
4. **Write Descriptive Commit Messages**: Explain what and why, not how
5. **Reference Issues**: Include issue numbers in commit messages (e.g., "Fix #42")

## Troubleshooting

### Merge Conflicts

If you encounter merge conflicts:

1. Open the conflicted files in your editor
2. Look for conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
3. Resolve conflicts by editing the files
4. Save the files
5. Add the resolved files with `git add`
6. Complete the merge with `git commit`

### Undoing Changes

```bash
# Undo uncommitted changes to a file
git checkout -- filename

# Undo last commit but keep changes
git reset --soft HEAD~1

# Undo last commit and discard changes
git reset --hard HEAD~1
```

## Additional Resources

- [GitHub Documentation](https://docs.github.com/en)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Interactive Git Learning](https://learngitbranching.js.org/) 