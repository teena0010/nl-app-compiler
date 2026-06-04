/**
 * Renders a fully interactive single-page app from a generated config.
 * No frameworks needed — pure HTML/JS that uses the config as its schema.
 */

function renderApp(config, runId) {
  const { meta, ui, database, api, auth } = config;
  const appName = meta.appName;
  const pages = ui.pages;
  const tables = database.tables;
  const roles = auth.roles;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${appName}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#f8fafc;color:#1e293b;min-height:100vh}
:root{--primary:#6d28d9;--primary-light:#ede9fe;--sidebar-w:240px}

/* Layout */
#app{display:flex;min-height:100vh}
#sidebar{width:var(--sidebar-w);background:#1e1b4b;color:#c7d2fe;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;z-index:100;transition:transform .3s}
#sidebar.hidden{transform:translateX(-100%)}
#main{margin-left:var(--sidebar-w);flex:1;display:flex;flex-direction:column;transition:margin .3s}
#main.full{margin-left:0}

/* Auth pages */
.auth-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;background:linear-gradient(135deg,#1e1b4b,#4c1d95)}
.auth-card{background:#fff;border-radius:16px;padding:40px;width:100%;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.auth-card h2{font-size:24px;font-weight:700;color:#1e1b4b;margin-bottom:8px}
.auth-card p{color:#64748b;font-size:14px;margin-bottom:28px}

/* Sidebar */
.sidebar-brand{padding:20px;border-bottom:1px solid #312e81;font-weight:700;font-size:16px;color:#fff;display:flex;align-items:center;gap:8px}
.sidebar-brand span{font-size:20px}
.sidebar-section{padding:12px 16px 4px;font-size:10px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1px}
.nav-item{display:flex;align-items:center;gap:10px;padding:10px 20px;cursor:pointer;font-size:14px;color:#a5b4fc;border-left:3px solid transparent;transition:all .15s}
.nav-item:hover{background:#312e81;color:#fff}
.nav-item.active{background:#312e81;color:#fff;border-left-color:#818cf8}
.nav-item .icon{font-size:16px;width:20px;text-align:center}
.sidebar-footer{margin-top:auto;padding:16px;border-top:1px solid #312e81}
.user-info{display:flex;align-items:center;gap:10px}
.avatar{width:36px;height:36px;border-radius:50%;background:#4c1d95;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#c4b5fd}
.user-name{font-size:13px;font-weight:600;color:#e0e7ff}
.user-role{font-size:11px;color:#6366f1}

/* Topbar */
#topbar{background:#fff;border-bottom:1px solid #e2e8f0;padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}
.page-title{font-size:18px;font-weight:700;color:#1e293b}
.topbar-actions{display:flex;align-items:center;gap:12px}

/* Content */
#content{padding:24px;flex:1}

/* Components */
.card{background:#fff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;margin-bottom:20px}
.card-header{padding:16px 20px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between}
.card-header h3{font-size:15px;font-weight:600;color:#1e293b}
.card-body{padding:20px}

/* Stats grid */
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:24px}
.stat-card{background:#fff;border-radius:12px;padding:20px;border:1px solid #e2e8f0;display:flex;align-items:center;gap:16px}
.stat-icon{width:48px;height:48px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0}
.stat-val{font-size:24px;font-weight:700;color:#1e293b}
.stat-label{font-size:13px;color:#64748b;margin-top:2px}

/* Table */
.data-table{width:100%;border-collapse:collapse;font-size:13px}
.data-table th{background:#f8fafc;padding:10px 16px;text-align:left;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0;font-size:12px;text-transform:uppercase;letter-spacing:.4px}
.data-table td{padding:12px 16px;border-bottom:1px solid #f1f5f9;color:#1e293b}
.data-table tr:hover td{background:#f8fafc}
.data-table tr:last-child td{border-bottom:none}

/* Badges */
.badge{padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;display:inline-block}
.badge-purple{background:#ede9fe;color:#7c3aed}
.badge-green{background:#dcfce7;color:#16a34a}
.badge-blue{background:#dbeafe;color:#2563eb}
.badge-orange{background:#ffedd5;color:#c2410c}

/* Form */
.form-group{margin-bottom:18px}
.form-group label{display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px}
.form-group input,.form-group select,.form-group textarea{width:100%;border:1px solid #d1d5db;border-radius:8px;padding:10px 14px;font-size:14px;color:#1e293b;outline:none;transition:border-color .2s;background:#fff}
.form-group input:focus,.form-group select:focus,.form-group textarea:focus{border-color:#7c3aed;box-shadow:0 0 0 3px #ede9fe}
.form-group textarea{resize:vertical;min-height:80px}

/* Buttons */
.btn{padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
.btn-primary{background:#7c3aed;color:#fff}
.btn-primary:hover{background:#6d28d9}
.btn-secondary{background:#f1f5f9;color:#475569;border:1px solid #e2e8f0}
.btn-secondary:hover{background:#e2e8f0}
.btn-danger{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
.btn-danger:hover{background:#fee2e2}
.btn-sm{padding:6px 12px;font-size:12px}
.btn-success{background:#16a34a;color:#fff}

/* Modal */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:#fff;border-radius:16px;width:100%;max-width:500px;box-shadow:0 25px 50px rgba(0,0,0,.25);overflow:hidden}
.modal-header{padding:20px 24px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between}
.modal-header h3{font-size:16px;font-weight:700}
.modal-body{padding:24px}
.modal-footer{padding:16px 24px;border-top:1px solid #f1f5f9;display:flex;justify-content:flex-end;gap:10px}
.close-btn{background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;line-height:1}

/* Alert */
.alert{padding:12px 16px;border-radius:8px;font-size:13px;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.alert-error{background:#fef2f2;color:#dc2626;border:1px solid #fecaca}
.alert-success{background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0}

/* Chart bar */
.chart-bars{display:flex;align-items:flex-end;gap:8px;height:120px;padding:0 4px}
.chart-bar-wrap{display:flex;flex-direction:column;align-items:center;flex:1;gap:4px}
.chart-bar{width:100%;background:linear-gradient(180deg,#7c3aed,#a78bfa);border-radius:4px 4px 0 0;transition:height .5s}
.chart-label{font-size:10px;color:#94a3b8}
.chart-val{font-size:10px;font-weight:700;color:#7c3aed}

/* Empty state */
.empty{text-align:center;padding:40px;color:#94a3b8}
.empty .icon{font-size:40px;margin-bottom:8px}

/* Responsive */
@media(max-width:768px){#sidebar{transform:translateX(-100%)}#sidebar.open{transform:translateX(0)}#main{margin-left:0}.stats-grid{grid-template-columns:1fr 1fr}}

/* Toast */
#toast{position:fixed;bottom:24px;right:24px;z-index:999;display:flex;flex-direction:column;gap:8px}
.toast{background:#1e293b;color:#fff;padding:12px 18px;border-radius:10px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.2);animation:slideIn .3s ease;display:flex;align-items:center;gap:8px}
@keyframes slideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
</style>
</head>
<body>
<div id="app"></div>
<div id="toast"></div>

<script>
// ── App State ──────────────────────────────────────────────────────────────
const CONFIG = ${JSON.stringify({ meta, ui, database, api, auth }, null, 2)};
const RUN_ID = '${runId}';

const state = {
  currentUser: null,
  currentRole: null,
  currentPage: null,
  data: {},      // in-memory data store per table
  nextId: {}     // auto-increment ids
};

// Initialize in-memory store for each table
for (const table of CONFIG.database.tables) {
  state.data[table.name] = [];
  state.nextId[table.name] = 1;
  // Seed with sample data
  seedTable(table);
}

function seedTable(table) {
  const count = table.name === 'User' ? 5 : Math.floor(Math.random() * 6) + 3;
  for (let i = 0; i < count; i++) {
    const row = { id: state.nextId[table.name]++ };
    for (const field of table.fields) {
      if (field.name === 'id') continue;
      row[field.name] = generateSampleValue(field, table.name, i);
    }
    state.data[table.name].push(row);
  }
}

function generateSampleValue(field, tableName, i) {
  const n = field.name.toLowerCase();
  if (n === 'email') return \`user\${i+1}@example.com\`;
  if (n === 'name' || n === 'full_name') return ['Alice Johnson','Bob Smith','Carol White','David Lee','Eva Brown','Frank Miller','Grace Wilson'][i % 7];
  if (n === 'title') return [\`\${tableName} Item \${i+1}\`, 'Project Alpha', 'Task Beta', 'Issue Gamma'][i % 4];
  if (n === 'status') return ['active','pending','completed','inactive'][i % 4];
  if (n === 'role') return CONFIG.auth.roles[i % CONFIG.auth.roles.length];
  if (n === 'price' || n === 'amount') return ((i+1) * 29.99).toFixed(2);
  if (n === 'phone') return \`+1-555-010\${i}\`;
  if (n === 'description' || n === 'notes') return \`Sample \${tableName.toLowerCase()} description \${i+1}\`;
  if (n.includes('_at') || n.includes('date')) return new Date(Date.now() - i * 86400000 * 3).toISOString().split('T')[0];
  if (field.type === 'boolean') return i % 2 === 0;
  if (field.type === 'integer') return (i + 1) * 10;
  if (field.type === 'float') return ((i+1) * 9.99).toFixed(2);
  return \`\${tableName} \${field.name} \${i+1}\`;
}

// ── Toast ──────────────────────────────────────────────────────────────────
function toast(msg, type = 'info') {
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = \`<span>\${icon}</span><span>\${msg}</span>\`;
  document.getElementById('toast').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ── Auth ───────────────────────────────────────────────────────────────────
function login(email, password) {
  if (!email || !password) return false;
  // Find user in seeded data or create one
  const users = state.data['User'] || [];
  let user = users.find(u => u.email === email);
  if (!user && email.includes('@')) {
    // Auto-create user on login for demo
    user = { id: state.nextId['User']++, email, name: email.split('@')[0], role: CONFIG.auth.roles[0], status: 'active', created_at: new Date().toISOString() };
    state.data['User'].push(user);
  }
  if (user) {
    state.currentUser = user;
    state.currentRole = user.role || CONFIG.auth.roles[0];
    return true;
  }
  return false;
}

function logout() {
  state.currentUser = null;
  state.currentRole = null;
  renderPage('/login');
}

function canAccessPage(page) {
  if (!page.roles || page.roles.length === 0) return true;
  if (page.roles.includes('public') || page.roles.includes('all')) return true;
  if (!state.currentUser) return false;
  return page.roles.includes(state.currentRole);
}

// ── Router ─────────────────────────────────────────────────────────────────
function navigate(path) {
  const page = CONFIG.ui.pages.find(p => p.path === path);
  if (!page) return;
  if (!canAccessPage(page) && !['auth','public'].includes(page.layout)) {
    renderPage('/login');
    return;
  }
  state.currentPage = path;
  renderPage(path);
}

// ── Main Render ────────────────────────────────────────────────────────────
function renderPage(path) {
  const page = CONFIG.ui.pages.find(p => p.path === path);
  if (!page) { document.getElementById('app').innerHTML = '<div style="padding:40px;text-align:center">Page not found</div>'; return; }

  if (page.layout === 'auth' || page.layout === 'public') {
    document.getElementById('app').innerHTML = renderAuthPage(page);
  } else {
    document.getElementById('app').innerHTML = renderDashboardLayout(page);
  }
  attachEventListeners(page);
}

function renderAuthPage(page) {
  const isLogin = page.path === '/login';
  const isRegister = page.path === '/register';
  return \`
  <div class="auth-wrap">
    <div class="auth-card">
      <div style="text-align:center;margin-bottom:24px">
        <div style="font-size:40px;margin-bottom:8px">⚡</div>
        <h2>\${CONFIG.meta.appName}</h2>
        <p>\${isLogin ? 'Sign in to your account' : isRegister ? 'Create your account' : page.name}</p>
      </div>
      <div id="auth-alert"></div>
      \${isLogin ? renderLoginForm() : isRegister ? renderRegisterForm() : renderGenericForm(page)}
      \${isLogin ? \`<p style="text-align:center;margin-top:16px;font-size:13px;color:#64748b">Don't have an account? <a href="#" onclick="navigate('/register')" style="color:#7c3aed;font-weight:600">Sign up</a></p>\` : ''}
      \${isRegister ? \`<p style="text-align:center;margin-top:16px;font-size:13px;color:#64748b">Already have an account? <a href="#" onclick="navigate('/login')" style="color:#7c3aed;font-weight:600">Sign in</a></p>\` : ''}
    </div>
  </div>\`;
}

function renderLoginForm() {
  return \`
  <form onsubmit="handleLogin(event)">
    <div class="form-group"><label>Email</label><input type="email" id="login-email" placeholder="you@example.com" value="admin@example.com"/></div>
    <div class="form-group"><label>Password</label><input type="password" id="login-password" placeholder="••••••••" value="password"/></div>
    <div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">
      \${CONFIG.auth.roles.map(r => \`<span class="badge badge-purple" style="cursor:pointer" onclick="quickLogin('\${r}')">\${r}</span>\`).join('')}
      <span style="font-size:11px;color:#94a3b8;align-self:center">Quick login as role</span>
    </div>
    <button type="submit" class="btn btn-primary" style="width:100%">Sign In →</button>
  </form>\`;
}

function renderRegisterForm() {
  return \`
  <form onsubmit="handleRegister(event)">
    <div class="form-group"><label>Full Name</label><input type="text" id="reg-name" placeholder="Your name"/></div>
    <div class="form-group"><label>Email</label><input type="email" id="reg-email" placeholder="you@example.com"/></div>
    <div class="form-group"><label>Password</label><input type="password" id="reg-password" placeholder="••••••••"/></div>
    <div class="form-group"><label>Role</label><select id="reg-role">\${CONFIG.auth.roles.map(r=>\`<option value="\${r}">\${r}</option>\`).join('')}</select></div>
    <button type="submit" class="btn btn-primary" style="width:100%">Create Account →</button>
  </form>\`;
}

function renderGenericForm(page) {
  return \`<div class="empty"><div class="icon">📄</div><p>\${page.name}</p></div>\`;
}

function renderDashboardLayout(page) {
  return \`
  <div id="app" style="display:flex;min-height:100vh">
    \${renderSidebar(page)}
    <div id="main" style="margin-left:240px;flex:1;display:flex;flex-direction:column">
      \${renderTopbar(page)}
      <div id="content" style="padding:24px;flex:1;background:#f8fafc">
        \${renderPageContent(page)}
      </div>
    </div>
  </div>\`;
}

function renderSidebar(activePage) {
  const dashboardPages = CONFIG.ui.pages.filter(p => p.layout === 'dashboard' || p.layout === 'settings');
  const accessible = dashboardPages.filter(p => canAccessPage(p));
  const icons = { dashboard: '📊', contacts: '👥', users: '👤', analytics: '📈', settings: '⚙️', orders: '📦', products: '🛍️', reports: '📋', tasks: '✅', projects: '🗂️', profile: '👤', billing: '💳', default: '📄' };
  const getIcon = (name) => { const k = Object.keys(icons).find(k => name.toLowerCase().includes(k)); return icons[k] || icons.default; };

  return \`
  <div id="sidebar" style="width:240px;background:#1e1b4b;color:#c7d2fe;display:flex;flex-direction:column;position:fixed;top:0;left:0;height:100vh;z-index:100">
    <div style="padding:20px;border-bottom:1px solid #312e81;font-weight:700;font-size:16px;color:#fff;display:flex;align-items:center;gap:8px">
      <span>⚡</span>\${CONFIG.meta.appName}
    </div>
    <div style="flex:1;overflow-y:auto;padding:8px 0">
      <div style="padding:12px 16px 4px;font-size:10px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:1px">Navigation</div>
      \${accessible.map(p => \`
        <div class="nav-item \${activePage.path === p.path ? 'active' : ''}" onclick="navigate('\${p.path}')">
          <span class="icon">\${getIcon(p.name)}</span>\${p.name}
        </div>\`).join('')}
    </div>
    <div style="padding:16px;border-top:1px solid #312e81">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="width:36px;height:36px;border-radius:50%;background:#4c1d95;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;color:#c4b5fd">\${(state.currentUser?.name||'U')[0].toUpperCase()}</div>
        <div>
          <div style="font-size:13px;font-weight:600;color:#e0e7ff">\${state.currentUser?.name || state.currentUser?.email || 'User'}</div>
          <div style="font-size:11px;color:#6366f1">\${state.currentRole}</div>
        </div>
      </div>
      <button class="btn btn-secondary btn-sm" style="width:100%;background:#312e81;color:#a5b4fc;border-color:#4338ca" onclick="logout()">Sign Out</button>
    </div>
  </div>\`;
}

function renderTopbar(page) {
  return \`
  <div style="background:#fff;border-bottom:1px solid #e2e8f0;padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50">
    <div style="font-size:18px;font-weight:700;color:#1e293b">\${page.name}</div>
    <div style="display:flex;align-items:center;gap:12px">
      <span class="badge badge-purple">\${state.currentRole}</span>
      <span style="font-size:13px;color:#64748b">\${state.currentUser?.email || ''}</span>
    </div>
  </div>\`;
}

function renderPageContent(page) {
  // Find the best matching table for this page
  const tableMatch = findTableForPage(page);
  const components = page.components || [];

  if (page.path === '/dashboard' || page.name.toLowerCase().includes('dashboard')) {
    return renderDashboard(page, tableMatch);
  }

  let html = '';
  if (components.length === 0 || !tableMatch) {
    html = renderTablePage(page, tableMatch);
  } else {
    for (const comp of components) {
      if (comp.type === 'table') html += renderTableComponent(page, tableMatch, comp);
      else if (comp.type === 'form') html += renderFormComponent(page, tableMatch, comp);
      else if (comp.type === 'chart') html += renderChartComponent(tableMatch);
      else if (comp.type === 'card') html += renderCardsComponent(page, tableMatch);
      else html += renderTablePage(page, tableMatch);
    }
    if (!html) html = renderTablePage(page, tableMatch);
  }
  return html;
}

function findTableForPage(page) {
  const pageName = page.name.toLowerCase().replace(/\s/g,'');
  // Try exact match first
  let table = CONFIG.database.tables.find(t => t.name.toLowerCase() === pageName || pageName.includes(t.name.toLowerCase()) || t.name.toLowerCase().includes(pageName));
  if (!table) {
    // Try matching by page path
    const pathPart = page.path.split('/').pop();
    table = CONFIG.database.tables.find(t => t.name.toLowerCase().includes(pathPart) || pathPart.includes(t.name.toLowerCase()));
  }
  if (!table) table = CONFIG.database.tables.find(t => t.name !== 'User') || CONFIG.database.tables[0];
  return table;
}

function renderDashboard(page, table) {
  const statColors = ['#ede9fe','#dbeafe','#dcfce7','#ffedd5','#fce7f3'];
  const statIcons = ['📊','👥','💰','✅','📈'];
  const stats = CONFIG.database.tables.slice(0,5).map((t,i) => ({
    label: t.name,
    value: state.data[t.name]?.length || 0,
    icon: statIcons[i],
    color: statColors[i]
  }));

  const recent = table ? (state.data[table.name] || []).slice(-5).reverse() : [];
  const fields = table ? table.fields.filter(f => !['id','created_at','updated_at','createdAt','updatedAt'].includes(f.name)).slice(0,4) : [];
  const tableLinkName = table ? table.name.toLowerCase() : '';

  return \`
  <div class="stats-grid">
    \${stats.map(s => \`
      <div class="stat-card">
        <div class="stat-icon" style="background:\${s.color}">\${s.icon}</div>
        <div><div class="stat-val">\${s.value}</div><div class="stat-label">\${s.label} Records</div></div>
      </div>\`).join('')}
  </div>
  \${renderChartComponent(table)}
  \${table ? \`
  <div class="card">
    <div class="card-header"><h3>Recent \${table.name} Records</h3><button class="btn btn-secondary btn-sm" onclick="navigate('/\${tableLinkName}')">View All</button></div>
    <div style="overflow-x:auto">
      <table class="data-table">
        <thead><tr>\${fields.map(f=>\`<th>\${f.name}</th>\`).join('')}</tr></thead>
        <tbody>\${recent.map(row => \`<tr>\${fields.map(f=>\`<td>\${renderCellValue(row[f.name],f)}</td>\`).join('')}</tr>\`).join('')}</tbody>
      </table>
    </div>
  </div>\` : ''}
  \`;
}

function renderTablePage(page, table) {
  if (!table) return \`<div class="empty"><div class="icon">📭</div><p>No data available</p></div>\`;
  return renderTableComponent(page, table, {});
}

function renderTableComponent(page, table, comp) {
  if (!table) return '';
  const rows = state.data[table.name] || [];
  const fields = table.fields.filter(f => !['id','created_at','updated_at','createdAt','updatedAt'].includes(f.name)).slice(0,6);
  const canWrite = true;

  return \`
  <div class="card">
    <div class="card-header">
      <h3>\${table.name} <span class="badge badge-purple" style="font-size:11px">\${rows.length} records</span></h3>
      <div style="display:flex;gap:8px">
        <input type="text" placeholder="Search..." oninput="filterTable('\${table.name}',this.value)" style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:13px;outline:none;width:180px"/>
        \${canWrite ? \`<button class="btn btn-primary btn-sm" onclick="openCreateModal('\${table.name}')">+ New \${table.name}</button>\` : ''}
      </div>
    </div>
    <div style="overflow-x:auto">
      <table class="data-table" id="table-\${table.name}">
        <thead><tr>
          \${fields.map(f=>\`<th>\${f.name.replace(/_/g,' ')}</th>\`).join('')}
          <th>Actions</th>
        </tr></thead>
        <tbody>
          \${rows.length === 0 ? \`<tr><td colspan="\${fields.length+1}" style="text-align:center;padding:40px;color:#94a3b8">No records yet. Click "+ New \${table.name}" to add one.</td></tr>\` :
          rows.map(row => \`<tr id="row-\${table.name}-\${row.id}">
            \${fields.map(f=>\`<td>\${renderCellValue(row[f.name],f)}</td>\`).join('')}
            <td>
              <button class="btn btn-secondary btn-sm" onclick="openEditModal('\${table.name}',\${row.id})" style="margin-right:4px">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteRow('\${table.name}',\${row.id})">Delete</button>
            </td>
          </tr>\`).join('')}
        </tbody>
      </table>
    </div>
  </div>\`;
}

function renderFormComponent(page, table, comp) {
  if (!table) return '';
  const fields = table.fields.filter(f => !['id','created_at','updated_at','createdAt','updatedAt'].includes(f.name));
  return \`
  <div class="card">
    <div class="card-header"><h3>\${page.name} Form</h3></div>
    <div class="card-body">
      <form onsubmit="handleFormSubmit(event,'\${table.name}')">
        \${fields.slice(0,6).map(f => \`
        <div class="form-group">
          <label>\${f.name.replace(/_/g,' ')}</label>
          \${f.type === 'boolean' ? \`<select name="\${f.name}"><option value="true">Yes</option><option value="false">No</option></select>\`
            : f.type === 'text' ? \`<textarea name="\${f.name}" placeholder="\${f.name}..."></textarea>\`
            : \`<input type="\${f.type==='integer'||f.type==='float'?'number':f.name.includes('email')?'email':f.name.includes('password')?'password':f.name.includes('date')?'date':'text'}" name="\${f.name}" placeholder="\${f.name}..."/>\`}
        </div>\`).join('')}
        <button type="submit" class="btn btn-primary">Submit</button>
      </form>
    </div>
  </div>\`;
}

function renderChartComponent(table) {
  if (!table) return '';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul'];
  const values = months.map(() => Math.floor(Math.random()*80)+20);
  const max = Math.max(...values);
  return \`
  <div class="card" style="margin-bottom:20px">
    <div class="card-header"><h3>\${table.name} Activity (Last 7 months)</h3></div>
    <div class="card-body">
      <div style="display:flex;align-items:flex-end;gap:8px;height:140px;padding:0 4px">
        \${months.map((m,i) => \`
        <div style="display:flex;flex-direction:column;align-items:center;flex:1;gap:4px">
          <span style="font-size:10px;font-weight:700;color:#7c3aed">\${values[i]}</span>
          <div style="width:100%;background:linear-gradient(180deg,#7c3aed,#a78bfa);border-radius:4px 4px 0 0;height:\${(values[i]/max*100)}px;transition:height .5s"></div>
          <span style="font-size:10px;color:#94a3b8">\${m}</span>
        </div>\`).join('')}
      </div>
    </div>
  </div>\`;
}

function renderCardsComponent(page, table) {
  if (!table) return '';
  const rows = (state.data[table.name] || []).slice(0,6);
  const nameField = table.fields.find(f => ['name','title','email'].includes(f.name));
  const descField = table.fields.find(f => ['description','notes','status'].includes(f.name));
  return \`
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;margin-bottom:20px">
    \${rows.map(row => \`
    <div class="card" style="margin:0">
      <div class="card-body">
        <div style="font-weight:600;margin-bottom:4px">\${nameField ? row[nameField.name] : \`\${table.name} #\${row.id}\`}</div>
        \${descField ? \`<div style="font-size:13px;color:#64748b">\${row[descField.name]}</div>\` : ''}
        <div style="margin-top:12px;display:flex;justify-content:flex-end;gap:6px">
          <button class="btn btn-secondary btn-sm" onclick="openEditModal('\${table.name}',\${row.id})">Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteRow('\${table.name}',\${row.id})">Delete</button>
        </div>
      </div>
    </div>\`).join('')}
  </div>\`;
}

function renderCellValue(val, field) {
  if (val === undefined || val === null) return '<span style="color:#cbd5e1">—</span>';
  if (field.name === 'status') {
    const colors = { active:'badge-green', completed:'badge-blue', pending:'badge-orange', inactive:'badge-purple' };
    return \`<span class="badge \${colors[val]||'badge-purple'}">\${val}</span>\`;
  }
  if (field.name === 'role') return \`<span class="badge badge-purple">\${val}</span>\`;
  if (field.type === 'boolean') return val ? '✅' : '❌';
  if (typeof val === 'string' && val.length > 40) return val.slice(0,40) + '…';
  return val;
}

// ── CRUD Operations ────────────────────────────────────────────────────────
function openCreateModal(tableName) {
  const table = CONFIG.database.tables.find(t => t.name === tableName);
  const fields = table.fields.filter(f => !['id','created_at','updated_at','createdAt','updatedAt'].includes(f.name));
  showModal(\`New \${tableName}\`, \`
    <form id="modal-form">
      \${fields.map(f => \`
      <div class="form-group">
        <label>\${f.name.replace(/_/g,' ')}</label>
        \${f.name === 'role' ? \`<select name="\${f.name}">\${CONFIG.auth.roles.map(r=>\`<option>\${r}</option>\`).join('')}</select>\`
          : f.type === 'boolean' ? \`<select name="\${f.name}"><option value="true">Yes</option><option value="false">No</option></select>\`
          : f.type === 'text' ? \`<textarea name="\${f.name}" placeholder="\${f.name}..."></textarea>\`
          : \`<input type="\${f.type==='integer'||f.type==='float'?'number':f.name.includes('email')?'email':f.name.includes('date')?'date':'text'}" name="\${f.name}" placeholder="\${f.name}..."/>\`}
      </div>\`).join('')}
    </form>
  \`, [{label:'Cancel',cls:'btn-secondary',action:'close'},{label:'Create',cls:'btn-primary',action:\`createRow('\${tableName}')\`}]);
}

function openEditModal(tableName, id) {
  const table = CONFIG.database.tables.find(t => t.name === tableName);
  const row = state.data[tableName].find(r => r.id === id);
  if (!row) return;
  const fields = table.fields.filter(f => !['id','created_at','updated_at','createdAt','updatedAt'].includes(f.name));
  showModal(\`Edit \${tableName}\`, \`
    <form id="modal-form">
      \${fields.map(f => \`
      <div class="form-group">
        <label>\${f.name.replace(/_/g,' ')}</label>
        \${f.name === 'role' ? \`<select name="\${f.name}">\${CONFIG.auth.roles.map(r=>\`<option \${row[f.name]===r?'selected':''}>\${r}</option>\`).join('')}</select>\`
          : f.type === 'boolean' ? \`<select name="\${f.name}"><option value="true" \${row[f.name]?'selected':''}>Yes</option><option value="false" \${!row[f.name]?'selected':''}>No</option></select>\`
          : f.type === 'text' ? \`<textarea name="\${f.name}">\${row[f.name]||''}</textarea>\`
          : \`<input type="\${f.type==='integer'||f.type==='float'?'number':f.name.includes('email')?'email':f.name.includes('date')?'date':'text'}" name="\${f.name}" value="\${row[f.name]||''}"/>\`}
      </div>\`).join('')}
    </form>
  \`, [{label:'Cancel',cls:'btn-secondary',action:'close'},{label:'Save',cls:'btn-primary',action:\`updateRow('\${tableName}',\${id})\`}]);
}

function createRow(tableName) {
  const form = document.getElementById('modal-form');
  const data = Object.fromEntries(new FormData(form));
  data.id = state.nextId[tableName]++;
  data.created_at = new Date().toISOString();
  state.data[tableName].push(data);
  closeModal();
  toast(\`\${tableName} created\`, 'success');
  navigate(state.currentPage);
}

function updateRow(tableName, id) {
  const form = document.getElementById('modal-form');
  const data = Object.fromEntries(new FormData(form));
  const idx = state.data[tableName].findIndex(r => r.id === id);
  if (idx !== -1) state.data[tableName][idx] = { ...state.data[tableName][idx], ...data };
  closeModal();
  toast(\`\${tableName} updated\`, 'success');
  navigate(state.currentPage);
}

function deleteRow(tableName, id) {
  if (!confirm('Delete this record?')) return;
  state.data[tableName] = state.data[tableName].filter(r => r.id !== id);
  toast(\`\${tableName} deleted\`, 'success');
  navigate(state.currentPage);
}

function filterTable(tableName, query) {
  const table = document.getElementById(\`table-\${tableName}\`);
  if (!table) return;
  const rows = table.querySelectorAll('tbody tr');
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(query.toLowerCase()) ? '' : 'none';
  });
}

function handleFormSubmit(e, tableName) {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.id = state.nextId[tableName]++;
  data.created_at = new Date().toISOString();
  state.data[tableName].push(data);
  toast('Submitted successfully!', 'success');
  e.target.reset();
}

// ── Modal ──────────────────────────────────────────────────────────────────
function showModal(title, body, buttons) {
  const btns = buttons.map(b => \`<button class="btn \${b.cls}" onclick="\${b.action === 'close' ? 'closeModal()' : b.action + ';closeModal()'}">\${b.label}</button>\`).join('');
  const el = document.createElement('div');
  el.className = 'modal-overlay';
  el.id = 'modal-overlay';
  el.onclick = e => { if (e.target === el) closeModal(); };
  el.innerHTML = \`
    <div class="modal">
      <div class="modal-header"><h3>\${title}</h3><button class="close-btn" onclick="closeModal()">✕</button></div>
      <div class="modal-body">\${body}</div>
      <div class="modal-footer">\${btns}</div>
    </div>\`;
  document.body.appendChild(el);
}

function closeModal() {
  document.getElementById('modal-overlay')?.remove();
}

// ── Auth Handlers ──────────────────────────────────────────────────────────
function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  if (login(email, password)) {
    toast(\`Welcome back!\`, 'success');
    const firstDashPage = CONFIG.ui.pages.find(p => p.layout === 'dashboard');
    navigate(firstDashPage?.path || '/dashboard');
  } else {
    document.getElementById('auth-alert').innerHTML = '<div class="alert alert-error">❌ Invalid credentials. Try any email + any password.</div>';
  }
}

function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const role = document.getElementById('reg-role').value;
  if (!name || !email) return;
  const user = { id: state.nextId['User']++, name, email, role, status: 'active', created_at: new Date().toISOString() };
  state.data['User'] = state.data['User'] || [];
  state.data['User'].push(user);
  state.currentUser = user;
  state.currentRole = role;
  toast('Account created!', 'success');
  const firstDashPage = CONFIG.ui.pages.find(p => p.layout === 'dashboard');
  navigate(firstDashPage?.path || '/dashboard');
}

function quickLogin(role) {
  const email = \`\${role}@example.com\`;
  const existing = (state.data['User']||[]).find(u=>u.email===email);
  if (existing) { state.currentUser = existing; state.currentRole = role; }
  else {
    const user = { id: state.nextId['User']++, name: role, email, role, status:'active', created_at: new Date().toISOString() };
    state.data['User'] = state.data['User'] || [];
    state.data['User'].push(user);
    state.currentUser = user;
    state.currentRole = role;
  }
  toast(\`Logged in as \${role}\`, 'success');
  const firstDashPage = CONFIG.ui.pages.find(p => p.layout === 'dashboard');
  navigate(firstDashPage?.path || '/dashboard');
}

function attachEventListeners(page) {}

// ── Boot ───────────────────────────────────────────────────────────────────
navigate('/login');
</script>
</body>
</html>`;
}

module.exports = { renderApp };
