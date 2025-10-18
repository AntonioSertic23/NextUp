/**
 * Netlify serverless function to provide the Trakt Client ID.
 * @async
 * @function handler
 * @returns {Promise<object>} Response object containing statusCode and JSON body with the clientId.
 *
 * The clientId is safe to expose to the frontend and is used for initiating OAuth login with Trakt.
 */
export async function handler() {
  return {
    statusCode: 200,
    body: JSON.stringify({ clientId: process.env.TRAKT_CLIENT_ID }),
  };
}
