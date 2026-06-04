const { callLLM, extractJSON } = require('./llm');

const DESIGN_SYSTEM = `You are a software architect. Given structured intent, produce an app architecture.
Output ONLY valid JSON matching this exact shape:
{
  "appName": "string",
  "appType": "web",
  "modules": [
    {
      "name": "string",
      "type": "auth|crud|dashboard|payment|analytics|settings",
      "entities": ["string"],
      "roles": ["string"],
      "operations": ["create","read","update","delete"]
    }
  ],
  "dataFlow": ["string"]
}

Rules:
- Every entity from intent must appear in at least one module
- Every role from intent must appear in at least one module
- dataFlow: ordered steps describing data movement (e.g. "User authenticates → JWT issued → Protected routes accessible")
- Always include an auth module
- If hasPremium=true, include a payment module
- If hasAnalytics=true, include an analytics module`;

async function designSystem(intent) {
  const userMsg = `Design the app architecture for this intent:\n\n${JSON.stringify(intent, null, 2)}`;
  const raw = await callLLM(DESIGN_SYSTEM, userMsg, { temperature: 0.1 });
  const design = extractJSON(raw);

  // Verify all entities are covered
  const coveredEntities = new Set(design.modules.flatMap(m => m.entities));
  const missingEntities = intent.entities.filter(e => !coveredEntities.has(e));
  if (missingEntities.length > 0) {
    // Add a general module for uncovered entities
    design.modules.push({
      name: 'CoreData',
      type: 'crud',
      entities: missingEntities,
      roles: intent.roles,
      operations: ['create', 'read', 'update', 'delete']
    });
  }

  return design;
}

module.exports = { designSystem };
