# Setting up the site

You will need about 30 minutes, the wedding Google account and a GitHub account. Nothing here costs money.

## 1. Create the Sheet and the script

1. Signed in to the wedding account, create a new Google Sheet and name it something like `Wedding RSVP`.
2. In the Sheet, choose **Extensions > Apps Script**.
3. Replace everything in the editor's `Code.gs` with the contents of [apps-script/Code.gs](apps-script/Code.gs).
4. Click **+** next to Files, choose **Script**, name it `Core`, and paste in the contents of [apps-script/Core.gs](apps-script/Core.gs).
5. Save. Choose `setupSheet` in the function menu at the top and click **Run**. Google will ask for permission the first time. If it warns that the app isn't verified, that's expected for your own script: click **Advanced**, then **Go to (project name)**, then **Allow**.

The Sheet now has **Guests**, **Responses** and **Log** tabs. You can delete the empty `Sheet1`.

## 2. Add your guests

Fill in the **Guests** tab, one row per person. Give everyone in a household the same Household value; any short label works.

| Household | Full name    | Alias |
| --------- | ------------ | ----- |
| H1        | Jane Example |       |
| H1        | John Example |       |
| H1        | Janey Smith  | yes   |
| H2        | Sam Sample   |       |

- **Leave Alias blank for real people.** They appear on the RSVP form.
- **Alias rows** are for nicknames or other spellings. Type anything in the Alias column (`yes` is fine) and give the row the household it belongs to. Typing that name opens the household, but it never appears as a person on the form.
- **Every name and alias must be unique across the whole list.** If two guests share a name, a lookup opens whichever household comes first, so tell them apart, for example with a middle name.

You can change this tab at any time. Changes take effect straight away.

Leave **Responses** and **Log** to the site. You can sort and filter them, and you can add your own columns to the right of the existing ones. Don't rename the tabs or reorder their columns.

## 3. Deploy the web app

1. In Apps Script, click **Deploy > New deployment**, then the gear icon, then **Web app**.
2. Set **Execute as** to **Me** and **Who has access** to **Anyone**. The second setting doesn't open the Sheet; it only lets the site call the script.
3. Click **Deploy** and copy the **Web app URL**, which ends in `/exec`.
4. Paste it between the quotes in [assets/js/config.js](assets/js/config.js).

If you ever change the script, use **Deploy > Manage deployments**, edit the deployment and choose **New version**. That keeps the same URL.

## 4. Publish on GitHub Pages

1. Create a new **public** repository named `rochelle-and-alex-2028`. Free GitHub Pages needs a public repository, so everything in this folder can be read by anyone. The guest list and responses are safe in the Sheet.
2. In this folder, commit the web app URL you pasted in step 3:

   ```bash
   git add assets/js/config.js
   ```

   ```bash
   git commit -m "Set the web app URL"
   ```

3. Push the folder to GitHub, using your own username:

   ```bash
   git remote add origin https://github.com/YOUR-USERNAME/rochelle-and-alex-2028.git
   ```

   ```bash
   git push -u origin main
   ```

4. In the repository choose **Settings > Pages**, set the source to **Deploy from a branch**, then pick `main` and `/ (root)`.
5. After a minute or two, the site is at `https://YOUR-USERNAME.github.io/rochelle-and-alex-2028/`.

## 5. Check it works

The rules are covered by automated tests, but the link to the Sheet can only be checked by hand. On the live site, using a real guest row:

- [ ] A correct name opens the household, and a wrong name shows the friendly message.
- [ ] An alias opens the household and doesn't appear as a person.
- [ ] Submitting shows the confirmation, adds one row per person to **Responses** and adds the same to **Log**.
- [ ] Looking up again shows the saved answers. Changing and resubmitting updates the same **Responses** rows and adds new **Log** rows.
- [ ] Typing `=1+1` in a dietary box shows up in the Sheet as the text `=1+1`, not `2`.
- [ ] The whole thing works on a phone.

Then clear the test rows from **Responses** and **Log**, keeping the header rows.

## 6. Before you share the link

- **Fill in the info page.** Everything still to do is in one marked area of [info.html](info.html). Search for `TODO`; each one shows on the page as a dashed coral box until you replace it.
- **Change the hero or photo (optional).** The hero illustration is `assets/img/hero-desktop-*.webp` and `assets/img/hero-portrait-*.webp`, and the postcard photo is `assets/img/ro-al-01.webp`. Replace a file with one of the same size and name.

These edits only reach the live site once you commit and push them:

```bash
git add -A
```

```bash
git commit -m "Fill in the wedding details"
```

```bash
git push
```

## Later: a custom domain

Add the domain in **Settings > Pages** and follow GitHub's DNS instructions. All links in the site are relative, so no code needs to change, and the web app URL stays the same.

## Running the tests

With Node.js 22 or newer:

```bash
npm test
```
