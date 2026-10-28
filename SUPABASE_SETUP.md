# Connect the private Tarhini’s Dogs owner desk

The site stays on GitHub Pages. Supabase supplies the shared database, photo storage, and email-link sign-in. The public repository contains no owner email or private database key.

## One-time setup

1. Create a Supabase project at [supabase.com/dashboard](https://supabase.com/dashboard). Keep the database password private; the website does not need it.
2. In **SQL Editor**, paste and run all of `supabase/schema.sql`. It creates the tables, starter menu/team rows, public photo bucket, and row-level security policies.
3. In **Project Settings → API Keys** or the **Connect** dialog, copy the Project URL and **publishable key**. Never use a secret/service-role key in the website.
4. Put those values into `supabase-config.js`:

   ```js
   window.TARHINI_SUPABASE = {
     url: "https://YOUR-PROJECT-REF.supabase.co",
     publishableKey: "sb_publishable_...",
     bucket: "store-media"
   };
   ```

5. In **Authentication → URL Configuration**, add this Redirect URL:

   `https://alitarhini-hash.github.io/tarhini-dogs/admin.html`

   Set Site URL to `https://alitarhini-hash.github.io/tarhini-dogs/`.
6. Commit and push `supabase-config.js`. The publishable key is intended for browser use; row-level security controls writes.
7. Open [the owner desk](https://alitarhini-hash.github.io/tarhini-dogs/admin.html), enter your email, request a sign-in link, and open it in the same browser. This first sign-in creates your Auth user; it does not grant editing access yet.
8. In Supabase, open **Authentication → Users** and copy your user UUID. In **SQL Editor**, run this statement after replacing the placeholder with that UUID:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"store_owner": true}'::jsonb
   where id = 'PASTE-YOUR-USER-UUID-HERE';
   ```

9. Sign out of the owner desk, request another sign-in link, and sign in again. Supabase puts the owner role in your session; the database checks it on every write and photo upload.

## What the owner desk edits

- Menu items: English/Arabic names and descriptions, category, price, icon, visibility, sold-out state, and food photos.
- Staff profiles: names and roles in both languages, photos, and visibility.
- Store details: phone, WhatsApp, email, address, opening hours, and map directions.

The public site loads shared content from Supabase. Until the project is connected, it keeps showing the current built-in content.

## Security

Public visitors can read active menu items, active staff profiles, store details, and public photos. Only a Supabase user whose server-controlled `app_metadata.store_owner` value is `true` can edit or upload. Never put a database password or secret/service-role key in the repository or chat.
