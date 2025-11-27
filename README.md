# APS Calculator

A Rust/Tauri desktop application for setting Analytical Performance Specifications (APS) using Monte Carlo simulations.

## Prerequisites

- **Node.js**: v16 or later
- **Rust**: Stable release (install via [rustup](https://rustup.rs/))
- **System Dependencies**:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: C++ Build Tools
  - **Linux**: `libwebkit2gtk-4.0-dev`, `build-essential`, `curl`, `wget`, `file`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run in Development Mode**:
    ```bash
    npm run tauri dev
    ```
    This will start the React frontend and the Tauri backend window with hot-reloading enabled.

## Building for Production

To create a standalone desktop application:

```bash
npm run tauri build
```

The output bundles will be located in:
- **macOS**: `src-tauri/target/release/bundle/macos/` (`.app`) or `dmg/` (`.dmg`)
- **Windows**: `src-tauri/target/release/bundle/msi/` (`.msi`) or `nsis/` (`.exe`)
- **Linux**: `src-tauri/target/release/bundle/deb/` (`.deb`) or `appimage/` (`.AppImage`)

## Project Structure

- `src/`: React frontend code (UI, Components, State).
- `src-tauri/`: Rust backend code (Simulation logic, File I/O).
  - `src/data.rs`: File loading logic.
  - `src/simulation.rs`: Monte Carlo simulation engine.
