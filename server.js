const express = require("express");
const path = require("path");
const emptyRouter = require("./routes/empty");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "venueflow" });
});

app.use("/api/empty", emptyRouter);

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`VenueFlow is running at http://localhost:${PORT}`);
});
