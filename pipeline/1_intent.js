const { callLLM, extractJSON } = require('./llm');

const INTENT_SYSTEM = `You are an intent extractor for an app compiler. Extract structured intent from user descriptions.
Output ONLY valid JSON matching this exact shape:
{
  "features": ["string"],
  "entities": ["string"],
  "roles": ["string"],
  "flows": ["string"],
  "hasPremium": boolean,
  "hasPayments": boolean,
  "hasAnalytics": boolean,
  "ambiguities": ["string"],
  "clarifications": ["string"],
  "assumptions": ["string"]
}

Rules:
- features: concrete features mentioned (login, dashboard, CRUD ops, etc.)
- entities: data objects (User, Contact, Order, etc.) — always include User
- roles: user roles (admin, user, guest, etc.) — always include at least one
- flows: user journeys (register → login → dashboard, etc.)
- ambiguities: things that are unclear in the prompt
- clarifications: questions you would ask if interactive
- assumptions: reasonable assumptions made for missing info
- hasPremium/hasPayments/hasAnalytics: boolean flags`;

async function extractIntent(userPrompt) {
  const userMsg = `Extract structured intent from this app description:\n\n"${userPrompt}"`;
  const raw = await callLLM(INTENT_SYSTEM, userMsg, { temperature: 0.1 });
  const intent = extractJSON(raw);

  // Enforce minimum structure
  if (!intent.entities.includes('User')) intent.entities.unshift('User');
  if (!intent.roles || intent.roles.length === 0) intent.roles = ['user', 'admin'];
  if (!intent.features || intent.features.length === 0) {
    throw new Error('Intent extraction failed: no features found');
  }

  return intent;
}

module.exports = { extractIntent };
