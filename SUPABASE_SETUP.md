# Supabase Setup Guide

This guide explains how to set up Supabase for NextUp authentication.

## Prerequisites

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project in Supabase

## Database Setup

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase_migration.sql` into the SQL editor
4. Run the migration script

This will create:

- `users` table - extends Supabase's built-in `auth.users` with additional data (Trakt token)
- `sessions` table - tracks active sessions for multi-device support
- Row Level Security (RLS) policies
- Triggers for automatic user record creation and timestamp updates

**Important:** Passwords are NOT stored in the custom `users` table. Supabase Auth automatically manages passwords (hashed and secured) in the built-in `auth.users` table. Our custom `users` table only stores additional data like the Trakt token. The `id` column references `auth.users(id)` via foreign key.

## Configuration

1. Go to your Supabase project dashboard
2. In the left sidebar, click on **Settings**
3. Click on **API** in the settings menu
4. You should see:
   - **Project URL** - copy this value
   - **API Keys** section with two options:
     - **New API Keys** (publishable/secret) - Supabase's new key system
     - **Legacy API Keys** (anon/service_role) - the old key system
5. In the **API Keys** section, look for **Publishable key** (or click "Create new API Keys" if you don't see any)
6. Copy the **Publishable key** - this is the new equivalent of the old "anon" key
7. Copy the **Project URL** from the top of the page

### Setting up Environment Variables

The Supabase configuration is now fetched from Netlify environment variables (just like `TRAKT_CLIENT_ID`).

1. Go to your Netlify dashboard
2. Navigate to your site → **Site settings** → **Environment variables**
3. Add the following environment variables:
   - `SUPABASE_URL` - Your Supabase Project URL
   - `SUPABASE_ANON_KEY` - Your Supabase Publishable key (new) or anon key (legacy)

## Email Configuration (Optional)

By default, Supabase requires email verification. To disable this for development:

1. Go to **Authentication** → **Settings** in your Supabase dashboard
2. Under **Email Auth**, you can configure email templates and verification settings

## Testing

1. Start your application
2. You should see a login/register form
3. Register a new account
4. Check your email for verification (if enabled)
5. Login with your credentials

## Connecting Trakt Account

After logging in, users can connect their Trakt account by:

1. The app will handle Trakt OAuth redirects
2. The Trakt token will be automatically saved to the `users` table

## Security Notes

- The `anon` key is safe to use in client-side code (it's protected by RLS policies)
- Never commit your Supabase keys to version control
- Consider using environment variables or Netlify environment variables for production
