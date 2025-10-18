# NextUp - Show Tracker

NextUp is a simple Vanilla JavaScript web app to track your watched TV shows using the Trakt.tv API.  
You can track episodes, mark seasons as watched, view statistics, and see upcoming episodes — all in a modern, responsive interface.

---

## Features

- View your watched TV shows
- Mark episodes or entire seasons as watched
- Quick stats: total shows, total episodes, etc.
- Upcoming episodes page
- Smooth navigation with hash-based routing
- Login via Trakt.tv OAuth
- Built with Vanilla JS (ES6 modules), no frameworks required

---

## Project Structure

```
nextup-show-tracker/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js          ← Router & main logic
│   ├── api.js          ← Trakt API calls
│   ├── ui.js           ← DOM helpers
│   ├── pages/
│   │   ├── home.js     ← Shows list
│   │   ├── show.js     ← Show details
│   │   ├── stats.js    ← Statistics
│   │   └── upcoming.js ← Upcoming episodes
└── components/
    ├── header.html
    └── footer.html
```

---

## Installation & Setup

1. Clone the repository:

```
git clone https://github.com/yourusername/nextup-show-tracker.git
```

2. Open `index.html` in your browser (or use a local server like `live-server`).

---

## Usage

- Navigate using the navbar to access different pages:
  - **Home** – your list of shows
  - **Stats** – quick statistics overview
  - **Upcoming** – upcoming episodes
- Click a show to view its seasons and episodes
- Mark episodes as watched directly from the UI
- Use the **Logout** button to remove your Trakt session

---

## Technologies

- HTML5 & CSS3
- Vanilla JavaScript (ES6 modules)
- Trakt.tv API
- Hash-based routing (SPA-style)
- Static site deployable on Netlify or Vercel

---

## Author

Antonio Sertić

## License

MIT
