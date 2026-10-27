# Morning and Evening, the installable app

Spurgeon's Morning and Evening as a small web app. 366 days, a morning and an evening reading for each, 732 in all. Once it is online, anyone can add it to their phone's home screen, and it then works with no internet connection.

## What is in the folder

Open the `morning-and-evening` folder inside this zip. Everything the app needs is there:

- `index.html` holds the whole app, the text and the font.
- `manifest.webmanifest` and the three `icon` files make it installable.
- `sw.js` lets it work offline after the first visit.

Nothing needs building or installing. It is plain files.

## Putting it online

Pick one. All three are free.

1. **Netlify.** Open Netlify's drag-and-drop deploy page, drag the `morning-and-evening` folder onto it, and you get a web address within a minute.
2. **Vercel.** Create a new project, upload the folder, and deploy it as a static site with no build command.
3. **GitHub Pages.** Put the contents of the folder in a repository, then turn on Pages in the repository settings.

The address must start with `https`. All three give you that automatically.

## Installing on a phone

- **iPhone:** open the address in Safari, tap Share, then Add to Home Screen.
- **Android:** open it in Chrome, open the menu, then choose Install app or Add to Home screen.

Open it once with a connection. After that it reads offline.

## Good to know

- Bookmarks, highlights, notes and reading progress are saved on the device. Settings has an Export backup button, and Restore from file puts them back, or moves them to a new phone.
- Settings also lets you change the text size, switch between day and night colours, set the hour when "Today" switches from the morning reading to the evening one, and underline old words so a tap explains them.
- Listen uses the voice built into the phone, so how it sounds depends on the phone.
- After you change anything in the folder and upload it again, open the app twice to see the update, because the offline copy refreshes in the background.

## About the text

Spurgeon's Morning and Evening is in the public domain. The text was checked for completeness (366 days, a morning and evening each, nothing blank or duplicated) and four entries with scrambled headings were repaired. It has not been proofread word by word against a printed edition. The plain-English notes on old words were written for this app and are not part of Spurgeon's text.
