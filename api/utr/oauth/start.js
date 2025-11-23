// api/utr/oauth/start.js
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

  const clientId = process.env.UTR_CLIENT_ID;
  const redirectUri = process.env.UTR_REDIRECT_URI;
  const authBase = process.env.UTR_AUTH_BASE; 
  // example: https://app.utrsports.net/oauth/authorize  (UTR will give you exact)

  if (!clientId || !redirectUri || !authBase) {
    return res.status(500).json({
      error: "Missing UTR_CLIENT_ID, UTR_REDIRECT_URI, or UTR_AUTH_BASE in env"
    });
  }

  // optional: pass through a state param for security
  const state = Math.random().toString(36).slice(2);

  const url =
    `${authBase}` +
    `?response_type=code` +
    `&client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent("read")}` +
    `&state=${encodeURIComponent(state)}`;

  logReq(req, { type: "oauth_start" });

  res.writeHead(302, { Location: url });
  res.end();
}
