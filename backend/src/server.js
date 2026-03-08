const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const https = require('https');

// ---------------------------------------------------------------------------
// Configuracion desde variables de entorno
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 3000;
const ZWAY_HOST = process.env.ZWAY_HOST || 'localhost';
const ZWAY_PORT = process.env.ZWAY_PORT || '8083';
const ZWAY_TOKEN = process.env.ZWAY_TOKEN || '';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const ZWAY_PROTOCOL = process.env.ZWAY_PROTOCOL || 'http';

if (!ZWAY_TOKEN) {
  console.error('ZWAY_TOKEN no esta configurado. El backend no podra autenticarse con Z-Way.');
  console.error('Configura la variable de entorno ZWAY_TOKEN antes de iniciar.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// App Express
// ---------------------------------------------------------------------------
const app = express();

// Logging - no exponer el token en logs
morgan.token('sanitized-headers', (req) => {
  const headers = { ...req.headers };
  delete headers.authorization;
  delete headers.cookie;
  return JSON.stringify(headers);
});

app.use(morgan(':method :url :status :response-time ms'));

// CORS
const corsOptions = {
  origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map(s => s.trim()),
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
  credentials: false,
};
app.use(cors(corsOptions));

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ---------------------------------------------------------------------------
// Proxy endpoint: GET /api/devices/:deviceId/command/:command
//
// Acepta comandos semánticos: 'up', 'down', 'stop'
// Query param opcional: ?inverted=true  → invierte on/off para ese dispositivo
//
// Mapeo de comandos semánticos → Z-Way:
//   up   (normal)   → on
//   up   (inverted) → off
//   down (normal)   → off
//   down (inverted) → on
//   stop            → stop  (sin inversión)
//
// Construye la llamada real hacia Z-Way:
//   {ZWAY_PROTOCOL}://{ZWAY_HOST}:{ZWAY_PORT}/ZAutomation/api/v1/devices/{deviceId}/command/{zwayCommand}
// ---------------------------------------------------------------------------
app.get('/api/devices/:deviceId/command/:command', (req, res) => {
  const { deviceId, command } = req.params;
  const inverted = req.query.inverted === 'true';

  // Validar comando semántico permitido
  const allowedCommands = ['up', 'down', 'stop'];
  if (!allowedCommands.includes(command)) {
    return res.status(400).json({ error: `Comando no permitido: ${command}. Usa: up, down, stop` });
  }

  // Validar formato basico del deviceId
  if (!deviceId || deviceId.length === 0) {
    return res.status(400).json({ error: 'deviceId es requerido' });
  }

  // Resolver comando Z-Way aplicando lógica de inversión en el backend
  let zwayCommand;
  if (command === 'stop') {
    zwayCommand = 'stop';
  } else if (command === 'up') {
    zwayCommand = inverted ? 'off' : 'on';
  } else if (command === 'down') {
    zwayCommand = inverted ? 'on' : 'off';
  }

  console.log(`[proxy] Comando semántico '${command}' (inverted=${inverted}) → Z-Way '${zwayCommand}' para dispositivo '${deviceId}'`);

  const zwayPath = `/ZAutomation/api/v1/devices/${encodeURIComponent(deviceId)}/command/${encodeURIComponent(zwayCommand)}`;
  const zwayUrl = `${ZWAY_PROTOCOL}://${ZWAY_HOST}:${ZWAY_PORT}${zwayPath}`;

  console.log(`[proxy] -> ${req.method} ${zwayUrl}`);

  const client = ZWAY_PROTOCOL === 'https' ? https : http;

  const proxyReq = client.request(
    zwayUrl,
    {
      method: 'GET',
      headers: {
        accept: 'application/json, text/plain, */*',
        ZWAYSession: ZWAY_TOKEN,
      },
      timeout: 10000,
    },
    (proxyRes) => {
      console.log(`[proxy] <- ${proxyRes.statusCode} ${zwayUrl}`);

      // Reenviar status code y content-type
      res.status(proxyRes.statusCode);
      const contentType = proxyRes.headers['content-type'];
      if (contentType) {
        res.set('Content-Type', contentType);
      }

      // Stream de la respuesta
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', (err) => {
    console.error(`[proxy] Error conectando con Z-Way: ${err.message}`);
    res.status(502).json({
      error: 'Error al conectar con el API de Z-Way',
      message: err.message,
    });
  });

  proxyReq.on('timeout', () => {
    console.error('[proxy] Timeout conectando con Z-Way');
    proxyReq.destroy();
    res.status(504).json({ error: 'Timeout al conectar con el API de Z-Way' });
  });

  proxyReq.end();
});

// ---------------------------------------------------------------------------
// 404 para rutas no encontradas
// ---------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ---------------------------------------------------------------------------
// Manejo global de errores
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ---------------------------------------------------------------------------
// Iniciar servidor
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Backend BFF iniciado en puerto ${PORT}`);
  console.log(`Z-Way target: ${ZWAY_PROTOCOL}://${ZWAY_HOST}:${ZWAY_PORT}`);
  console.log(`CORS origin: ${CORS_ORIGIN}`);
  // No loggear el token por seguridad
  console.log(`ZWAY_TOKEN: configurado (${ZWAY_TOKEN.length} caracteres)`);
});
