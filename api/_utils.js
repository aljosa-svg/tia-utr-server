// api/_utils.js
const bucket = new Map();

export function getIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
}

export function rateLimit(req, res, { windowMs = 60_000, max = 30 } = {}) {
  const ip = getIp(req);
  const now = Date.now();
  const key = `${ip}`;

  const entry = bucket.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }

  entry.count += 1;
  bucket.set(key, entry);

  if (entry.count > max) {
    res.status(429).json({
      error: "Rate limit exceeded. Try again in a minute."
    });
    return false;
  }

  return true;
}

export function logReq(req, extra = {}) {
  const ip = getIp(req);
  const ua = req.headers["user-agent"] || "";
  console.log(
    JSON.stringify({
      t: new Date().toISOString(),
      path: req.url,
      ip,
      ua,
      ...extra
    })
  );
}
