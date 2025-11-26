// api/utr_snapshot.js
//
// UTR Snapshot Proxy for TIA Coaching Hub
// - No Authorization header required from the frontend
// - CORS-friendly for Base44
// - Uses server-side env vars to call UTR's API
//
// Required env vars in Vercel:
//   UTR_API_BASE      → e.g. "https://api.utrsports.net/v2"
//   UTR_ACCESS_TOKEN  → Bearer token for UTR API (from OAuth or API key)

import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    // Allow Coaching Hub / Base44 frontend to call this server
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }

    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const utrId = req.query.utrId;

    if (!utrId) {
      return res.status(400).json({ error: "Missing utrId parameter" });
    }

    const API_BASE = (process.env.UTR_API_BASE || "").trim();
    const ACCESS_TOKEN = (process.env.UTR_ACCESS_TOKEN || "").trim();

    if (!API_BASE) {
      return res.status(500).json({
        error: "Missing UTR_API_BASE",
        message:
          "Set UTR_API_BASE in Vercel (e.g. https://api.utrsports.net/v2).",
      });
    }

    if (!ACCESS_TOKEN) {
      return res.status(500).json({
        error: "Missing UTR_ACCESS_TOKEN",
        message:
          "Set UTR_ACCESS_TOKEN in Vercel to a valid UTR API bearer token.",
      });
    }

    // Build URL – adjust path if UTR docs specify a different snapshot endpoint
    const base = API_BASE.replace(/\/$/, "");
    const snapshotUrl = `${base}/players/${encodeURIComponent(
      utrId
    )}/rating`;

    const utrResp = await fetch(snapshotUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        Accept: "application/json",
      },
    });

    const raw = await utrResp.text();
    let data = null;

    // Try to parse JSON if possible
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch (e) {
      // UTR returned non-JSON (HTML/error page/etc.)
      return res.status(utrResp.status || 500).json({
        error: "UTR API returned non-JSON response",
        status: utrResp.status,
        raw,
      });
    }

    // Non-200 from UTR
    if (!utrResp.ok) {
      return res.status(utrResp.status || 400).json({
        error: "UTR API error",
        status: utrResp.status,
        details: data,
      });
    }

    // Standardized shape for the Coaching Hub / Base44
    return res.status(200).json({
      utr_id: utrId,
      rating: data?.rating ?? data?.currentRating ?? null,
      provisional: data?.provisional ?? data?.isProvisional ?? null,
      reliability: data?.reliability ?? null,
      last_updated: data?.lastUpdated ?? null,
      raw: data,
    });
  } catch (err) {
    return res.status(500).json({
      error: "Snapshot failed",
      message: err.message || "Unknown error",
    });
  }
}
