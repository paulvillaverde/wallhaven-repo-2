# Wallhaven Next.js Migration

This project is a migration of the original Wallhaven client/server into a single Next.js app.

Quick start (development):

1. Install dependencies

```powershell
npm install
```

2. Run the dev server

```powershell
npm run dev
```

The Next dev server will run at http://localhost:3000 and exposes API routes under `/api/*`.

Important environment variables

- `SESSION_SECRET` — the JWT signing secret used for auth cookies. Set to a strong random value in production.
- `NODE_ENV` — when `production`, auth cookies are marked `Secure`.

Running tests

```powershell
npm test
```

Notes
- The old `backend/` folder was migrated into Next API routes. The SQLite database file `database.sqlite` is created in the repository root.
- Review cookie security (set Secure + SameSite appropriately) when deploying to production over HTTPS.
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
