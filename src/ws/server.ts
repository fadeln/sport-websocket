import { WebSocket, WebSocketServer } from "ws";
import { wsArcjet } from "../arcjet.js";

const matchSubscribers = new Map();
const socketSubscriptions = new WeakMap<WebSocket, Set<number>>();

function subscribe(matchId: any, socket: any) {
  if (!matchSubscribers.has(matchId)) {
    matchSubscribers.set(matchId, new Set());
  }

  matchSubscribers.get(matchId).add(socket);
}

function unsubscribe(matchId: any, socket: any) {
  const subscribers = matchSubscribers.get(matchId);

  if (!subscribers) return;

  subscribers.delete(socket);

  if (subscribers.size === 0) {
    matchSubscribers.delete(matchId);
  }
}

function cleanupSubscriptions(socket: WebSocket) {
  const subscriptions = socketSubscriptions.get(socket);
  if (subscriptions) {
    for (const matchId of subscriptions) {
      unsubscribe(matchId, socket);
    }
    socketSubscriptions.delete(socket);
  }
}

function sendJson(
  socket: { readyState: number; send: (arg0: string) => void },
  payload: any,
) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

function broadcastToAll(wss: any, payload: any) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
}

function broadcastToMatch(matchId: any, payload: any) {
  const subscribers = matchSubscribers.get(matchId);
  if (!subscribers || subscribers.size === 0) return;

  const message = JSON.stringify(payload);

  for (const client of subscribers) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function handleMessage(socket: WebSocket, data: any) {
  let message;

  try {
    message = JSON.parse(data.toString());
  } catch (e) {
    sendJson(socket, { type: "error", message: "Invalid JSON" });
  }

  if (message?.type === 'subscribe' && Number.isInteger(message.matchId)) {
    subscribe(message.matchId, socket);
    const subscriptions = socketSubscriptions.get(socket) || new Set<number>();
    subscriptions.add(message.matchId);
    socketSubscriptions.set(socket, subscriptions);
    sendJson(socket, { type: "subscribed", matchId: message.matchId });
    return;
  }

  if (message?.type === 'unsubscribe' && Number.isInteger(message.matchId)) {
    unsubscribe(message.matchId, socket);
    const subscriptions = socketSubscriptions.get(socket);
    if (subscriptions) {
      subscriptions.delete(message.matchId);
    }
    sendJson(socket, { type: "unsubscribed", matchId: message.matchId });
  }
}

export function attachWebSocketServer(server: any) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", async (socket, req) => {
    if (wsArcjet) {
      try {
        const decision = await wsArcjet.protect(req);

        if (decision.isDenied()) {
          const code = decision.reason.isRateLimit() ? 1013 : 1008;
          const reason = decision.reason.isRateLimit()
            ? "Rate limit exceeded"
            : "Access denied";

          socket.close(code, reason);
          return;
        }
      } catch (e) {
        console.error("WS connection error", e);
        socket.close(1011, "Server security error");
        return;
      }
    }

    socketSubscriptions.set(socket, new Set<number>());

    sendJson(socket, { type: "welcome" });

    socket.on("message", (data) => {
      handleMessage(socket, data);
    });

    socket.on("error", () => {
      socket.terminate();
    });

    socket.on("close", () => {
      cleanupSubscriptions(socket);
    });

    socket.on("error", console.error);
  });

  function broadcastMatchCreated(match: any) {
    broadcastToAll(wss, { type: "match_created", data: match });
  }

  function broadcastCommentaryCreated(comment: any) {
    broadcastToMatch(comment.matchId, { type: "commentary", data: comment });
  }

  return { broadcastMatchCreated, broadcastCommentaryCreated };
}