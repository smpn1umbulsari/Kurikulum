import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MonitoringEngine } from '../MonitoringEngine.js';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startDashboardServer(projectManager, port = 3005) {
  const monitoringEngine = new MonitoringEngine(projectManager);
  const clients = new Set();

  // Watch for log file changes to stream updates dynamically
  let watchDebounceTimeout;
  let watcher;
  if (fs.existsSync(monitoringEngine.logFilePath)) {
    watcher = fs.watch(monitoringEngine.logFilePath, (eventType) => {
      if (eventType === 'change') {
        clearTimeout(watchDebounceTimeout);
        watchDebounceTimeout = setTimeout(() => {
          broadcastStatsUpdate();
        }, 100); // 100ms debounce
      }
    });
  }

  function broadcastStatsUpdate() {
    try {
      const report = monitoringEngine.generateAnalyticsReport();
      const message = JSON.stringify({ type: 'report', report });
      for (const client of clients) {
        client.write(`data: ${message}\n\n`);
      }
    } catch (e) {
      console.error('[DashboardServer] Broadcast error:', e.message);
    }
  }

  const server = http.createServer((req, res) => {
    const url = req.url;

    // REST API - Stats
    if (url === '/api/stats') {
      try {
        const report = monitoringEngine.generateAnalyticsReport();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    // REST API - Logs
    if (url === '/api/logs') {
      try {
        const report = monitoringEngine.generateAnalyticsReport();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(report.recentActions));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
      return;
    }

    // Real-time Event Stream (SSE)
    if (url === '/api/events') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });

      // Send initial data immediately
      try {
        const report = monitoringEngine.generateAnalyticsReport();
        res.write(`data: ${JSON.stringify({ type: 'report', report })}\n\n`);
      } catch (err) {
        console.error('[DashboardServer] SSE initial write error:', err.message);
      }

      clients.add(res);

      // Keep connection alive with a ping every 15s
      const pingInterval = setInterval(() => {
        res.write('data: {"type":"ping"}\n\n');
      }, 15000);

      req.on('close', () => {
        clearInterval(pingInterval);
        clients.delete(res);
      });
      return;
    }

    // Static Files serving
    let filePath = '';
    let contentType = 'text/html';

    if (url === '/' || url === '/index.html') {
      filePath = path.join(__dirname, 'public', 'index.html');
      contentType = 'text/html';
    } else if (url === '/index.css') {
      filePath = path.join(__dirname, 'public', 'index.css');
      contentType = 'text/css';
    } else if (url === '/index.js') {
      filePath = path.join(__dirname, 'public', 'index.js');
      contentType = 'application/javascript';
    }

    if (filePath && fs.existsSync(filePath)) {
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  });

  server.on('close', () => {
    if (watcher) {
      watcher.close();
    }
  });

  server.on('error', (err) => {
    console.error(`[DashboardServer] Error: ${err.message}`);
    if (err.code === 'EADDRINUSE') {
      console.error(`[DashboardServer] Port ${port} is already in use. Please select a different port using --port.`);
    }
  });

  server.listen(port, '0.0.0.0', () => {
    console.log(`[DashboardServer] Active on http://localhost:${port}`);
  });

  return server;
}
