# How to Publish and Build on GitHub

I have prepared your project for GitHub. Follow these exact steps to get your Windows build.

## Step 1: Create a Repository on GitHub
1.  Go to [github.com/new](https://github.com/new).
2.  Name your repository `aps-calculator`.
3.  **Do NOT** check "Add a README", "Add .gitignore", or "Choose a license" (we already have these).
4.  Click **Create repository**.

## Step 2: Push Your Code
1.  Copy the URL of your new repository (e.g., `https://github.com/YOUR_USERNAME/aps-calculator.git`).
2.  Open your terminal in this folder and run these commands (replace `YOUR_URL` with the one you copied):

```bash
git remote add origin YOUR_URL
git branch -M main
git push -u origin main
```

## Step 3: Trigger the Build
To make GitHub build the app for Windows and Mac, you need to create a "tag".

Run this command in your terminal:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## Step 4: Download Your App
1.  Go to your repository page on GitHub.
2.  Click on the **"Actions"** tab to see the build running.
3.  Once it finishes (green checkmark), go to the **"Releases"** section (on the right side of the main page).
4.  You will see `App v1.0.0`. Expand "Assets" to find:
    -   `aps-calculator...setup.exe` (for Windows)
    -   `aps-calculator...dmg` (for Mac)
