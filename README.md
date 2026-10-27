# Morning and Evening

C. H. Spurgeon's *Morning and Evening* as an installable reading app. 366 days, a morning and an evening reading for each, 732 readings in all.

It is one HTML file with the text and font built in, plus a small service worker so it reads offline once installed. No framework and no server.

## What it does

- Contents by calendar and by Scripture book
- Search that lists every place a word appears, jumps to it in the reading and steps through the matches. It also searches your own notes, highlights and the old-words list. Words match whole by default, with a switch to include longer words
- Bookmarks, highlights with notes, and a note on each reading
- Text size, typeface, day and night colours, saved reading progress
- Optional plain-English notes on old words (thou, hath, lest and so on)
- Listen, using the voice built into the device
- Backup and restore of everything you have saved

## Build

Needs Python 3 with Pillow, and Node 20 or newer.

    npm install
    npm run build

This writes to `dist/`:

- `dist/pwa/` the installable app (index.html, manifest, service worker, icons)
- `dist/artifact/morning-and-evening.html` a single-file version with no skeleton tags, for embedding
- `dist/test/index.html` a debug build used by the tests
- `dist/morning-and-evening-app.zip` the `pwa` folder plus `build/README.md`, ready to upload to a static host

`npm run build` also refreshes `public/`, a ready-to-host copy of the app that is committed to the repo. `netlify.toml` tells Netlify to serve that folder with no build command, so after any change: run `npm run build`, commit, push, and Netlify redeploys.

Hosting and phone-install steps for end users are in `build/README.md`.

## Test

    npm test

Builds, then drives the app in headless Chrome (reading, highlights, search counts checked against an independent count, backup and restore, layout at several widths) and checks that the PWA installs and works offline. The Listen test needs a speech voice, which headless Chrome does not have, so that one check fails there. It is an environment limit, not an app fault.

## Layout

    src/app.html      the app: styles, markup and script, with placeholders for font and data
    src/data.json     the text, one entry per day (verses and paragraphs for morning and evening)
    build/build.py    fills the placeholders and writes dist/
    build/make-data.py  turns a source JSON into src/data.json, repairing leaked verse headings
    build/test.mjs, build/pwa-test.mjs  the tests

## About the text

Spurgeon's *Morning and Evening* is in the public domain. `src/data.json` was made from a third-party npm package of the text, so its link to a particular printed edition is not confirmed. It was checked for structure (366 days, both readings each, nothing blank or duplicated) and four entries with scrambled headings were repaired by `build/make-data.py`. It has not been proofread word by word against a printed edition. The plain-English notes on old words were written for this app and are not part of Spurgeon's text.

## Licence

None chosen yet. Add one before inviting others to reuse the code.
