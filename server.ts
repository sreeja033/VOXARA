import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  // Track connected users
  const clients = new Map<WebSocket, { id: string, name: string, roomId?: string, status: string }>();

  wss.on("connection", (ws) => {
    console.log("New client connected");

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "join") {
          clients.set(ws, { id: message.userId, name: message.userName, status: 'online' });
          broadcastUserList();
        }

        if (message.type === "chat_message") {
          const client = clients.get(ws);
          if (client && client.roomId) {
            broadcast({
              type: "chat_received",
              roomId: client.roomId,
              fromId: client.id,
              fromName: message.alias || client.name,
              text: message.text,
              timestamp: Date.now()
            });
          }
        }

        if (message.type === "join_circle") {
          const client = clients.get(ws);
          if (client) {
            client.roomId = message.roomId;
            client.status = 'listening';
            broadcastRoomUpdate(message.roomId);
          }
        }

        if (message.type === "status_change") {
          const client = clients.get(ws);
          if (client) {
            client.status = message.status;
            if (client.roomId) {
              broadcastRoomUpdate(client.roomId);
            }
          }
        }

        if (message.type === "signal") {
          broadcast({
            type: "signal_received",
            fromId: message.fromId,
            fromName: message.fromName,
            toId: message.toId,
            timestamp: Date.now()
          });
        }
      } catch (e) {
        console.error("Error parsing message:", e);
      }
    });

    ws.on("close", () => {
      const client = clients.get(ws);
      const roomId = client?.roomId;
      clients.delete(ws);
      broadcastUserList();
      if (roomId) {
        broadcastRoomUpdate(roomId);
      }
      console.log("Client disconnected");
    });
  });

  function broadcast(data: any) {
    const payload = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  function broadcastUserList() {
    const users = Array.from(clients.values());
    broadcast({ type: "user_list", users });
  }

  function broadcastRoomUpdate(roomId: string) {
    const participants = Array.from(clients.values()).filter(c => c.roomId === roomId);
    broadcast({ type: "room_update", roomId, participants });
  }

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
