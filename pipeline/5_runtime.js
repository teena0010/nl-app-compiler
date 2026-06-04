/**
 * Runtime Simulator
 * Simulates execution of the generated config to verify it can power a real app.
 * Acts like a dry-run compiler: checks every reference, resolves every dependency.
 */

function simulateDB(database) {
  const results = [];
  const tableMap = {};

  for (const table of database.tables) {
    tableMap[table.name] = table;
    // Simulate CREATE TABLE
    const fieldDefs = table.fields.map(f => `${f.name} ${f.type.toUpperCase()}${f.required ? ' NOT NULL' : ''}${f.unique ? ' UNIQUE' : ''}`);
    results.push({
      op: 'CREATE TABLE',
      table: table.name,
      sql: `CREATE TABLE IF NOT EXISTS "${table.name}" (${fieldDefs.join(', ')});`,
      status: 'ok'
    });
  }

  // Validate foreign keys
  for (const table of database.tables) {
    for (const field of table.fields) {
      if (field.foreignKey) {
        const [refTable] = field.foreignKey.split('.');
        if (!tableMap[refTable]) {
          results.push({ op: 'FK_CHECK', table: table.name, field: field.name, status: 'error', reason: `FK references missing table ${refTable}` });
        }
      }
    }
  }

  return results;
}

function simulateAPI(api, database) {
  const tableNames = new Set(database.tables.map(t => t.name));
  const results = [];

  for (const ep of api.endpoints) {
    const issues = [];
    if (ep.dbTable && !tableNames.has(ep.dbTable)) {
      issues.push(`references unknown table "${ep.dbTable}"`);
    }
    if (!ep.handler || !ep.handler.includes('.')) {
      issues.push('handler must be in "Module.action" format');
    }
    results.push({
      op: 'REGISTER_ROUTE',
      route: `${ep.method} ${ep.path}`,
      handler: ep.handler,
      auth: ep.auth,
      roles: ep.roles,
      status: issues.length === 0 ? 'ok' : 'warn',
      issues
    });
  }

  return results;
}

function simulateAuth(auth, api) {
  const results = [];

  // Check every API endpoint's roles exist in auth
  for (const ep of api.endpoints) {
    for (const role of ep.roles) {
      if (!auth.roles.includes(role) && role !== 'all' && role !== 'public') {
        results.push({ op: 'ROLE_CHECK', endpoint: ep.path, status: 'warn', reason: `role "${role}" not in auth config` });
      }
    }
  }

  // Simulate permission matrix
  for (const perm of auth.permissions) {
    results.push({
      op: 'PERMISSION',
      role: perm.role,
      resource: perm.resource,
      actions: perm.actions,
      status: auth.roles.includes(perm.role) ? 'ok' : 'warn'
    });
  }

  return results;
}

function simulateUI(ui, api, auth) {
  const apiPaths = new Set(api.endpoints.map(e => e.path));
  const results = [];

  for (const page of ui.pages) {
    const pageIssues = [];
    for (const comp of (page.components || [])) {
      if (comp.dataSource && comp.dataSource.startsWith('/api/') && !apiPaths.has(comp.dataSource)) {
        pageIssues.push(`component "${comp.type}" has unresolvable dataSource "${comp.dataSource}"`);
      }
    }
    results.push({
      op: 'RENDER_PAGE',
      page: page.name,
      path: page.path,
      layout: page.layout,
      componentCount: (page.components || []).length,
      status: pageIssues.length === 0 ? 'ok' : 'warn',
      issues: pageIssues
    });
  }

  return results;
}

function generateCodeArtifacts(config) {
  const { database, api, auth, meta } = config;

  // Generate Express router stub
  const routerLines = api.endpoints.map(ep => {
    const middleware = ep.auth ? `authenticate, authorize(${JSON.stringify(ep.roles)})` : '';
    return `router.${ep.method.toLowerCase()}('${ep.path}', ${middleware ? middleware + ', ' : ''}handlers.${ep.handler.replace('.', '_')});`;
  });

  // Generate DB migration stub
  const migrationLines = database.tables.map(t => {
    const cols = t.fields.map(f => `  ${f.name}: { type: '${f.type}', required: ${!!f.required} }`).join(',\n');
    return `// Table: ${t.name}\nconst ${t.name}Schema = {\n${cols}\n};`;
  });

  // Generate React page stubs
  const pageStubs = config.ui.pages.map(p =>
    `// Page: ${p.name} (${p.path})\nexport function ${p.name.replace(/\s/g,'')}Page() { return <${p.layout.charAt(0).toUpperCase()+p.layout.slice(1)}Layout>/* components */</...>; }`
  );

  return {
    expressRouter: routerLines.join('\n'),
    dbMigration: migrationLines.join('\n\n'),
    reactPages: pageStubs.join('\n\n')
  };
}

function runSimulation(config) {
  const dbResults = simulateDB(config.database);
  const apiResults = simulateAPI(config.api, config.database);
  const authResults = simulateAuth(config.auth, config.api);
  const uiResults = simulateUI(config.ui, config.api, config.auth);
  const artifacts = generateCodeArtifacts(config);

  const allResults = [...dbResults, ...apiResults, ...authResults, ...uiResults];
  const errors = allResults.filter(r => r.status === 'error');
  const warnings = allResults.filter(r => r.status === 'warn');

  return {
    executable: errors.length === 0,
    summary: {
      tables: dbResults.filter(r => r.op === 'CREATE TABLE').length,
      routes: apiResults.length,
      pages: uiResults.length,
      permissions: authResults.filter(r => r.op === 'PERMISSION').length,
      errors: errors.length,
      warnings: warnings.length
    },
    details: { dbResults, apiResults, authResults, uiResults },
    artifacts,
    issues: [...errors, ...warnings]
  };
}

module.exports = { runSimulation };
