# Weekly To-Do App

A mobile-first Progressive Web App (PWA) for weekly to-do tracking with app deep links.

## Tech Stack

- Vanilla HTML, CSS, JavaScript (no frameworks)
- localStorage for data persistence
- Service worker for offline PWA support

## File Structure

```
weekly-app/
├── index.html          # Main app HTML
├── css/styles.css      # Mobile-first styling with dark mode support
├── js/
│   ├── app.js          # Main app logic, drag-and-drop, modals
│   ├── storage.js      # localStorage CRUD operations
│   └── links.js        # Deep link generation
├── manifest.json       # PWA manifest
├── sw.js               # Service worker for offline caching
└── icons/icon.svg      # App icon
```

## Features

- Add/edit/delete to-do items
- Drag-and-drop reordering
- Weekly auto-reset of checkmarks (configurable day)
- Manual "Start Fresh" reset
- Progress bar with confetti celebration
- Export/import data backup
- Dark mode (follows system preference)

## App Link Types

| Type | Behavior |
|------|----------|
| None | No link |
| WhatsApp | Opens chat with specified phone number |
| Calendar | Opens Google Calendar week view |

## Local Development

### Start Local Server

```bash
cd /Users/tobiasloeff/Desktop/weekly-app
python3 -m http.server 3000
```

### Access on iPhone

1. Ensure iPhone is on same WiFi as Mac
2. Get Mac's IP: `ipconfig getifaddr en0`
3. On iPhone Safari, go to: `http://<MAC_IP>:3000`
4. To install as PWA: Share → Add to Home Screen

### Current Local URL

```
http://10.22.184.114:3000
```

## Data Model (localStorage)

```javascript
{
  "todos": [
    {
      "id": "unique-id",
      "text": "Task description",
      "linkType": "whatsapp|calendar|alarm|pitchero|none",
      "linkData": { /* type-specific data */ },
      "order": 0
    }
  ],
  "weeklyStatus": {
    "weekId": "2026-W05",
    "checked": ["id1", "id3"]
  },
  "settings": {
    "resetDay": 1  // 0=Sunday, 1=Monday, etc.
  }
}
```

## Deployment

For permanent hosting, deploy to GitHub Pages:

1. Create GitHub repository
2. Push all files
3. Settings → Pages → Enable from main branch
4. Access at `https://<username>.github.io/<repo-name>`
