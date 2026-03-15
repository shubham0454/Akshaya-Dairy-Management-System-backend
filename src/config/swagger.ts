import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { Application } from 'express';
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

export const setupSwagger = (app: Application): void => {
  const isVercel = process.env.VERCEL === '1';
  const serveMiddlewares = isVercel
    ? swaggerUi.serveWithOptions({ redirect: false })
    : [swaggerUi.serve];
  app.use('/api-docs', ...serveMiddlewares, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Proplay API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  }));
};

