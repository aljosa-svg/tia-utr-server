// api/utr/oauth/callback.js
import { rateLimit, logReq } from "../_utils.js";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!rateLimit(req, res)) return;

  const url = new URL(req.url, `https://${req.headers.host}`);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code) {
    return res.status(400).json({ error: "Missing ?code from UTR OAuth" });
  }

  const clientId = process.env.UTR_CLIENT_ID;
  const clientSecret = process.env.UTR_CLIENT_SECRET;
  const redirectUri = process.env.UTR_REDIRECT_URI;
  const tokenUrl = process.env.UTR_TOKEN_URL;

  if (!clientId || !clientSecret || !redirectUri || !tokenUrl) {
    return res.status(500).json({
      error: "Missing UTR env vars: UTR_CLIENT_ID, UTR_CLIENT_SECRET, UTR_REDIRECT_URI, UTR_TOKEN_URL"
    });
  }

  logReq(req, { type: "oauth_callback", code, state });

  try {
    const resp = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri
      })
    });

    const json = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: "UTR token exchange failed",
        body: json
      });
    }

    // Return token payload to Base44 app frontend
    return res.status(200).json(json);

  } catch (err) {
    console.error("OAuth callback error:", err);
    return res.status(500).json({
      error: "Server error",
      message: err.message
    });
  }
}
