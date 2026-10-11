# VYLOOP

A personal habit and money tracker with daily quests, XP, budgets, and savings goals. No account, email, password, API key, or database setup is required.

## Get started

Open the app, enter your name, and choose **Start with just my name**. Goals, interests, daily time, budget, and savings setup are optional.

The four-step tutorial explains quests, XP, money tracking, and backups. Replay it with **? Help**, or **More → Help** on a phone.

## Run locally

Install Node.js 24 or later. Open a terminal in the project folder and run:

```sh
npm install
npm run dev
```

Wait for **Ready**, then open the address printed in the terminal, usually **http://127.0.0.1:3000/**. Keep the terminal running while using the app; **Ctrl+C** stops it. On Windows PowerShell, use `npm.cmd` in place of `npm` if script execution is blocked.

The included lockfile also supports `npm ci` for a reproducible dependency installation.

## Your records and backups

Each visitor's records stay in their browser profile on their device. There is no automatic cloud sync. Anyone using the same browser profile can access them. Clearing site data, changing browsers, or changing the site address does not transfer records.

Use **Settings → Export** regularly to save a JSON backup. To move your records to another browser or device, choose **Settings → Restore backup** and select that file. Restore replaces existing records after confirmation. MoneyLoop also supports monthly expense exports as CSV.

A new personal workspace starts with zero XP, no completed quests, and no sample expenses or savings. Suggested daily quests are available from the start.

## Production build

```sh
npm run build
npm start
```

The build creates `out/` for static HTTPS hosting. Publish its contents at the root of a site. No backend or secrets are needed. `npm start` serves the build locally, usually at **http://127.0.0.1:4173/**; use the exact address printed in the terminal. Rebuild after changing source code.

Localhost addresses work only on your own computer. A public hosting service is needed for a link other people can open.

## Publish with GitHub Pages

The included workflow publishes the `main` branch to **https://k-m-rahaman.github.io/VYLOOP/**. In the repository, open **Settings → Pages** and select **GitHub Actions** as the source. Push changes to `main`, then check the **Actions** tab for the completed deployment. No hosting secrets or database setup are required.

The workflow builds with `NEXT_PUBLIC_BASE_PATH=/VYLOOP` so links, scripts, styles, and icons load correctly under the repository path. Leave this variable unset when running locally or hosting at a domain's root. Rebuild when changing the path. Your local browser records are separate from records saved on the public site; use a JSON backup to transfer them.

## Development checks

```sh
npm run lint
npm run typecheck
npm test
```

Built with Next.js, React, and TypeScript.
