# The Data Stand

A small website for JC’s Streamlit analyses. White folder cards hold a dashboard screenshot, display name, record count, and the dataset’s original publication date.

**Status:** frontend and demo editor implemented. Live owner authentication, database permissions, and screenshot storage are wired for Supabase but must be configured and tested with your own project. This folder has not been deployed to Vercel. No real Streamlit URL has been supplied yet.

## What is included

- Public card collection; clicking a card opens its Streamlit dashboard in a new tab.
- Private email/password owner sign-in, without public registration.
- Add, edit, and remove cards, including their URLs, titles, record counts, publication labels, descriptions, and screenshots.
- Screenshot uploads to persistent storage; a placeholder when no screenshot is uploaded.
- Search and sorting. “Recently added” uses the card’s creation date, independently of the original dataset date printed on the card.
- Duplicate URL checks and database uniqueness.
- Responsive layout, keyboard controls, reduced motion support, and labeled forms.
- Database policies that let visitors read cards and restrict edits to approved owner accounts.

## 1. Preview locally

You do not need to install Python packages. From this project folder, run:

```sh
python -m http.server 8000 --directory public
```

Open http://localhost:8000 in your browser.

With the two values in `public/config.js` empty, the page displays a **design preview**. Click **Try sample editor** to test adding, editing, and removing cards. Changes stay in that browser’s local storage. This is a demonstration, not private owner access or a shared database. Deleting demo cards does not affect Streamlit. Clear the site’s browser storage to reset the sample.

The Student Alcohol Consumption sample lists 395 records and the original authors’ publication year, 2008. It has no real dashboard URL or screenshot, so it cannot open a live dashboard. It is not inserted into your production database.

## 2. Create the persistent backend

Use Supabase for the collection database, private sign-in, and screenshot files.

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor**, start a new query, paste `supabase/setup.sql`, and run it **once**. It creates the tables, storage bucket, and access policies. Do not rerun the script against an existing setup; its transaction prevents partial setup on error.
3. In **Authentication → Users → Add user**, create your own email/password user. Use the create-user option and confirm that account in the dashboard if needed. Choose and enter your password privately; do not put it in the project files.
4. Run this separate SQL query, replacing the example email with the exact email you just created:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'your-email@example.com'
on conflict do nothing;
```

5. Confirm one matching row exists in `public.admins`. If none was added, check that the user exists and the email matches.
6. Turn off public user registration in your Supabase Auth settings. There is no signup form on this website; membership in the `admins` table is still required for edits even if someone creates another authenticated account.
7. From your project’s **Connect** dialog or API settings, copy the **Project URL** and **publishable key**. A legacy `anon` key also works. Edit `public/config.js`:

```js
window.DATA_STAND_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT.supabase.co",
  supabasePublishableKey: "YOUR_PUBLIC_PUBLISHABLE_KEY"
};
```

These values identify the public browser client and can be committed to GitHub. **Never use a secret key or `service_role` key here.** Database policies enforce the owner restriction.

8. Reload the local website. The sample disappears, and your shared collection starts empty. Click **Manage collection**, sign in, and add your first real dashboard.

Password changes or recovery can be handled through your Supabase project; this first version does not include a password-reset interface.

## 3. Add your Student Alcohol Consumption dashboard

1. Sign in and click **Add dashboard**.
2. Paste its public `https://…streamlit.app` URL.
3. Enter `Student Alcohol Consumption` as the title and `395` as the record count.
4. Enter `2008` for the dataset’s original authors’ publication year. This is different from the date you published your dashboard or added the card.
5. Take a screenshot of the dashboard in your browser and upload it as PNG, JPG, or WebP, up to 3 MB. A landscape image works best; the card shows its upper section.
6. Save the card.

The URL is enough to connect/open the dashboard, but the title, records, and original dataset publication date are entered manually. Website screenshots are also uploaded manually. This version does not scrape Streamlit metadata or automatically photograph websites.

Use “Not reported” when a dataset’s original publication date is unknown. Enter a year, month/year, or full date only when supported by the source.

## 4. Publish to Vercel through GitHub

1. Create a GitHub repository, for example `the-data-stand`.
2. Upload the **contents** of this folder. `vercel.json` and `package.json` should be at the repository root; `public` and `supabase` are folders beside them. Do not upload the ZIP itself.
3. At https://vercel.com/new, import that repository.
4. Use **Framework Preset: Other**. No build command is needed. `vercel.json` sets **Output Directory: public**.
5. Deploy, then open the resulting URL.
6. In Supabase Auth’s URL configuration, set the Site URL to your deployed Vercel URL. The app uses password sign-in rather than an email redirect, but keeping the URL correct helps future recovery/auth flows.
7. Add your first card, sign out, and check the page in a private/incognito window. The card should be visible, and Add/Edit/Remove controls should be absent. Sign in again to check editing.

Card changes are stored in Supabase and appear for other visitors on reload, without rebuilding or committing to GitHub. Changes to the website’s code are published through GitHub → Vercel. Updates to each analysis remain GitHub → Streamlit.

The card list is intentionally not a Streamlit app: it is a plain HTML/CSS/JavaScript site hosted on Vercel.

## 5. Files

```text
the-data-stand/
├── public/
│   ├── index.html       Page and forms
│   ├── style.css        Folder cards and responsive layout
│   ├── app.js           Rendering, owner sign-in, CRUD, uploads
│   ├── model.js         Validation and filtering
│   ├── config.js        Public Supabase connection values
│   └── favicon.svg
├── supabase/setup.sql   Database, storage, and owner policies
├── tests/model.test.js
├── package.json
├── vercel.json
└── README.md
```

## Checks performed

- Node syntax check for app.js.
- Four automated checks for URL restrictions, form data validation, sorting/filtering, and image URL handling. Run `npm test` with Node 20+.
- Browser checks in the local demo: card creation, renaming, removal, search with no results, and persistence after reload.
- Live Supabase sign-in, storage, row policies, and Vercel deployment still require verification after setup. No credentials or project connection were supplied during development.

## Troubleshooting

- **Still says Design preview:** both configuration values are empty. Fill them in and reload.
- **Unable to load collection:** check the project URL/public key, project availability, browser connectivity, and whether the SQL ran successfully.
- **Account does not have owner access:** add its exact auth user ID to `public.admins` using the query above.
- **Permission denied or row-level security error:** check the signed-in user’s membership. Keep the row policies enabled.
- **Image upload fails:** confirm `previews` exists, is public, and has the policies from the setup script. Use PNG/JPG/WebP up to 3 MB.
- **Dashboard link rejected:** use the public Streamlit Community Cloud URL ending in `.streamlit.app`.
- **Fonts do not load:** the design falls back to Arial/system fonts. Google Fonts and the Supabase SDK CDN require internet access.
- **Changed cards are not immediately visible in another open tab:** refresh that tab. This version does not subscribe to live updates.
- **Deleting/replacing a screenshot left a file behind:** a failed cleanup is reported. Remove the unused file in Supabase Storage; your saved card is kept.

## References

- Streamlit sharing: https://docs.streamlit.io/deploy/streamlit-community-cloud/share-your-app
- Supabase JavaScript client: https://supabase.com/docs/reference/javascript/installing
- Supabase row-level security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel GitHub deployment: https://vercel.com/docs/git/vercel-for-github
