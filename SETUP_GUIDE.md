# Setup Guide

## 1. Prerequisites

### Python
Python is currently **not installed** (or not found in PATH).
Please install Python 3.11+ from [python.org](https://www.python.org/downloads/) or the Microsoft Store.
**Important:** Check "Add Python to PATH" during installation.

### Railway CLI
We will use `npm exec railway` to run Railway commands without installing the CLI globally.

## 2. Connect to Railway

1.  Open the Command Palette (`Ctrl+Shift+P`) and run **Tasks: Run Task**.
2.  Select **Railway: Login**. Follow the browser prompt.
3.  Select **Railway: Link**. Choose your project (`arbi-production` or similar).
4.  Select **Railway: Pull Env**. This will download your environment variables to `.env`.

## 3. Setup Python (Once Python is installed)

1.  Run **Tasks: Run Task** -> **Setup Python Venv**.

## 4. Start Development

1.  Run **Tasks: Run Task** -> **Dev: All (Local)** to start the API and Dashboard.
    *   API: http://localhost:3001 (or port defined in .env)
    *   Dashboard: http://localhost:3000

## Troubleshooting

*   **PowerShell Scripts Disabled:** If you see errors about scripts being disabled, try running commands in `cmd` or enable scripts via `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser` in PowerShell (Admin).
