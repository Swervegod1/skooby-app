# SKOOBY Alpha Oracle V1.2 · Android APK

Native Android Java/WebView shell with **bundled offline risk simulator** and **online Skooby market tracker** at https://skooby.app/tracker.

- No exchange APIs, private keys, wallet signing, brokerage permissions, autonomous trading, or simulated realized gains.
- The local simulator demonstrates drawdown, leverage, ATR-volatility, and anti-martingale checks; **it is not the full authenticated intelligence stack**.
- Mahalanobis novelty assessment is marked NOT CALIBRATED until a validated train/calibration process is deployed.
- The online tracker loads the existing Skooby site; its availability depends on the actual live site and the network.

## Build

JDK 17+, Android SDK platform 35, Android build-tools 35.0.0 and Gradle 8.13 required.

```bash
cd android
gradle assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

The included GitHub Actions workflow builds and uploads an installable, Android-debug-signed APK. Debug-signed APKs are for sideloading/testing, not production distribution. No Android SDK is installed in the assistant's local environment; GitHub Actions is needed for compilation and signing.

## Installation

Download the `SKOOBY-Alpha-Oracle-V1.2-debug-APK` artifact from the repository's completed GitHub Actions run, unzip it, install `app-debug.apk`, and open **SKOOBY Alpha Oracle**. Enable Android's per-source *Install unknown apps* permission only when you trust the downloaded APK. For production, add a secure release signing workflow and distribute through a controlled channel.

## Security

Local HTML is loaded from the app package. Navigation inside the app is restricted to `https://skooby.app` and the offline Oracle view; other HTTPS destinations open in the system browser. HTTP and non-HTTPS navigation is rejected. No JavaScript bridge to native signing functions is exposed. No sensitive keys or environment variables are bundled.
