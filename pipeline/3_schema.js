const { callLLM, extractJSON } = require('./llm');

const DB_SYSTEM = `You are a database architect. Generate a normalized database schema.
Output ONLY valid JSON:
{
  "tables": [
    {
      "name": "string",
      "fields": [
        { "name": "string", "type": "string|integer|float|boolean|date|datetime|text|json|uuid", "required": boolean, "unique": boolean, "foreignKey": "TableName.fieldName or null" }
      ],
      "relations": [
        { "type": "hasMany|belongsTo|manyToMany", "target": "TableName" }
      ]
    }
  ]
}
Rules:
- Every table must have an "id" field of type "uuid"
- Every table must have "createdAt" and "updatedAt" datetime fields
- Foreign keys must reference existing tables
- Use snake_case for field names
- Table names must be PascalCase`;

const API_SYSTEM = `You are an API designer. Generate RESTful API endpoints.
Output ONLY valid JSON:
{
  "endpoints": [
    {
      "path": "/api/resource",
      "method": "GET|POST|PUT|PATCH|DELETE",
      "handler": "ModuleName.actionName",
      "auth": boolean,
      "roles": ["string"],
      "dbTable": "TableName",
      "requestBody": { "field": "type" },
      "responseSchema": { "field": "type" }
    }
  ]
}
Rules:
- Every CRUD operation per entity needs corresponding endpoints
- Auth endpoints: POST /api/auth/register, POST /api/auth/login, POST /api/auth/logout
- Protected routes must have auth: true
- Public routes: register, login only
- roles array: which roles can access (empty = all authenticated)`;

const UI_SYSTEM = `You are a UI architect. Generate page and component configurations.
Output ONLY valid JSON:
{
  "pages": [
    {
      "name": "string",
      "path": "/route",
      "layout": "auth|dashboard|public|settings",
      "roles": ["string"],
      "components": [
        {
          "type": "form|table|chart|card|navbar|sidebar",
          "dataSource": "/api/endpoint",
          "fields": ["string"],
          "actions": ["create|edit|delete|view|export"]
        }
      ]
    }
  ]
}
Rules:
- Always include Login page (path: /login, layout: auth)
- Always include Register page (path: /register, layout: auth)
- Always include Dashboard page (path: /dashboard, layout: dashboard)
- dataSource must be a valid API path from the API schema
- roles on pages must be a subset of all roles`;

const AUTH_SYSTEM = `You are an auth system designer. Generate auth + RBAC configuration.
Output ONLY valid JSON:
{
  "type": "jwt",
  "roles": ["string"],
  "permissions": [
    {
      "role": "string",
      "resource": "string",
      "actions": ["create","read","update","delete","manage"]
    }
  ],
  "premiumGating": [
    { "feature": "string", "requiredPlan": "premium|enterprise" }
  ]
}
Rules:
- admin role gets all permissions on all resources
- Regular user gets read on public resources, CRUD on own resources
- If hasPremium, add premiumGating entries for premium features
- Resources should match entity names`;

async function generateSchemas(intent, design) {
  const context = JSON.stringify({ intent, design }, null, 2);

  // Generate schemas sequentially to stay within free tier TPM limits
  const dbRaw   = await callLLM(DB_SYSTEM,   `Generate DB schema for:\n${context}`,   { temperature: 0.1 });
  const apiRaw  = await callLLM(API_SYSTEM,  `Generate API schema for:\n${context}`,  { temperature: 0.1 });
  const uiRaw   = await callLLM(UI_SYSTEM,   `Generate UI schema for:\n${context}`,   { temperature: 0.1 });
  const authRaw = await callLLM(AUTH_SYSTEM, `Generate Auth schema for:\n${context}`, { temperature: 0.1 });

  return {
    database: extractJSON(dbRaw),
    api: extractJSON(apiRaw),
    ui: extractJSON(uiRaw),
    auth: extractJSON(authRaw)
  };
}

module.exports = { generateSchemas };
