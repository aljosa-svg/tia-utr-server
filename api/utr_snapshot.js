// api/utr_snapshot.js
//
// Uses a UTR Engage access_token to fetch the player's ratings.
// TEMP VERSION: reads access_token from query string so we can test easily.
//
// Later we can store tokens per player and remove the token from the URL.

import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    // CORS – allow calls from your Coaching Hub / Base44 app
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");

    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // For now we accept the access_token as a query param for testing.
    const accessToken = req.query.access_token;

    if (!accessToken) {
      return res.status(400).json({
        error: "missing_access_token",
        message: "Pass ?access_token=... in the query string for now.",
      });
    }

    const API_BASE =
      (process.env.UTR_API_BASE ||
        "https://prod-utr-engage-api-data-azapp.azurewebsites.net/api/v1"
      ).replace(/\/$/, "");

    const ratingsUrl = `${API_BASE}/members/ratings`;

    const utrResp = await fetch(ratingsUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    const raw = await utrResp.text();
    let data = null;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch (e) {
      return res.status(utrResp.status || 500).json({
        error: "utr_non_json_response",
        status: utrResp.status,
        raw,
      });
    }

    if (!utrResp.ok) {
      return res.status(utrResp.status || 400).json({
        error: "utr_api_error",
        status: utrResp.status,
        details: data,
      });
    }

    // Shape this however you like – this is a simple example.
    return res.status(200).json({
      ok: true,
      ratings: data,
    });
  } catch (err) {
    return res.status(500).json({
      error: "snapshot_failed",
      message: err.message || "Unknown error",
    });
  }
}
