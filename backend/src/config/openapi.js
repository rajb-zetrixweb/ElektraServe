const apiSecurity = [{ ApiKeyAuth: [] }, { BearerAuth: [] }];

const errorResponses = {
  400: { $ref: '#/components/responses/BadRequest' },
  401: { $ref: '#/components/responses/Unauthorized' },
  403: { $ref: '#/components/responses/Forbidden' },
  404: { $ref: '#/components/responses/NotFound' },
};

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'ElektraServe Device Diagnostics API',
    version: '1.0.0',
    description:
      'REST API for managing diagnostic devices, simulated restart commands, and dashboard totals.',
  },
  servers: [{ url: '/', description: 'Current server' }],
  tags: [
    { name: 'System', description: 'Service availability' },
    { name: 'Devices', description: 'Device CRUD and simulated health status' },
    { name: 'Commands', description: 'Restart command queue and transitions' },
    { name: 'Dashboard', description: 'Persisted diagnostic totals' },
  ],
  security: apiSecurity,
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        operationId: 'getHealth',
        summary: 'Check API availability',
        security: [],
        responses: {
          200: {
            description: 'The API is available.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: {
                      type: 'object',
                      required: ['status'],
                      properties: { status: { type: 'string', example: 'ok' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/devices': {
      get: {
        tags: ['Devices'],
        operationId: 'listDevices',
        summary: 'List devices',
        description: 'Returns devices ordered by newest database ID first.',
        parameters: [
          {
            name: 'search',
            in: 'query',
            description: 'Case-insensitive partial match on device code or name.',
            schema: { type: 'string' },
          },
          {
            name: 'status',
            in: 'query',
            description: 'Filter by health status.',
            schema: { $ref: '#/components/schemas/HealthStatus' },
          },
        ],
        responses: {
          200: {
            description: 'Device list.',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DeviceListResponse' } },
            },
          },
          ...errorResponses,
        },
      },
      post: {
        tags: ['Devices'],
        operationId: 'createDevice',
        summary: 'Create a device',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DeviceInput' } } },
        },
        responses: {
          201: {
            description: 'Device created.',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DeviceResponse' } },
            },
          },
          ...errorResponses,
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/api/devices/{id}': {
      parameters: [{ $ref: '#/components/parameters/Id' }],
      get: {
        tags: ['Devices'],
        operationId: 'getDevice',
        summary: 'Get a device',
        responses: {
          200: {
            description: 'Device details.',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DeviceResponse' } },
            },
          },
          ...errorResponses,
        },
      },
      put: {
        tags: ['Devices'],
        operationId: 'updateDevice',
        summary: 'Update a device',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/DeviceInput' } } },
        },
        responses: {
          200: {
            description: 'Updated device.',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DeviceResponse' } },
            },
          },
          ...errorResponses,
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
      delete: {
        tags: ['Devices'],
        operationId: 'deleteDevice',
        summary: 'Delete a device',
        description: 'Deletes the device and its related demo commands using a database cascade.',
        responses: {
          200: {
            description: 'Device deleted.',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DeleteDeviceResponse' } },
            },
          },
          ...errorResponses,
        },
      },
    },
    '/api/devices/{id}/health-status': {
      post: {
        tags: ['Devices'],
        operationId: 'setDeviceHealthStatus',
        summary: 'Set simulated device health',
        parameters: [{ $ref: '#/components/parameters/Id' }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/HealthStatusInput' } },
          },
        },
        responses: {
          200: {
            description: 'Device health status updated.',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DeviceResponse' } },
            },
          },
          ...errorResponses,
        },
      },
    },
    '/api/commands': {
      get: {
        tags: ['Commands'],
        operationId: 'listCommands',
        summary: 'List restart commands',
        description: 'Returns commands ordered by newest database ID first.',
        parameters: [
          {
            name: 'status',
            in: 'query',
            description: 'Filter by command status.',
            schema: { $ref: '#/components/schemas/CommandStatus' },
          },
        ],
        responses: {
          200: {
            description: 'Command list.',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CommandListResponse' } },
            },
          },
          ...errorResponses,
        },
      },
      post: {
        tags: ['Commands'],
        operationId: 'queueRestartCommand',
        summary: 'Queue a simulated restart',
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/CreateCommandInput' } },
          },
        },
        responses: {
          201: {
            description: 'Pending command created.',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CommandResponse' } },
            },
          },
          ...errorResponses,
        },
      },
    },
    '/api/commands/{id}/complete': {
      post: {
        tags: ['Commands'],
        operationId: 'completeCommand',
        summary: 'Complete a pending command',
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: {
          200: {
            description: 'Command completed and completion time recorded.',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CommandResponse' } },
            },
          },
          ...errorResponses,
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/api/commands/{id}/fail': {
      post: {
        tags: ['Commands'],
        operationId: 'failCommand',
        summary: 'Fail a pending command',
        parameters: [{ $ref: '#/components/parameters/Id' }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/FailCommandInput' } },
          },
        },
        responses: {
          200: {
            description: 'Command failed; reason and completion time recorded.',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CommandResponse' } },
            },
          },
          ...errorResponses,
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/api/commands/{id}/cancel': {
      post: {
        tags: ['Commands'],
        operationId: 'cancelCommand',
        summary: 'Cancel a pending command',
        parameters: [{ $ref: '#/components/parameters/Id' }],
        responses: {
          200: {
            description: 'Command cancelled and completion time recorded.',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CommandResponse' } },
            },
          },
          ...errorResponses,
          409: { $ref: '#/components/responses/Conflict' },
        },
      },
    },
    '/api/dashboard/summary': {
      get: {
        tags: ['Dashboard'],
        operationId: 'getDashboardSummary',
        summary: 'Get dashboard totals',
        description: 'Computes all totals from persisted database records.',
        responses: {
          200: {
            description: 'Current dashboard totals.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/DashboardSummaryResponse' },
              },
            },
          },
          ...errorResponses,
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key configured in backend/.env.',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API key',
        description: 'The same API key may alternatively be sent as a Bearer token.',
      },
    },
    parameters: {
      Id: {
        name: 'id',
        in: 'path',
        required: true,
        description: 'Positive database identifier.',
        schema: { type: 'integer', minimum: 1, example: 1 },
      },
    },
    responses: {
      BadRequest: {
        description: 'Request validation failed.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Unauthorized: {
        description: 'API key is missing.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Forbidden: {
        description: 'API key is invalid.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      NotFound: {
        description: 'Requested record was not found.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
      Conflict: {
        description: 'Unique constraint or command state conflict.',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
      },
    },
    schemas: {
      HealthStatus: {
        type: 'string',
        enum: ['Healthy', 'Warning', 'Critical'],
        example: 'Healthy',
      },
      CommandStatus: {
        type: 'string',
        enum: ['Pending', 'Completed', 'Failed', 'Cancelled'],
        example: 'Pending',
      },
      DeviceInput: {
        type: 'object',
        required: ['deviceCode', 'name', 'solutionType'],
        additionalProperties: false,
        properties: {
          deviceCode: { type: 'string', maxLength: 50, example: 'EDGE-002' },
          name: { type: 'string', maxLength: 100, example: 'Warehouse Gateway' },
          solutionType: { type: 'string', maxLength: 30, example: 'Gateway' },
          healthStatus: {
            allOf: [{ $ref: '#/components/schemas/HealthStatus' }],
            default: 'Healthy',
          },
          lastSeenUtc: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: '2026-10-13T08:30:00.000Z',
          },
          notes: { type: 'string', nullable: true, example: 'Installed in the north warehouse.' },
        },
      },
      Device: {
        allOf: [
          { $ref: '#/components/schemas/DeviceInput' },
          {
            type: 'object',
            required: ['id', 'healthStatus', 'createdAtUtc', 'updatedAtUtc'],
            properties: {
              id: { type: 'integer', example: 6 },
              createdAtUtc: { type: 'string', format: 'date-time' },
              updatedAtUtc: { type: 'string', format: 'date-time' },
            },
          },
        ],
      },
      HealthStatusInput: {
        type: 'object',
        required: ['healthStatus'],
        additionalProperties: false,
        properties: { healthStatus: { $ref: '#/components/schemas/HealthStatus' } },
      },
      CreateCommandInput: {
        type: 'object',
        required: ['deviceId'],
        additionalProperties: false,
        properties: {
          deviceId: { type: 'integer', minimum: 1, example: 1 },
          commandType: {
            type: 'string',
            enum: ['Restart'],
            default: 'Restart',
            example: 'Restart',
          },
        },
      },
      FailCommandInput: {
        type: 'object',
        required: ['failureReason'],
        additionalProperties: false,
        properties: {
          failureReason: {
            type: 'string',
            minLength: 1,
            maxLength: 500,
            example: 'Device did not acknowledge.',
          },
        },
      },
      DeviceCommand: {
        type: 'object',
        required: [
          'id',
          'deviceId',
          'deviceCode',
          'deviceName',
          'commandType',
          'status',
          'requestedAtUtc',
        ],
        properties: {
          id: { type: 'integer', example: 5 },
          deviceId: { type: 'integer', example: 1 },
          deviceCode: { type: 'string', example: 'EDGE-001' },
          deviceName: { type: 'string', example: 'Lobby Gateway' },
          commandType: { type: 'string', enum: ['Restart'], example: 'Restart' },
          status: { $ref: '#/components/schemas/CommandStatus' },
          requestedAtUtc: { type: 'string', format: 'date-time' },
          completedAtUtc: { type: 'string', format: 'date-time', nullable: true },
          failureReason: { type: 'string', nullable: true },
        },
      },
      DashboardSummary: {
        type: 'object',
        required: [
          'totalDevices',
          'healthy',
          'warning',
          'critical',
          'commandsPending',
          'commandsCompleted',
        ],
        properties: {
          totalDevices: { type: 'integer', minimum: 0, example: 5 },
          healthy: { type: 'integer', minimum: 0, example: 3 },
          warning: { type: 'integer', minimum: 0, example: 1 },
          critical: { type: 'integer', minimum: 0, example: 1 },
          commandsPending: { type: 'integer', minimum: 0, example: 1 },
          commandsCompleted: { type: 'integer', minimum: 0, example: 1 },
        },
      },
      DeviceResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/Device' } },
      },
      DeviceListResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Device' } } },
      },
      CommandResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/DeviceCommand' } },
      },
      CommandListResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: { type: 'array', items: { $ref: '#/components/schemas/DeviceCommand' } },
        },
      },
      DashboardSummaryResponse: {
        type: 'object',
        required: ['data'],
        properties: { data: { $ref: '#/components/schemas/DashboardSummary' } },
      },
      DeleteDeviceResponse: {
        type: 'object',
        required: ['data'],
        properties: {
          data: {
            type: 'object',
            required: ['id', 'deleted'],
            properties: {
              id: { type: 'integer', example: 6 },
              deleted: { type: 'boolean', example: true },
            },
          },
        },
      },
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string', example: 'Request validation failed.' },
          details: {
            type: 'object',
            additionalProperties: { type: 'string' },
            example: { deviceCode: 'Device Code is required.' },
          },
        },
      },
    },
  },
};
