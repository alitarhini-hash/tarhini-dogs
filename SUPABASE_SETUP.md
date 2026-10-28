# Connect the private Tarhini’s Dogs owner desk

The site stays on GitHub Pages. Supabase supplies the shared database, photo storage, and email-link sign-in for the owner desk.

## One-time setup

1. Create a Supabase project at [supabase.com/dashboard](https://supabase.com/dashboard). Save the database password somewhere private; it is not needed in this website or in chat.
2. In the project, open **SQL Editor**, create a query, paste all of `supabase/schema.sql`, and run it. It creates the tables, starter menu/team rows, photo bucket, and row-level security policies.
3. Open **Project Settings → API Keys** (or the project **Connect** dialog). Copy the **Project URL** and the **publishable key**. Do not use or share a secret/service-role key.
4. Put those two values into `supabase-config.js`:

   ```js
   window.TARHINI_SUPABASE = {
     url: "https://YOUR-PROJECT-REF.supabase.co",
     publishableKey: "sb_publishable_...",
     bucket: "store-media"
   };
   ```

5. In Supabase, open **Authentication → URL Configuration** and add this exact site URL to **Redirect URLs**:

   `https://alitarhini-hash.github.io/tarhini-dogs/admin.html`

   Keep the site URL set to `https://alitarhini-hash.github.io/tarhini-dogs/`.
6. Commit and push `supabase-config.js` with the rest of the project. The publishable key is intended for browser use; the database policies restrict editing to `alloushi.tarhini@gmail.com`.
7. Open [the owner desk](https://alitarhini-hash.github.io/tarhini-dogs/admin.html), request a sign-in link for `alloushi.tarhini@gmail.com`, and open the email link in the same browser.

## What the owner desk edits

- Menu items: names and descriptions in English/Arabic, category, price, icon, visibility, sold-out state, and food photos.
- Staff profiles: bilingual names and roles, photos, and visibility.
- Store details: phone, WhatsApp, email, address, hours, and map directions.

The public site reads the shared content when it loads. If the Supabase project is not connected yet, it keeps showing its current built-in content.

## Access and keys

The SQL only permits database writes and photo uploads for the owner email above. Public visitors can read the active public menu, staff, store details, and public photos. Never paste a database password or secret/service-role key into `supabase-config.js`, the repository, or chat.
