// api/utr/oauth/callback.js

import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    const code = req.query.code;
    const stateRaw = req.query.state || null;

    if (!code) {
      return res.status(400).json({ error: "Missing code" });
    }

    // 1) Exchange authorization code for tokens
    const tokenResp = await fetch(process.env.UTR_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.UTR_REDIRECT_URL,
        client_id: process.env.UTR_CLIENT_ID,
        client_secret: process.env.UTR_CLIENT_SECRET,
      }),
    });

    const tokens = await tokenResp.json();

    if (!tokenResp.ok) {
      return res.status(400).json(tokens);
    }

    // 2) Fetch "me" to get UTR user id (optional)
    let me = null;
    try {
      const meResp = await fetch(process.env.UTR_ME_PATH, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      me = await meResp.json();
    } catch (e) {}

    const payload = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
      utr_user_id: me?.id || me?.user?.id || null,
      state: stateRaw,
    };

    const accept = (req.headers.accept || "").toLowerCase();
    const wantsHtml = accept.includes("text/html");

    if (wantsHtml) {
      // Popup HTML for Base44 integration
      res.setHeader("Content-Type", "text/html");
      return res.status(200).send(`
<!doctype html>
<html>
  <head><title>UTR Connected</title></head>
  <body>
    <script>
      (function () {
        var payload = ${JSON.stringify(payload)};
        if (window.opener) {
          window.opener.postMessage({ type: "UTR_OAUTH_SUCCESS", payload: payload }, "*");
        }
        window.close();
      })();
    </script>
    Connected. You can close this window.
  </body>
</html>
      `);
    }

    // JSON fallback for API tools
    return res.status(200).json(payload);

  } catch (err) {
    return res.status(500).json({ error: err.message || "Callback failed" });
  }
}
