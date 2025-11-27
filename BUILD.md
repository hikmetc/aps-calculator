# Build Instructions for APS Calculator

This guide explains how to build the APS Calculator as a standalone desktop application for macOS.

## Prerequisites

Ensure you have the following installed:
- **Node.js** (v16 or later)
- **Rust** (latest stable)
- **Tauri CLI** (installed via npm)

## Building the App

1.  **Open Terminal** and navigate to the project directory:
    ```bash
    cd /Users/hikmetcancubukcu/.gemini/antigravity/scratch/aps-calculator
    ```

2.  **Run the Build Command**:
    ```bash
    npm run tauri build
    ```
    This command compiles the React frontend and the Rust backend, then bundles them into a macOS application.

## Locating the Output

Once the build completes successfully, you can find the application files in:

- **Application Bundle (.app):**
  `src-tauri/target/release/bundle/macos/aps-calculator.app`
  *You can drag this file to your Applications folder.*

- **Disk Image (.dmg):**
  `src-tauri/target/release/bundle/dmg/aps-calculator_0.1.0_aarch64.dmg`
  *This is the installer file you can share with other users.*

## Troubleshooting

- If you encounter permission errors with the DMG creation, the `.app` file usually still builds successfully and can be used directly.
- Ensure all dependencies are installed by running `npm install` before building.

## Building for Windows

The `.app` and `.dmg` files created above are **macOS only** and will **not** work on Windows.

To build a Windows executable (`.exe` and `.msi`):
1.  Copy this entire project folder to a **Windows machine**.
2.  Install **Node.js**, **Rust**, and the **C++ Build Tools** (via Visual Studio Installer).
3.  Run the same build command in PowerShell/Command Prompt:
    ```bash
    npm run tauri build
    ```
4.  The output will be in `src-tauri/target/release/bundle/msi/`.

## Building for Windows on Mac (Automated)

You **cannot** directly build the Windows app on your Mac. However, you can use **GitHub Actions** to build it automatically in the cloud.

1.  Push this code to a GitHub repository.
2.  I have included a workflow file at `.github/workflows/release.yml`.
3.  When you push a tag starting with `v` (e.g., `v1.0.0`), GitHub will automatically:
    -   Build the app for **macOS** and **Windows**.
    -   Create a "Release" on GitHub with the `.dmg` and `.exe` files attached.

This is the easiest way to get a Windows version without owning a Windows PC.
