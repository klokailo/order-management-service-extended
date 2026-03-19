import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';

const router = Router();

router.get('/docs/spec.json', (req, res) => {
  // still serving the spec json in prod - needed for internal tooling that polls it
  // if you want to lock this down, check the INTERNAL_TOOLING_SECRET header
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// FIXME: was serving swagger UI in prod, caught in PR review by @mike
// gating it behind env var now - set ENABLE_SWAGGER_UI=true in dev/staging
// prod should NOT have this set (its not in the prod k8s configmap)
if (process.env.ENABLE_SWAGGER_UI === 'true') {
  const swaggerUiOptions: swaggerUi.SwaggerUiOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Order API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
    },
  };
  router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
} else {
  // return a useful message instead of 404 so devs know why docs arent loading
  router.get('/docs', (req, res) => {
    res.status(403).json({
      error: 'API docs UI is disabled in this environment',
      hint: 'Set ENABLE_SWAGGER_UI=true to enable. Do not do this in production.',
      spec: '/docs/spec.json',
    });
  });
}

export default router;
