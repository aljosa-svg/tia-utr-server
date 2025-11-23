// api/utr_snapshot.js
import { rateLimit, logReq } from "./_utils.js";

export default async function handler(req, res) {
  // Allow Base44 frontend to call this server
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!rateLimit(req, res)) return;

  const token = req.headers["authorization"]?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Missing Bearer token" });
  }

  const UTR_API_BASE = process.env.UTR_API_BASE;
  const UTR_ME_PATH = process.env.UTR_ME_PATH;

  if (!UTR_API_BASE || !UTR_ME_PATH) {
    return res.status(500).json({
      error: "UTR_API_BASE or UTR_ME_PATH not configured on server"
    });
  }

  try {
    logReq(req, { type: "utr_snapshot" });

    const upstream = await fetch(`${UTR_API_BASE}${UTR_ME_PATH}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({
        error: "Upstream UTR API error",
        status: upstream.status,
        body: text
      });
    }

    const data = await upstream.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error("UTR snapshot error:", err);
    return res.status(500).json({
      error: "Server error",
      message: err.message
    });
  }
}
