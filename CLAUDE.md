# CLAUDE.md

This file provides context and guidance for Claude (and contributors) working in this repository.

## Project Overview

`git_practice` is a simple Git learning/practice repository. It contains basic text files used to explore and demonstrate core Git workflows such as branching, committing, merging, and collaboration.

## Repository Structure

```
git_practice/
├── CLAUDE.md      # Project context and guidance for Claude
├── README.txt     # Top-level project description
├── hello.txt      # Sample "Hello, World!" file
└── test.txt       # Sample test file
```

## Common Commands

```bash
# Check the current status of the repo
git status

# Stage all changes
git add .

# Commit staged changes
git commit -m "your message here"

# Push the current branch to the remote
git push

# Pull the latest changes from the remote
git pull

# Create and switch to a new branch
git checkout -b my-new-branch

# List all branches
git branch -a
```

## Conventions

- Keep commit messages short, descriptive, and written in the imperative mood (e.g. "Add hello.txt").
- Use feature branches for new changes; avoid committing directly to `main`/`master`.
- Keep text files newline-terminated.

## Notes for Claude

- This is a practice repository — changes are low-risk and intended for learning purposes.
- When adding or modifying files, follow the simple plain-text style already in use.
- No build system, dependencies, or test runner are in use; no installation steps are required.
