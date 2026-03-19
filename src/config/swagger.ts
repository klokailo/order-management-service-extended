import swaggerJsdoc from 'swagger-jsdoc';

// NOTE: using swagger-jsdoc over @asteasolutions/zod-to-openapi because we
// dont have zod schemas yet and i dont want to refactor all the models rn.
// yes i know jsdoc comments are annoying. yes it is what it is.
const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Order Management Service API',
      version: '1.4.0',
      description: `
REST API for the Order Management microservice.

**Auth:** All endpoints (except /health and /docs) require a Bearer JWT in the Authorization header.

**Correlation IDs:** Every request gets a X-Correlation-ID header injected by middleware.
Pass it in yourself if you want to trace across services.

**Webhooks:** Stripe webhooks hit /api/webhooks/stripe directly - do NOT put auth middleware on that route,
stripe doesnt send JWTs (found this out the hard way, see issue #87).
      `,
      contact: {
        name: 'Platform Team',
        // TODO: update this email when we get the team alias set up
        email: 'backend@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local dev',
      },
      {
        url: 'https://api-staging.example.com',
        description: 'Staging',
      },
      // prod intentionally omitted - dont want devs hammering prod from swagger ui
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT issued by the auth service. Expires in 1h.',
        },
      },
      schemas: {
        Order: {
          type: 'object',
          required: ['userId', 'items', 'status'],
          properties: {
            _id: {
              type: 'string',
              example: '64f1a2b3c4d5e6f7a8b9c0d1',
              description: 'MongoDB ObjectId - treat as opaque string on the client side',
            },
            userId: {
              type: 'string',
              example: 'usr_abc123',
            },
            status: {
              type: 'string',
              enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'],
              example: 'pending',
            },
            items: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/OrderItem',
              },
            },
            totalAmount: {
              type: 'number',
              format: 'float',
              example: 149.99,
              description: 'Always in USD cents internally, converted to dollars for API responses',
            },
            stripePaymentIntentId: {
              type: 'string',
              example: 'pi_3OxMVfLkdIwHu7ix1ABCDefG',
              description: 'Null until payment is initiated',
              nullable: true,
            },
            correlationId: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        OrderItem: {
          type: 'object',
          required: ['productId', 'quantity', 'unitPrice'],
          properties: {
            productId: {
              type: 'string',
              example: 'prod_xyz789',
            },
            quantity: {
              type: 'integer',
              minimum: 1,
              example: 2,
            },
            unitPrice: {
              type: 'number',
              format: 'float',
              example: 74.99,
            },
            productName: {
              type: 'string',
              example: 'Wireless Headphones Pro',
            },
          },
        },
        CreateOrderRequest: {
          type: 'object',
          required: ['items'],
          properties: {
            items: {
              type: 'array',
              minItems: 1,
              items: {
                $ref: '#/components/schemas/OrderItem',
              },
            },
            // couponCode is validated against the promo service via RabbitMQ event
            // response is async so we just store it and reconcile later
            couponCode: {
              type: 'string',
              example: 'SAVE20',
              nullable: true,
            },
          },
        },
        UpdateOrderStatusRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['confirmed', 'shipped', 'delivered', 'cancelled'],
              description: 'Cannot transition back to pending. Cannot update a refunded order.',
            },
          },
        },
        ApiError: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Order not found',
            },
            correlationId: {
              type: 'string',
              format: 'uuid',
            },
            // we include the stack in non-prod. dont log this, its in the error response body
            stack: {
              type: 'string',
              nullable: true,
              description: 'Only present in development environment',
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['ok', 'degraded', 'down'],
            },
            uptime: {
              type: 'number',
              description: 'Process uptime in seconds',
            },
            mongo: {
              type: 'string',
              enum: ['connected', 'disconnected'],
            },
            rabbit: {
              type: 'string',
              enum: ['connected', 'disconnected'],
            },
            version: {
              type: 'string',
              example: '1.4.0',
            },
          },
        },
        PaginatedOrders: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Order',
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 147 },
                totalPages: { type: 'integer', example: 8 },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Missing or invalid JWT',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: { error: 'Unauthorized', correlationId: '550e8400-e29b-41d4-a716-446655440000' },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
            },
          },
        },
        ValidationError: {
          description: 'Request body or params failed validation',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ApiError' },
              example: { error: "\"items\" is required", correlationId: '550e8400-e29b-41d4-a716-446655440000' },
            },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Orders', description: 'CRUD operations for orders' },
      { name: 'Webhooks', description: 'Inbound webhook endpoints (Stripe)' },
      { name: 'Health', description: 'Liveness and readiness probes' },
    ],
  },
  // scanning all route files for @swagger jsdoc blocks
  // make sure new route files are added under src/routes/ or they wont show up
  apis: ['./src/routes/**/*.ts', './src/controllers/**/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
