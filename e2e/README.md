# E2E Testing with Maestro

This directory contains end-to-end (E2E) tests for the Water Tanker App using [Maestro](https://maestro.mobile.dev/), a modern mobile UI testing framework that works seamlessly with Expo.

## Prerequisites

1. **Install Maestro CLI**:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   ```

   Or on macOS:
   ```bash
   brew tap mobile-dev-inc/tap
   brew install maestro
   ```

2. **Install Android Studio** (for Android emulator) or **Xcode** (for iOS simulator)

3. **Start your Expo app**:
   ```bash
   npm start
   ```

## Running E2E Tests

### Run all tests
```bash
maestro test e2e/
```

### Run a specific test
```bash
maestro test e2e/auth-flow.yaml
```

### Run tests on a specific device
```bash
# Android
maestro test e2e/ --device "emulator-5554"

# iOS
maestro test e2e/ --device "iPhone 14"
```

### Run tests in cloud (Maestro Cloud)
```bash
maestro cloud --apiKey YOUR_API_KEY e2e/
```

## Test Structure

```
e2e/
├── README.md                    # This file
├── auth-flow.yaml              # Authentication flow tests
├── booking-flow.yaml           # Booking creation flow tests
├── driver-flow.yaml            # Driver acceptance flow tests
└── admin-flow.yaml             # Admin management flow tests
```

## Writing Tests

Maestro tests are written in YAML format. Here's a basic example:

```yaml
appId: com.watertanker.app
---
- launchApp
- assertVisible: "Login"
- tapOn: "Login"
- inputText: "9876543210"
- tapOn: "Password"
- inputText: "password123"
- tapOn: "Sign In"
- assertVisible: "Home"
```

## Test Data

For E2E tests, use test accounts that are created in your test Supabase instance:
- Test Customer: `9876500001` / `TestPassword123`
- Test Driver: `9876500002` / `TestPassword123`
- Test Admin: `9876500003` / `TestPassword123`

## CI/CD Integration

E2E tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run E2E Tests
  run: |
    maestro cloud --apiKey ${{ secrets.MAESTRO_API_KEY }} e2e/
```

## Troubleshooting

### Tests fail to find elements
- Ensure the app is fully loaded before assertions
- Use `waitForAnimationToEnd` if animations are interfering
- Check element IDs/accessibility labels in the app

### App crashes during tests
- Check logs: `maestro logs`
- Ensure test data is properly set up
- Verify Supabase connection in test environment

### Device not found
- List available devices: `maestro devices`
- Start emulator/simulator before running tests
- For iOS, ensure Xcode command line tools are installed

## Resources

- [Maestro Documentation](https://maestro.mobile.dev/)
- [Maestro Best Practices](https://maestro.mobile.dev/best-practices)
- [Maestro Cloud](https://cloud.mobile.dev/)

