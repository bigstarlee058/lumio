export function getOfflineHTML(retryUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lumio — Connection Lost</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f1117;
      color: #e4e4e7;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      -webkit-app-region: drag;
    }
    .container {
      text-align: center;
      max-width: 420px;
      padding: 2rem;
      -webkit-app-region: no-drag;
    }
    .icon {
      font-size: 48px;
      margin-bottom: 1.5rem;
      opacity: 0.7;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }
    p {
      color: #a1a1aa;
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    button {
      background: #6366f1;
      color: white;
      border: none;
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }
    button:hover { background: #4f46e5; }
    button:active { background: #4338ca; }
    button:disabled {
      background: #3f3f46;
      cursor: not-allowed;
    }
    .status {
      margin-top: 1rem;
      font-size: 0.85rem;
      color: #71717a;
      min-height: 1.2em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#x1F50C;</div>
    <h1>No Connection</h1>
    <p>Unable to reach the Lumio server. Check your internet connection and try again.</p>
    <button id="retry">Retry</button>
    <div class="status" id="status"></div>
  </div>
  <script>
    const btn = document.getElementById('retry');
    const status = document.getElementById('status');
    const retryUrl = ${JSON.stringify(retryUrl)};

    btn.addEventListener('click', () => {
      btn.disabled = true;
      status.textContent = 'Connecting...';
      window.location.href = retryUrl;
    });

    // Auto-retry when network comes back online
    window.addEventListener('online', () => {
      status.textContent = 'Connection restored, reconnecting...';
      setTimeout(() => { window.location.href = retryUrl; }, 500);
    });
  </script>
</body>
</html>`;
}
