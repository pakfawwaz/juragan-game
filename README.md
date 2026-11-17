# Juragan

A browser strategy game about building an Indonesian business group between 2005 and 2024: found a UD, CV or PT, open businesses in more than 500 regencies, set up teams, pay dividends through the RUPS, spin off and merge companies, take your best PT public and play the IDX.

## Run locally

With Node:

```
npm start
```

Then open http://localhost:3000.

Without Node, on Windows:

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open http://localhost:8765.

## Deploy to Heroku

```
heroku create your-app-name
git push heroku main
```

`server.js` is a dependency-free static server for `index.html`, `css/` and `js/`.

## The stock exchange

- **IPO desk.** A regular PT with twelve months of accounts, Rp 5 M of net assets, a profit, two directors and two commissioners can file for an IPO. You pick the ticker, the share of the company to sell and the valuation; about three months later the market mood decides whether the book fills, how the first day goes, or whether the offer is called off.
- **Listed companies.** After listing the company carries a `Tbk` name and a market price driven by its earnings, growth, governance and the index. Your stake counts at market value. You can trade your own shares against the public float (after an eight-month lock-up), buy shares back, or place new shares with institutions. Listing costs a monthly fee, public shareholders expect a dividend, and a 40% float earns a lower income tax rate.
- **Public offerings.** Listings that happened in real life (Adaro 2008, Garuda 2011, GoTo 2022 and others) open for subscription three weeks before their date. Hot offers are oversubscribed and only partly allotted.
- **Trading.** 45 stocks plus the IHSG, sector filter and sorting, market and 30-day limit orders.

## Code layout

Plain scripts that share one global scope, loaded in this order by `index.html`:

| File | Contents |
|---|---|
| `js/core.js` | Formatting, game clock, random numbers |
| `js/data.js` | Inflation, BI rate, exchange rate, minimum wages, regencies |
| `js/market.js` | Trading calendar, stock data, price-path generator, quotes |
| `js/bonds.js` | Government bonds |
| `js/law.js` | Company law and tax rules by date |
| `js/business.js` | Business catalogue, monitoring, boards |
| `js/sim.js` | Game state, hourly and daily simulation, player actions |
| `js/ui.js` | Rendering, modals, event handlers, game loop |
| `js/corporate.js` | Spin-off, inbreng, merger, treasury desk, RUPS |
| `js/reports.js` | Financial reports and the regions screen |
| `js/org.js` | Company size, departments, outsourcing, hiring |
| `js/news.js` | Dated historical news |
| `js/exchange.js` | IPO, listed companies, public offerings, stock market screen |
| `js/boot.js` | Start-up |

Saves live in each player's browser (localStorage). Market and macro data are approximate reconstructions for play: stock prices are anchored on approximate year-end closes with simulated moves in between, and IPO offer prices and first-day moves are approximate too.
