// CRAZYDROPS server: serves the site and speaks any typed DJ name in the main voice.
// Needs env vars: FISH_KEY (fish.audio API key) and MAIN_VOICE_MODEL_ID (your voice model id).
import express from "express";
import { fileURLToPath } from "url";
import path from "path";
const dir = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "20kb" }));
app.get("/", (_, r) => r.sendFile(path.join(dir, "CRAZYDROPS.html")));
const hits = new Map(), PER_DAY = +process.env.DROPS_PER_IP_DAY || 40; // protects your API bill
app.post("/drop-voice", async (q, r) => {
  const day = new Date().toISOString().slice(0, 10) + q.ip, n = (hits.get(day) || 0) + 1;
  hits.set(day, n);
  if (n > PER_DAY) return r.status(429).json({ error: "Daily limit reached" });
  const text = String(q.body.text || "").slice(0, 400);
  if (!text) return r.status(400).json({ error: "No text" });
  try {
    const x = await fetch("https://api.fish.audio/v1/tts", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.FISH_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ text, reference_id: process.env.MAIN_VOICE_MODEL_ID, format: "mp3" }),
    });
    if (!x.ok) return r.status(502).json({ error: "Voice service error " + x.status });
    r.type("audio/mpeg").send(Buffer.from(await x.arrayBuffer()));
  } catch (e) { r.status(502).json({ error: "Voice service unreachable" }); }
});
app.listen(process.env.PORT || 3000, () => console.log("CRAZYDROPS running"));
