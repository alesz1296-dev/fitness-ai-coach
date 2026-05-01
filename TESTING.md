# FitAI Coach — Testing Guide

## Prerequisites

Make sure your backend is running before testing anything:

```bash
# From project root
npm run dev          # Backend on :3000

# From client/
npm run dev          # Web frontend on :5173
```

---

## Web Testing

Open `http://localhost:5173` in your browser.

### Quick checklist
- [ ] Register a new account → onboarding wizard appears
- [ ] Log in with existing account → Dashboard loads
- [ ] Dashboard: stat cards show calories, protein, weight, weekly workouts
- [ ] Dashboard: ⚖️ FAB logs weight and refreshes chart
- [ ] Nutrition: search and log a food under each meal section
- [ ] Nutrition: Quick Re-log strip appears after first food is logged
- [ ] Workouts: log a workout, view detail, delete it
- [ ] Workouts: browse Templates tab, fork a system template
- [ ] Chat: send a message to AI Coach, switch agents
- [ ] Goals: create a calorie goal, confirm Dashboard updates
- [ ] Settings: update profile, change protein multiplier slider
- [ ] Dark mode: toggle in Settings → App Preferences

### Dark mode
Toggled in **Settings → App Preferences → Dark Mode**. Stored in `localStorage("app_prefs_v1")`. To reset: open DevTools → Application → Local Storage → delete `app_prefs_v1`.

---

## Mobile Testing (Expo Go — iPhone / Android)

### One-time setup

1. Install **Expo Go** from the App Store / Play Store
2. Make sure your phone is on the **same Wi-Fi as your PC**, or use the PC hotspot (see below)
3. Open Windows Firewall and allow port 8081 (run once as Administrator):

```powershell
New-NetFirewallRule -DisplayName "Expo Metro" -Direction Inbound -Protocol TCP -LocalPort 8081 -Action Allow -Profile Any
```

### Start the dev server

```bash
cd mobile
npx expo start --host lan
```

Scan the QR code with Expo Go (iPhone: use the Camera app or Expo Go's built-in scanner).

### If you get a timeout / can't connect

**Option A — Use PC hotspot (most reliable)**

1. Windows Settings → Network & Internet → Mobile Hotspot → turn On
2. Connect your phone to the hotspot in Wi-Fi settings
3. Find the hotspot IP in `ipconfig` (look for "Local Area Connection*" adapter — usually `192.168.137.1`)
4. Start Expo with that IP explicitly:

```powershell
$env:REACT_NATIVE_PACKAGER_HOSTNAME="192.168.137.1"; npx expo start
```

**Option B — Check your IP changed**

Run `ipconfig`, find your Wi-Fi adapter's IPv4, update `mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://YOUR_PC_IP:3000/api
```

Then restart Expo.

**Option C — Verify Metro is reachable**

Open `http://YOUR_PC_IP:8081` in Safari on your phone. If it loads → network is fine, problem is elsewhere. If it times out → firewall or router AP isolation is blocking it. Disable firewall temporarily to confirm:

```powershell
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```

Re-enable after testing:

```powershell
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

### Mobile quick checklist
- [ ] App loads with splash screen (dark background)
- [ ] Login and Register screens work
- [ ] Dashboard tab: stats, macros, streaks, weight progress cards
- [ ] Nutrition tab: food search modal, log food, delete entry
- [ ] Workouts tab: view history, tap Log button, fill workout form
- [ ] Chat tab: send message to AI Coach, switch agent
- [ ] More tab: profile shows correctly, Edit Profile saves
- [ ] More tab: Sign Out returns to Login screen
- [ ] Pull-to-refresh works on Dashboard, Nutrition, Workouts
- [ ] ⚖️ FAB on Dashboard logs weight with modal

---

## EAS Build (Standalone APK / IPA)

### Android preview build (no Play Store needed)

```bash
cd mobile
eas build --platform android --profile preview
```

Takes ~10 min on EAS servers. Downloads a `.apk` you can install directly on any Android device.

### iOS build (requires Apple Developer account — $99/yr)

```bash
eas build --platform ios --profile preview
```

EAS handles certificates and provisioning automatically.

### Before a production build

1. Deploy your backend to a public URL (Railway, Render, Fly.io)
2. Update `EXPO_PUBLIC_API_URL` in the `production` profile of `mobile/eas.json`
3. Run:

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

### Submit to stores

```bash
eas submit --platform android --profile production   # → Google Play internal track
eas submit --platform ios --profile production        # → App Store Connect
```

Fill in Apple credentials and Google Play service account key in `mobile/eas.json` before submitting.

---

## Common issues

| Symptom | Fix |
|---|---|
| `Cannot find module '@shared/types'` | Types are in `mobile/src/shared/types/index.ts` — `babel-plugin-module-resolver` must be in `devDependencies` |
| EAS build fails at Bundle JS | Run `npm install` in `mobile/` first, then rebuild |
| Expo Go timeout | Firewall blocking port 8081 — run the PowerShell rule above |
| API calls fail on mobile | Check `mobile/.env` has the correct PC IP for `EXPO_PUBLIC_API_URL` |
| White screen after login | Check Metro terminal for a red error — usually a missing import or type error |
| `eas project:init` UUID error | Remove `extra.eas.projectId` from `mobile/app.json` and re-run `eas project:init` |
