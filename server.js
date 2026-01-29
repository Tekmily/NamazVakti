
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.static(path.join(__dirname)));
app.use(express.json());

const textLogPath = path.join(__dirname, "usage.txt");
const detailLogPath = path.join(__dirname, "usage.log");

function appendLine(filePath, line) {
  fs.appendFile(filePath, line + "\n", (err) => {
    if (err) {
      console.error("Log yazılamadı:", filePath, err);
    }
  });
}

app.post("/api/log-usage", (req, res) => {
  const ip =
    req.headers["x-forwarded-for"] ||
    req.connection.remoteAddress ||
    "unknown";

  const now = new Date().toISOString();
  const body = req.body || {};

  const simpleLine = [
    now,
    "IP:",
    ip,
    "EVENT:",
    body.event || "unknown",
    "LANG:",
    body.language || "n/a",
    body.geo && body.geo.lat ? `LAT:${body.geo.lat}` : "",
    body.geo && body.geo.lon ? `LON:${body.geo.lon}` : "",
    body.label ? `LABEL:${body.label}` : ""
  ]
    .filter(Boolean)
    .join(" ");

  appendLine(textLogPath, simpleLine);

  const detailObj = {
    ts: now,
    ip,
    event: body.event || "unknown",
    language: body.language || null,
    userAgent: body.userAgent || null,
    geo: body.geo || null,
    label: body.label || null
  };

  appendLine(detailLogPath, JSON.stringify(detailObj));

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
