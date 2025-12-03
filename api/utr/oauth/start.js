// api/utr/oauth/start.js
//
// Start the UTR Engage OAuth flow.
// Sends the user to the Engage API authorize endpoint, NOT app.utrsports.net.
//

import crypto from "crypto";

export default async function handler(req, res) {
  try {
    const clientId = process.env.UTR_CLIENT_ID;
    const redirectUri = process.env.UTR_REDIRECT_URI;
    const authBase = (process.env.UTR_AUTH_BASE ||
      "https://prod-utr-engage-api-data-azapp.azurewebsites.net/api/v1"
    ).replace(/\/$/, "");

    if (!clientId || !redirectUri) {
      return res.status(500).json({
        error: "missing_config",
        message: "UTR_CLIENT_ID or UTR_REDIRECT_URI is not configured",
      });
    }

    // Random state for safety/debugging
    const state =
      (req.query.state && String(req.query.state)) ||
      crypto.randomBytes(16).toString("hex");

    // For now, just use a test ID. Later this can be your internal player ID.
    const thirdPartyUserId =
      (req.query.third_party_user_id && String(req.query.third_party_user_id)) ||
      "tia-test-user-1";

    // Engage API authorize URL (Dave’s domain)
    const authorizeUrl =
      `${authBase}/oauth/authorize` +
      `?response_type=code` +
      `&client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&third_party_user_id=${encodeURIComponent(thirdPartyUserId)}` +
      `&approval_prompt=force` +
      `&scope=${encodeURIComponent("ratings,profile,results")}` +
      `&state=${encodeURIComponent(state)}`;

    // Send browser to UTR
    res.writeHead(302, { Location: authorizeUrl });
    res.end();
  } catch (err) {
    console.error("[UTR OAuth Start] error", err);
    res.status(500).json({
      error: "oauth_start_failed",
      message: err.message || "Unknown error",
    });
  }
}
