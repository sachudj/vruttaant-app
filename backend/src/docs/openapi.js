const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Vruttaant API',
    version: '1.0.0',
    description:
      'OpenAPI reference for Vruttaant backend endpoints. For payload constraints and release notes, also see docs/API_ENDPOINTS.md in the repository.'
  },
  servers: [
    {
      url: 'http://localhost:5000',
      description: 'Local development server (default)'
    },
    {
      url: 'http://localhost:5001',
      description: 'Local development server (fallback when 5000 is occupied)'
    }
  ],
  tags: [
    { name: 'Platform' },
    { name: 'News' },
    { name: 'Auth' },
    { name: 'User' },
    { name: 'Bookmarks' },
    { name: 'Analytics' },
    { name: 'Admin' },
    { name: 'Badges' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    schemas: {
      SignupRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'reader@example.com'
          },
          password: {
            type: 'string',
            minLength: 8,
            example: 'StrongPassword123!'
          }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            example: 'reader@example.com'
          },
          password: {
            type: 'string',
            example: 'StrongPassword123!'
          }
        }
      },
      RefreshTokenRequest: {
        type: 'object',
        required: ['refreshToken'],
        properties: {
          refreshToken: {
            type: 'string',
            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
          }
        }
      }
    }
  },
  paths: {
    '/': {
      get: {
        tags: ['Platform'],
        summary: 'Root service metadata'
      }
    },
    '/health': {
      get: {
        tags: ['Platform'],
        summary: 'Service health status'
      }
    },
    '/ready': {
      get: {
        tags: ['Platform'],
        summary: 'Readiness probe status'
      }
    },
    '/metrics': {
      get: {
        tags: ['Platform'],
        summary: 'Prometheus metrics export'
      }
    },
    '/api/v1/news/ingest/health': {
      get: {
        tags: ['News'],
        summary: 'News ingest route health'
      }
    },
    '/api/v1/news/ingest': {
      post: {
        tags: ['News'],
        summary: 'Scrape and optionally persist articles'
      }
    },
    '/api/v1/news/cards': {
      get: {
        tags: ['News'],
        summary: 'Fetch paginated feed cards with filters/sort'
      }
    },
    '/api/v1/news/recommended': {
      get: {
        tags: ['News'],
        summary: 'Fetch recommendation feed'
      }
    },
    '/api/v1/news/translate': {
      post: {
        tags: ['News'],
        summary: 'Translate story title and summary'
      }
    },
    '/api/v1/auth/signup': {
      post: {
        tags: ['Auth'],
        summary: 'Create user account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/SignupRequest'
              }
            }
          }
        }
      }
    },
    '/api/v1/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Login and issue access/refresh tokens',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/LoginRequest'
              }
            }
          }
        }
      }
    },
    '/api/v1/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and issue new access token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RefreshTokenRequest'
              }
            }
          }
        }
      }
    },
    '/api/v1/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Revoke refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/RefreshTokenRequest'
              }
            }
          }
        }
      }
    },
    '/api/v1/user/profile': {
      get: {
        tags: ['User'],
        summary: 'Get user profile and preferences',
        security: [{ bearerAuth: [] }]
      },
      patch: {
        tags: ['User'],
        summary: 'Update user profile preferences',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/user/notifications/preferences': {
      get: {
        tags: ['User'],
        summary: 'Get notification preferences',
        security: [{ bearerAuth: [] }]
      },
      patch: {
        tags: ['User'],
        summary: 'Update notification preferences',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/user/notifications/devices': {
      post: {
        tags: ['User'],
        summary: 'Register notification device',
        security: [{ bearerAuth: [] }]
      },
      get: {
        tags: ['User'],
        summary: 'List notification devices',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/user/notifications/devices/{deviceId}': {
      delete: {
        tags: ['User'],
        summary: 'Delete notification device',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'deviceId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ]
      }
    },
    '/api/v1/user/activity/history': {
      get: {
        tags: ['User'],
        summary: 'Get paginated user activity history',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/user/activity/reading-feed': {
      get: {
        tags: ['User'],
        summary: 'Get recent reading feed',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/user/activity/stats': {
      get: {
        tags: ['User'],
        summary: 'Get user engagement stats',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/user/badges': {
      get: {
        tags: ['User'],
        summary: 'Get earned badges',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/user/badges/progress': {
      get: {
        tags: ['User'],
        summary: 'Get badge progress',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/user/badges/evaluate': {
      post: {
        tags: ['User'],
        summary: 'Trigger badge evaluation',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/user/badges/{badgeId}/view': {
      post: {
        tags: ['User'],
        summary: 'Mark badge as viewed',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'badgeId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ]
      }
    },
    '/api/v1/user/badges/metrics': {
      get: {
        tags: ['User'],
        summary: 'Get badge engagement metrics',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/user/cohorts': {
      get: {
        tags: ['User'],
        summary: 'Get user cohorts',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/user/cohorts/refresh': {
      post: {
        tags: ['User'],
        summary: 'Recompute user cohorts',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/user/bookmarks': {
      post: {
        tags: ['Bookmarks'],
        summary: 'Create bookmark',
        security: [{ bearerAuth: [] }]
      },
      get: {
        tags: ['Bookmarks'],
        summary: 'List bookmarks',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/user/bookmarks/{id}': {
      delete: {
        tags: ['Bookmarks'],
        summary: 'Delete bookmark',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ]
      }
    },
    '/api/v1/analytics/events': {
      post: {
        tags: ['Analytics'],
        summary: 'Capture user activity event'
      }
    },
    '/api/v1/analytics/trending': {
      get: {
        tags: ['Analytics'],
        summary: 'Trending analytics by card (admin)',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/analytics/categories': {
      get: {
        tags: ['Analytics'],
        summary: 'Category analytics (admin)',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/analytics/card/{cardId}/metrics': {
      get: {
        tags: ['Analytics'],
        summary: 'Single card analytics (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'cardId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ]
      }
    },
    '/api/v1/analytics/user/engagement': {
      get: {
        tags: ['Analytics'],
        summary: 'Logged-in user engagement summary',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/admin/health': {
      get: {
        tags: ['Admin'],
        summary: 'Detailed system health (admin)',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/admin/stats': {
      get: {
        tags: ['Admin'],
        summary: 'System statistics (admin)',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/admin/release-telemetry': {
      get: {
        tags: ['Admin'],
        summary: 'Release health snapshot (admin)',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/admin/loadtest/runs': {
      post: {
        tags: ['Admin'],
        summary: 'Ingest load-test run report (admin)',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/admin/loadtest/history': {
      get: {
        tags: ['Admin'],
        summary: 'Load-test run history (admin)',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/admin/loadtest/trends': {
      get: {
        tags: ['Admin'],
        summary: 'Aggregated load-test trends (admin)',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/admin/notifications/send': {
      post: {
        tags: ['Admin'],
        summary: 'Broadcast admin push notification',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/admin/cohorts/stats': {
      get: {
        tags: ['Admin'],
        summary: 'Cohort aggregate stats (admin)',
        security: [{ bearerAuth: [] }]
      }
    },
    '/api/v1/admin/cohorts/{cohortId}/users': {
      get: {
        tags: ['Admin'],
        summary: 'Paginated users in cohort (admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'cohortId',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ]
      }
    },
    '/api/v1/badges/catalog': {
      get: {
        tags: ['Badges'],
        summary: 'Public badge definitions catalog'
      }
    }
  }
};

module.exports = {
  openApiSpec
};
