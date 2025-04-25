# CodeBERT Vulnerability Detector VS Code Extension

This extension lets you check code for vulnerabilities using your CodeBERT backend.

## Features
- Select code (or use with no selection to check the whole file)
- Right-click and choose **Check Code for Vulnerabilities**
- Or run from the Command Palette (Ctrl+Shift+P)
- Results and fixes appear in a popup

## Requirements
- Your backend running at http://localhost:5000/predict
- Node.js installed (for dependencies)

## How to Install Locally
1. Open this folder in VS Code
2. Run `npm install` in the terminal to install dependencies
3. Press `F5` to launch a new VS Code window with the extension loaded
4. Use the command as described above

## Example Vulnerable Code
```python
import sqlite3

def get_user_info(username):
    conn = sqlite3.connect('users.db')
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE username = '%s'" % username)
    return cursor.fetchall()
```

## Troubleshooting
- Make sure your backend is running and accessible
- If you change extension code, reload the extension (Developer: Reload Window)
