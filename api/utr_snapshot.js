// api/utr_snapshot.js
//
// Uses a UTR Engage access_token from environment variables to fetch the player's ratings
// by UTR ID. This matches the UTR_ACCESS_TOKEN we just set in Vercel.

import fetch from "node-fetch";

export default async function handler(req, res) {
  // Allow calls from your Coaching Hub / Base44 app
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const accessToken = process.env.UTR_ACCESS_TOKEN;
    if (!accessToken) {
      return res.status(500).json({
        error: "missing_access_token",
        message:
          "Set UTR_ACCESS_TOKEN in Vercel to a valid UTR Engage access token."
      });
    }

    const utrId = req.query.utrId;
    if (!utrId) {
      return res.status(400).json({ error: "missing_utrId" });
    }

    const apiBase =
      process.env.UTR_API_BASE || "https://app.utrsports.net/api/v1";

    const snapshotUrl = `${apiBase}/members/ratings?utrId=${encodeURIComponent(
      utrId
    )}`;

    const utrRes = await fetch(snapshotUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });

    const json = await utrRes.json().catch(() => null);

    if (!utrRes.ok) {
      return res.status(utrRes.status).json({
        error: "utr_api_error",
        status: utrRes.status,
        details: json
      });
    }

    // Pass the ratings JSON straight back to your app
    return res.status(200).json(json);
  } catch (e) {
    console.error("[utr_snapshot] error:", e);
    return res
      .status(500)
      .json({ error: "server_error", message: e.message || "Unknown error" });
  }
}
