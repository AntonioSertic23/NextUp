import fetch from "node-fetch";

const BASE_URL = "https://api.trakt.tv";

export const handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Parse token from request body
  const { token } = JSON.parse(event.body);

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'token' in request body." }),
    };
  }

  // TODO: Dohvatiti samo nove epizode preko next_episode ili tako nešto...

  const watchedRes = await fetch(`${BASE_URL}/users/me/watched/shows`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "trakt-api-version": "2",
      "trakt-api-key": process.env.TRAKT_CLIENT_ID,
      "Content-Type": "application/json",
      "User-Agent": "NextUp/1.0.0",
    },
  });

  if (watchedRes.ok) {
    const watchedData = await watchedRes.json();

    // TEST only, obrisati nakon što se napravi spremanje u bazu i vratiti samo statusCode
    return { statusCode: 200, body: JSON.stringify(watchedData) };
  }

  return {
    statusCode: 200,
  };
};

export const config = {
  schedule: "0 5 * * *",
};
