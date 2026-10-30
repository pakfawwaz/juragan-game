# Juragan

A browser strategy game about building an Indonesian business group between 2005 and 2024: found a UD, CV or PT, open businesses in 98 regencies, set up teams, pay dividends through the RUPS, spin off and merge companies, and play the IDX.

The whole game is one file, `index.html`. `server.js` is a dependency-free Node server so it runs on Heroku.

## Run locally

```
npm start
```

Then open http://localhost:3000.

## Deploy to Heroku

```
heroku create your-app-name
git push heroku main
```

Saves live in each player's browser (localStorage). Market and macro data are approximate reconstructions for play.
