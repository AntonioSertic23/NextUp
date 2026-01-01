/**
 * Netlify serverless function to provide Supabase configuration.
 * @async
 * @function handler
 * @returns {Promise<object>} Response object containing statusCode and JSON body with Supabase URL and anon key.
 *
 * These values are safe to expose to the frontend (anon key is public by design).
 */
export async function handler() {
  return {
    statusCode: 200,
    body: JSON.stringify({
      url: process.env.SUPABASE_URL,
      anonKey: process.env.SUPABASE_ANON_KEY,
    }),
  };
}
