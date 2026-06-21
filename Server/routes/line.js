const crypto = require("crypto");
const express = require("express");

const router = express.Router();
let latestSources = [];
let latestAt = null;

const verifyLineSignature = (rawBody, signature) => {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelSecret) {
    return { ok: true, skipped: true };
  }

  if (!signature) {
    return { ok: false, message: "Missing LINE signature" };
  }

  const expectedSignature = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");

  const expected = Buffer.from(expectedSignature);
  const actual = Buffer.from(signature);

  if (expected.length !== actual.length) {
    return { ok: false, message: "Invalid LINE signature" };
  }

  if (!crypto.timingSafeEqual(expected, actual)) {
    return { ok: false, message: "Invalid LINE signature" };
  }

  return { ok: true, skipped: false };
};

const getWebhookSources = (events = []) =>
  events.map((event) => ({
    eventType: event.type,
    messageType: event.message?.type || null,
    text: event.message?.type === "text" ? event.message.text : null,
    sourceType: event.source?.type || null,
    userId: event.source?.userId || null,
    groupId: event.source?.groupId || null,
    roomId: event.source?.roomId || null,
  }));

router.get("/latest-source", (req, res) => {
  const groupSource = latestSources.find((source) => source.groupId);

  res.json({
    latestAt,
    lineToId: groupSource?.groupId || null,
    sources: latestSources,
  });
});

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from("{}");

    let body;

    try {
      body = JSON.parse(rawBody.toString("utf8") || "{}");
    } catch (error) {
      return res.status(400).json({ message: "Invalid LINE webhook payload" });
    }

    if (Array.isArray(body.events) && body.events.length === 0) {
      return res.json({ ok: true, sources: [] });
    }

    const signatureCheck = verifyLineSignature(
      rawBody,
      req.get("x-line-signature")
    );

    if (!signatureCheck.ok) {
      return res.status(401).json({ message: signatureCheck.message });
    }

    const sources = getWebhookSources(body.events);
    const groupSource = sources.find((source) => source.groupId);
    latestSources = sources;
    latestAt = new Date().toISOString();

    console.log("[LINE Webhook] sources:", JSON.stringify(sources, null, 2));

    if (groupSource) {
      console.log(`[LINE Webhook] Copy to .env: LINE_TO_ID=${groupSource.groupId}`);
    }

    return res.json({
      ok: true,
      signatureVerified: !signatureCheck.skipped,
      sources,
    });
  }
);

module.exports = router;
