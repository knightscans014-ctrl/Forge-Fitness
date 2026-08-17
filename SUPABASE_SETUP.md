# 🔧 Supabase Setup Guide for Forge Fitness

Follow these steps to connect your Supabase project to the Forge Fitness app.

## Step 1: Get Your Supabase Credentials

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Click on your project
3. Go to **Settings** (gear icon in sidebar) → **API**
4. Copy these two values:
   - **Project URL** (looks like: `https://xxxxxxxxxxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## Step 2: Update Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

3. Add your Fampay UPI details:

```env
EXPO_PUBLIC_FAMPAY_UPI_ID=yourname@fam
EXPO_PUBLIC_FAMPAY_NAME=Your Name
```

## Step 3: Run Database Schema

1. In your Supabase dashboard, go to **SQL Editor** (sidebar)
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste it into the SQL editor
5. Click **Run** to execute

This will create all necessary tables:
- `profiles` - User profiles
- `save_state` - Game progress
- `leaderboard` - XP rankings
- `guilds` & `guild_members` - Social features
- `payments` - UPI payment tracking
- `premium_entitlements` - Premium access control
- `admins` - Admin user list

## Step 4: Configure Authentication

1. Go to **Authentication** → **Providers** in Supabase
2. Enable **Email** provider (it's enabled by default)
3. (Optional) Enable **Google** provider:
   - Click Google → Enable
   - Follow Google OAuth setup instructions
   - Add your callback URL

## Step 5: Add Your Email as Admin

1. In Supabase SQL Editor, run:

```sql
INSERT INTO public.admins (email) VALUES ('your-email@example.com');
```

Replace with your actual email address. This allows you to:
- Approve/reject UPI payments
- Grant premium access manually
- Manage the admin panel

## Step 6: Test the Connection

1. Restart your Expo development server:
   ```bash
   npm start
   ```

2. The app should now connect to Supabase
3. Try signing up with an email/password
4. Check Supabase dashboard → **Authentication** → **Users** to see new users

## Step 7: Configure Row Level Security (RLS)

The schema already includes RLS policies, but verify they're enabled:

1. Go to **Authentication** → **Policies** in Supabase
2. Ensure policies are enabled for all tables
3. The schema creates these automatically:
   - Users can only read/write their own data
   - Premium entitlements are read-only for users
   - Admins can manage payments via secure functions

## Troubleshooting

### "Supabase not configured" warning
- Check that `.env` file exists in project root
- Verify `EXPO_PUBLIC_` prefix is used (required for Expo)
- Restart the Expo server after changing `.env`

### Authentication not working
- Verify your Supabase URL and anon key are correct
- Check that Email provider is enabled in Supabase
- Look for errors in Expo console logs

### Database tables missing
- Re-run the `schema.sql` file in Supabase SQL Editor
- Check for any error messages in the SQL output

## Next Steps

After Supabase is working:
1. Test user registration and login
2. Verify game progress saves to `save_state` table
3. Set up payment verification workflow
4. Deploy edge functions if needed

## Security Notes

- Never commit your `.env` file to GitHub (it's in `.gitignore`)
- The `anon` key is safe to use in client apps (RLS protects data)
- All sensitive operations use PostgreSQL functions with `security definer`
- Users cannot self-grant premium - only admins can approve payments

---

Need help? Check the Supabase docs: https://supabase.com/docs
