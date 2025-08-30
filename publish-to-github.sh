#!/bin/bash

# Replace 'YOUR_USERNAME' with your actual GitHub username
GITHUB_USERNAME="YOUR_USERNAME"

# Configure Git (only needed if not already configured)
# git config --global user.name "Your Name"
# git config --global user.email "your.email@example.com"

# Add the GitHub remote repository
git remote add origin https://github.com/$GITHUB_USERNAME/media-compressor.git

# Push the repository to GitHub
git push -u origin main

echo "Repository successfully pushed to GitHub!"
echo "Visit https://github.com/$GITHUB_USERNAME/media-compressor to see your project."
