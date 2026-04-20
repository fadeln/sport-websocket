import express from "express";
import http from "http";
import { matchRouter } from "./routes/matches.js";
import { attachWebSocketServer } from "./ws/server.js";

const PORT = parseInt(process.env.PORT || "8000", 10);
const HOST = process.env.HOST || "0.0.0.0";

// Validate PORT
if (isNaN(PORT) || PORT < 1 || PORT > 65535 || !Number.isInteger(PORT)) {
  console.error(`Invalid PORT: ${process.env.PORT}. PORT must be an integer between 1 and 65535.`);
  process.exit(1);
}

const app = express();
const server = http.createServer(app);

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from the Express server!");
});

app.use("/matches", matchRouter);

const { broadcastMatchCreated } = attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`Server is running a ${baseUrl}`);
  console.log(`WebSocket Server is running on ${baseUrl.replace('http','ws')}/ws`);
});