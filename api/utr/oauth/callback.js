// api/utr/oauth/callback.js
//
// Handles the redirect back from UTR Engage.
// Exchanges ?code=... for access + refresh tokens via /oauth/token.

import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const oauthError = req.query.error;

    // If UTR sent back an error instead of a code
    if (oauthError) {
      return res.status(400).json({
        error: "utr_oauth_error",
        utr_error: oauthError,
        description: req.query.error_description || null,
      });
    }

    if (!code) {
      return res.status(400).json({ error: "Missing code" });
    }

    const tokenUrl =
      process.env.UTR_TOKEN_URL ||
      "https://prod-utr-engage-api-data-azapp.azurewebsites.net/api/v1/oauth/token";

    const clientId = process.env.UTR_CLIENT_ID;
    const clientSecret = process.env.UTR_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({
        error: "missing_config",
        message: "UTR_CLIENT_ID or UTR_CLIENT_SECRET is not configured",
      });
    }

    // Per docs: POST body with client_id, client_secret, code, grant_type
    const body = {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    };

    const tokenResp = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await tokenResp.text();
    let data = null;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch (e) {
      // UTR returned something that isn’t JSON
      return res.status(tokenResp.status || 500).json({
        error: "token_parse_failed",
        status: tokenResp.status,
        raw,
      });
    }

    if (!tokenResp.ok) {
      return res.status(tokenResp.status || 400).json({
        error: "utr_token_error",
        status: tokenResp.status,
        details: data,
      });
    }

    // For now, just show what we got back so we can confirm it works.
    // Later we will save access_token + refresh_token per player.
    return res.status(200).json({
      ok: true,
      tokens: data,
    });
  } catch (err) {
    console.error("[UTR OAuth Callback] error", err);
    return res.status(500).json({
      error: "callback_failed",
      message: err.message || "Unknown error",
    });
  }
}
