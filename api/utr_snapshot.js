// api/utr_snapshot.js
//
// Unified UTR Snapshot Proxy for TIA Coaching Hub
// No bearer token required from the frontend.
// Uses your internal env vars & OAuth token to call UTR API securely.
//

import fetch from "node-fetch";

export default async function handler(req, res) {
  try {
    // Allow Base44 frontend to make direct browser calls
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Handle preflight
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

    // UTR API endpoint (player snapshot)
    const SNAPSHOT_URL = `${process.env.UTR_API_BASE}/players/${utrId}/rating`;

    // Make request to UTR API using OAuth token
    const utrResp = await fetch(SNAPSHOT_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${process.env.UTR_ACCESS_TOKEN}`,
        Accept: "application/json",
      },
    });

    const data = await utrResp.json();

    if (!utrResp.ok) {
      return res.status(400).json({
        error: "UTR API error",
        details: data,
      });
    }

    // Standardize the response shape for Base44
    return res.status(200).json({
      utr_id: utrId,
      rating: data?.currentRating ?? null,
      reliability: data?.reliability ?? null,
      singles: data?.singles ?? null,
      doubles: data?.doubles ?? null,
      provisional: data?.isProvisional ?? null,
      last_updated: data?.lastUpdated ?? null,
      raw: data, // helpful for debugging
    });

  } catch (err) {
    return res.status(500).json({
      error: "Snapshot failed",
      message: err.message || "Unknown error",
    });
  }
}
