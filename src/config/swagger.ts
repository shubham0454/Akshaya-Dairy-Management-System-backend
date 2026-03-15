import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import express, { Application } from 'express';
import swaggerUi from 'swagger-ui-express';

// On Vercel we run from api/dist/ so JSDoc must read compiled .js files; locally use .ts
const isVercel = process.env.VERCEL === '1';
const apisPaths = isVercel
  ? [path.join(__dirname, '..', 'routes', '*.js'), path.join(__dirname, '..', 'controllers', '*.js')]
  : ['./src/routes/*.ts', './src/controllers/*.ts', './src/**/*.ts'];

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Proplay – Akshaya Dairy API',
      version: '1.0.0',
      description: 'API documentation for Akshaya Dairy Milk Collection & Management System',
      contact: {
        name: 'API Support',
      },
    },
    servers: [
      ...(process.env.VERCEL_URL
        ? [{ url: `https://${process.env.VERCEL_URL}`, description: 'Production (Vercel)' }]
        : []),
      {
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: process.env.VERCEL_URL ? 'Local' : 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token (without Bearer prefix)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            message: {
              type: 'string',
              example: 'Error message',
            },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Operation successful',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: apisPaths,
};

const swaggerSpec = swaggerJsdoc(options);

export const getSwaggerSpec = () => swaggerSpec;

const SWAGGER_UI_CDN = 'https://unpkg.com/swagger-ui-dist@5.11.0';

/** HTML page that loads Swagger UI from CDN - works on Vercel where static assets often 404 */
const swaggerHtml = (specUrl: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Proplay API Documentation</title>
  <link rel="stylesheet" href="${SWAGGER_UI_CDN}/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="${SWAGGER_UI_CDN}/swagger-ui-bundle.js" crossorigin></script>
  <script src="${SWAGGER_UI_CDN}/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: "${specUrl.replace(/"/g, '\\"')}",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;

function getBaseUrl(req: express.Request): string {
  const proto = req.get('x-forwarded-proto') || req.protocol;
  const host = req.get('host') || '';
  const base = proto && host ? `${proto}://${host}` : `https://${process.env.VERCEL_URL || 'localhost:3000'}`;
  return base.replace(/\/$/, ''); // no trailing slash
}

export const setupSwagger = (app: Application): void => {
  const isVercel = process.env.VERCEL === '1';

  // Serve spec with server URL from request so "Try it out" uses correct base (fixes CORS/URL scheme)
  app.get('/api-docs.json', (req, res) => {
    const base = getBaseUrl(req);
    const specWithServer = { ...swaggerSpec, servers: [{ url: base, description: 'This server' }] };
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(specWithServer);
  });

  if (isVercel) {
    // Vercel: serve HTML that loads Swagger UI from CDN (avoids static asset 404s)
    app.get('/api-docs', (req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.send(swaggerHtml(getBaseUrl(req) + '/api-docs.json'));
    });
    app.get('/api-docs/', (req, res) => {
      res.setHeader('Content-Type', 'text/html');
      res.send(swaggerHtml(getBaseUrl(req) + '/api-docs.json'));
    });
  } else {
    // Local: use swagger-ui-express (serves assets from node_modules)
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Proplay API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    }));
  }
};

