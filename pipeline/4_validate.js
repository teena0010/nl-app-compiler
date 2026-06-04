const Ajv = require('ajv');
const fs = require('fs');
const path = require('path');
const { callLLM, extractJSON } = require('./llm');

const ajv = new Ajv({ allErrors: true });
const masterSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../schemas/app-config.schema.json'), 'utf8')
);
const validateSchema = ajv.compile(masterSchema);

// ─── Rule-based cross-layer validators ────────────────────────────────────────

function checkDBFieldTypes(db) {
  const validTypes = new Set(['string','integer','float','boolean','date','datetime','text','json','uuid']);
  const errors = [];
  for (const table of db.tables) {
    for (const field of table.fields) {
      if (!validTypes.has(field.type)) {
        errors.push({ layer: 'database', table: table.name, field: field.name, issue: `invalid type "${field.type}"`, fix: 'string' });
      }
    }
  }
  return errors;
}

function checkDBHasRequiredFields(db) {
  const errors = [];
  for (const table of db.tables) {
    const fieldNames = table.fields.map(f => f.name);
    if (!fieldNames.includes('id')) {
      errors.push({ layer: 'database', table: table.name, issue: 'missing id field', autoFix: true });
    }
    if (!fieldNames.includes('created_at') && !fieldNames.includes('createdAt')) {
      errors.push({ layer: 'database', table: table.name, issue: 'missing createdAt field', autoFix: true });
    }
  }
  return errors;
}

function checkAPIvsDB(api, db) {
  const tableNames = new Set(db.tables.map(t => t.name));
  const errors = [];
  for (const ep of api.endpoints) {
    if (ep.dbTable && !tableNames.has(ep.dbTable)) {
      errors.push({
        layer: 'api',
        endpoint: `${ep.method} ${ep.path}`,
        issue: `references non-existent table "${ep.dbTable}"`,
        autoFix: false
      });
    }
  }
  return errors;
}

function checkUIvsAPI(ui, api) {
  const apiPaths = new Set(api.endpoints.map(e => e.path));
  const errors = [];
  for (const page of ui.pages) {
    for (const comp of (page.components || [])) {
      if (comp.dataSource && comp.dataSource.startsWith('/api/') && !apiPaths.has(comp.dataSource)) {
        errors.push({
          layer: 'ui',
          page: page.name,
          component: comp.type,
          issue: `dataSource "${comp.dataSource}" has no matching API endpoint`,
          autoFix: false
        });
      }
    }
  }
  return errors;
}

function checkAuthRolesConsistency(auth, intent) {
  const authRoles = new Set(auth.roles);
  const errors = [];
  for (const role of intent.roles) {
    if (!authRoles.has(role)) {
      errors.push({ layer: 'auth', issue: `role "${role}" from intent missing in auth config`, autoFix: true, role });
    }
  }
  return errors;
}

function checkUIRolesExist(ui, auth) {
  const validRoles = new Set([...auth.roles, 'all', 'public']);
  const errors = [];
  for (const page of ui.pages) {
    for (const role of (page.roles || [])) {
      if (!validRoles.has(role)) {
        errors.push({ layer: 'ui', page: page.name, issue: `unknown role "${role}"`, autoFix: true, badRole: role });
      }
    }
  }
  return errors;
}

function checkRequiredPages(ui) {
  const pagePaths = new Set(ui.pages.map(p => p.path));
  const errors = [];
  const required = ['/login', '/register', '/dashboard'];
  for (const rp of required) {
    if (!pagePaths.has(rp)) {
      errors.push({ layer: 'ui', issue: `required page "${rp}" missing`, autoFix: true, missingPath: rp });
    }
  }
  return errors;
}

// ─── Auto-repair functions ─────────────────────────────────────────────────

