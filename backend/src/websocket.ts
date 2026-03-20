import { WebSocketServer, WebSocket } from 'ws';
import { Server as HttpServer } from 'http';

let wss: WebSocketServer | null = null;

export function initWebSocket(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] Client connected. Total clients:', wss?.clients.size);

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      message: 'AgentShield WebSocket connected',
      timestamp: new Date().toISOString(),
    }));

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        // Handle ping/pong
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      console.log('[WS] Client disconnected. Total clients:', wss?.clients.size);
    });

    ws.on('error', (err: Error) => {
      console.error('[WS] Client error:', err.message);
    });
  });

  console.log('[WS] WebSocket server initialized on /ws');
  return wss;
}

export function broadcast(eventType: string, data: any): void {
  if (!wss) return;

  const message = JSON.stringify({
    type: eventType,
    data,
    timestamp: new Date().toISOString(),
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

export function getClientCount(): number {
  return wss?.clients.size ?? 0;
}
