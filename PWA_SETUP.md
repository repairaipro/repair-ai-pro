# PWA (Progressive Web App) Setup

Your app is now configured as a Progressive Web App! Here's what has been set up:

## ✅ Completed Features

### 1. **Installable App**
- Users can install the app on their home screen (iOS 16.4+, Android, desktop)
- Displays as a standalone app (fullscreen, no browser chrome)
- Custom splash screen and theme colors
- Works offline for critical assets

### 2. **Service Worker** (`/public/sw.js`)
- Caches critical assets on first load
- Network-first strategy: tries to load from network, falls back to cache
- API calls always try the network first (fail gracefully if offline)
- Handles push notifications with click actions
- Supports badge updates via Badge API

### 3. **Badge API Integration**
- Home screen icon displays unread notification count
- Automatically syncs with NotificationCenter
- Works on iOS 16+, Android, and desktop Chrome
- Zero code needed from you—automatic!

### 4. **Manifest** (`/public/manifest.json`)
- Defines app name, icons, colors, start URL
- Includes app shortcuts for quick actions:
  - "Post a Job" → `/jobs/new`
  - "View Marketplace" → `/jobs`

### 5. **Meta Tags** (in `src/app/layout.tsx`)
- Apple-specific tags for iOS home screen
- Theme color for browser chrome
- Viewport optimization for mobile

---

## 📋 What You Need to Do

### 1. **Add App Icons** (Required for production)

Replace the placeholder icon at `/public/icon-svg.svg` with real icons:

**Required icon files** (in `/public/`):
- `icon-192x192.png` — 192×192px icon (standard)
- `icon-512x512.png` — 512×512px icon (large displays)
- `icon-maskable-192x192.png` — 192×192px with transparent padding (Android adaptive icons)
- `icon-maskable-512x512.png` — 512×512px with transparent padding

**Tips for icon creation:**
- Use a solid color background (matches your theme color #4f46e5 indigo)
- Include the lightning bolt or repair symbol
- Leave padding on maskable icons (safe zone in center)
- PNG format, 24-bit color minimum
- Use tools like [Figma](https://figma.com), [Canva](https://canva.com), or [PWA Asset Generator](https://www.pwabuilder.com/imageGenerator)

### 2. **Update Theme Colors** (Optional)

If you want different colors, edit:
- `manifest.json` → `theme_color`, `background_color`
- `src/app/layout.tsx` → `<meta name="theme-color">`
- `src/lib/pwa.ts` uses these colors in the browser chrome

### 3. **Add Push Notifications** (Future enhancement)

When ready to send push notifications:
1. Get VAPID keys from [FCM Console](https://console.firebase.google.com/)
2. Add to `.env.local`:
   ```
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
   ```
3. Call `subscribeToPushNotifications()` in PWASetup
4. Send push via Firebase Cloud Messaging

---

## 🧪 Testing the PWA

### Desktop (Chrome)
1. Run `npm run dev`
2. Open Chrome DevTools → Application tab
3. Check "Manifest" and "Service Workers"
4. Look for install prompt (usually appears after visiting the site)

### Mobile (iOS 16.4+)
1. Open Safari
2. Tap Share → "Add to Home Screen"
3. Icon appears on home screen
4. Tap to open in fullscreen mode

### Mobile (Android)
1. Open Chrome
2. Tap menu (⋮) → "Install app"
3. Or long-press and "Install app"
4. Icon appears on home screen with badge

### Offline Testing
1. Open DevTools → Network
2. Toggle "Offline"
3. App should still load from cache
4. API calls show error (graceful failure)

---

## 📊 How It Works

### Badge Count Flow
```
NotificationCenter (fetches unread count)
    ↓ (syncs to localStorage)
    ↓ (dispatches custom event)
PWASetup (listens to event)
    ↓ (calls updateBadgeCount)
Service Worker (receives message)
    ↓ (calls navigator.setAppBadge)
Home screen icon shows badge number
```

### Service Worker Caching
```
User requests page
    ↓
Service Worker intercepts fetch
    ↓
For API calls: fetch from network, fail gracefully if offline
For pages/assets: fetch from network, cache if successful, fallback to cache if offline
```

---

## 🔧 Code Files Added/Modified

**New files:**
- `public/manifest.json` — App metadata
- `public/sw.js` — Service worker (offline support, push notifications)
- `public/icon-svg.svg` — Placeholder icon (replace with real PNG files)
- `src/lib/pwa.ts` — PWA utility functions
- `src/components/PWASetup.tsx` — Service worker registration & badge sync

**Modified files:**
- `src/app/layout.tsx` — Added manifest link, meta tags, PWASetup component
- `src/components/NotificationCenter.tsx` — Added localStorage sync for badge count

---

## 📚 Useful Resources

- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Manifest Specification](https://www.w3.org/TR/appmanifest/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Badge API](https://developer.mozilla.org/en-US/docs/Web/API/Badging_API)
- [PWA Builder (Microsoft)](https://www.pwabuilder.com/)

---

## 🎯 What's Next

Once you add icons, your PWA is ready to go! Next steps could be:
1. **Push Notifications** — Send notifications to contractors for urgent jobs
2. **Offline Sync** — Queue actions offline, sync when reconnected
3. **Background Sync** — Sync data periodically in background
4. **Share API** — Share jobs via native share dialog

The foundation is ready for all of these!
