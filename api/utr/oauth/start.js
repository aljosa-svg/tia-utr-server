// api/utr/oauth/start.js
import { rateLimit, logReq } from "../../_utils.js";

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

  if (!clientId || !redirectUri || !authBase) {
    return res.status(500).json({
      error: "Missing UTR_CLIENT_ID, UTR_REDIRECT_URI, or UTR_AUTH_BASE in env"
    });
  }

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