function autoRepair(config, errors) {
  const repairs = [];
  for (const err of errors) {
    if (!err.autoFix) continue;

    if (err.layer === 'database' && err.issue.includes('missing id field')) {
      const table = config.database.tables.find(t => t.name === err.table);
      if (table) {
        table.fields.unshift({ name: 'id', type: 'uuid', required: true, unique: true });
        repairs.push(`Added id field to table ${err.table}`);
      }
    }

    if (err.layer === 'database' && err.issue.includes('missing createdAt')) {
      const table = config.database.tables.find(t => t.name === err.table);
      if (table) {
        table.fields.push(
          { name: 'created_at', type: 'datetime', required: true },
          { name: 'updated_at', type: 'datetime', required: true }
        );
        repairs.push(`Added timestamps to table ${err.table}`);
      }
    }

    if (err.layer === 'database' && err.issue.includes('invalid type')) {
      const table = config.database.tables.find(t => t.name === err.table);
      if (table) {
        const field = table.fields.find(f => f.name === err.field);
        if (field) { field.type = err.fix; repairs.push(`Fixed type for ${err.table}.${err.field}`); }
      }
    }

    if (err.layer === 'auth' && err.issue.includes('role') && err.role) {
      if (!config.auth.roles.includes(err.role)) {
        config.auth.roles.push(err.role);
        repairs.push(`Added missing role "${err.role}" to auth`);
      }
    }

    if (err.layer === 'ui' && err.issue.includes('unknown role') && err.badRole) {
      // Remove unknown roles from pages
      for (const page of config.ui.pages) {
        page.roles = page.roles.filter(r => r !== err.badRole || r === 'all' || r === 'public');
        if (page.roles.length === 0) page.roles = ['user'];
      }
      repairs.push(`Removed unknown role "${err.badRole}" from UI pages`);
    }

    if (err.layer === 'ui' && err.issue.includes('required page') && err.missingPath) {
      const defaults = {
        '/login':    { name: 'Login', path: '/login', layout: 'auth', roles: ['public'], components: [{ type: 'form', dataSource: '/api/auth/login', fields: ['email', 'password'], actions: [] }] },
        '/register': { name: 'Register', path: '/register', layout: 'auth', roles: ['public'], components: [{ type: 'form', dataSource: '/api/auth/register', fields: ['email', 'password', 'name'], actions: [] }] },
        '/dashboard':{ name: 'Dashboard', path: '/dashboard', layout: 'dashboard', roles: ['user', 'admin'], components: [{ type: 'card', dataSource: '/api/dashboard', fields: [], actions: [] }] }
      };
      if (defaults[err.missingPath]) {
        config.ui.pages.unshift(defaults[err.missingPath]);
        repairs.push(`Added missing required page ${err.missingPath}`);
      }
    }
  }
  return repairs;
}

// ─── LLM-based repair for non-auto-fixable errors ─────────────────────────

const REPAIR_SYSTEM = `You are a config repair specialist. Fix the specific issues in this app config.
Return ONLY the repaired JSON for the affected layer (database|api|ui|auth).
Do not change anything that isn't broken.`;

async function llmRepair(config, errors) {
  const nonAutoErrors = errors.filter(e => !e.autoFix);
  if (nonAutoErrors.length === 0) return { repairs: [], config };

  // Group errors by layer
  const byLayer = {};
  for (const err of nonAutoErrors) {
    if (!byLayer[err.layer]) byLayer[err.layer] = [];
    byLayer[err.layer].push(err);
  }

  const repairs = [];
  for (const [layer, layerErrors] of Object.entries(byLayer)) {
    const msg = `Fix these issues in the ${layer} layer:\n${JSON.stringify(layerErrors, null, 2)}\n\nCurrent ${layer} config:\n${JSON.stringify(config[layer], null, 2)}\n\nFull context:\n- DB tables: ${config.database.tables.map(t => t.name).join(', ')}\n- API paths: ${config.api.endpoints.map(e => e.path).join(', ')}\n- Auth roles: ${config.auth.roles.join(', ')}`;
    
    try {
      const raw = await callLLM(REPAIR_SYSTEM, msg, { temperature: 0.05 });
      const fixed = extractJSON(raw);
      config[layer] = fixed;
      repairs.push(`LLM repaired ${layer} layer (${layerErrors.length} issues)`);
    } catch (e) {
      repairs.push(`LLM repair failed for ${layer}: ${e.message}`);
    }
  }

  return { repairs, config };
}

// ─── Main validate + repair orchestrator ──────────────────────────────────

async function validateAndRepair(config, maxAttempts = 3) {
  const log = { attempts: [], totalErrors: 0, totalRepairs: 0, finalValid: false };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // 1. JSON schema validation
    const schemaValid = validateSchema(config);
    const schemaErrors = schemaValid ? [] : (validateSchema.errors || []).map(e => ({
      layer: 'schema', issue: `${e.instancePath} ${e.message}`, autoFix: false
    }));

    // 2. Cross-layer rule checks
    const ruleErrors = [
      ...checkDBFieldTypes(config.database),
      ...checkDBHasRequiredFields(config.database),
      ...checkAPIvsDB(config.api, config.database),
      ...checkUIvsAPI(config.ui, config.api),
      ...checkAuthRolesConsistency(config.auth, config.intent),
      ...checkUIRolesExist(config.ui, config.auth),
      ...checkRequiredPages(config.ui)
    ];

    const allErrors = [...schemaErrors, ...ruleErrors];
    log.totalErrors += allErrors.length;

    if (allErrors.length === 0) {
      log.finalValid = true;
      log.attempts.push({ attempt, errors: 0, repairs: 0, status: 'valid' });
      break;
    }

    // 3. Auto-repair first
    const autoRepairs = autoRepair(config, allErrors);
    log.totalRepairs += autoRepairs.length;

    // 4. LLM repair for remainder
    const { repairs: llmRepairs } = await llmRepair(config, allErrors);
    log.totalRepairs += llmRepairs.length;

    log.attempts.push({
      attempt,
      errors: allErrors.length,
      repairs: autoRepairs.length + llmRepairs.length,
      errorDetails: allErrors.map(e => e.issue),
      repairDetails: [...autoRepairs, ...llmRepairs],
      status: 'repaired'
    });
  }

  // Final schema check
  log.finalValid = validateSchema(config);
  return { config, validationLog: log };
}

module.exports = { validateAndRepair };
