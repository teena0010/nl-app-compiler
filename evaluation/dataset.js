const DATASET = {
  real: [
    {
      id: 'r01',
      category: 'crm',
      prompt: "Build a CRM with login, contacts, dashboard, role-based access, and premium plan with payments. Admins can see analytics.",
      expectedFeatures: ['login', 'contacts', 'dashboard', 'rbac', 'payments', 'analytics'],
      expectedEntities: ['User', 'Contact'],
      expectedRoles: ['admin', 'user'],
      expectedTables: ['User', 'Contact'],
      requiredPages: ['/login', '/register', '/dashboard'],
      mustBeExecutable: true
    },
    {
      id: 'r02',
      category: 'ecommerce',
      prompt: "Build an e-commerce platform with product catalog, shopping cart, checkout with Stripe, order tracking, and admin inventory management.",
      expectedFeatures: ['catalog', 'cart', 'checkout', 'orders', 'inventory'],
      expectedEntities: ['User', 'Product', 'Order', 'Cart'],
      expectedRoles: ['admin', 'customer'],
      mustBeExecutable: true
    },
    {
      id: 'r03',
      category: 'project-management',
      prompt: "Create a project management tool with sprints, tickets, team assignments, comments, file attachments, manager and developer roles.",
      expectedFeatures: ['sprints', 'tickets', 'comments', 'attachments', 'rbac'],
      expectedEntities: ['User', 'Project', 'Ticket', 'Sprint', 'Comment'],
      expectedRoles: ['manager', 'developer'],
      mustBeExecutable: true
    },
    {
      id: 'r04',
      category: 'saas',
      prompt: "SaaS analytics platform where companies track events, funnels, cohort analysis. Free/pro/enterprise plans with usage limits.",
      expectedFeatures: ['events', 'funnels', 'cohorts', 'billing', 'plans'],
      expectedEntities: ['User', 'Organization', 'Event', 'Plan'],
      expectedRoles: ['owner', 'member'],
      mustBeExecutable: true
    },
    {
      id: 'r05',
      category: 'hrms',
      prompt: "HR management system with employee profiles, leave management, payroll, performance reviews, org chart, and HR admin role.",
      expectedEntities: ['User', 'Employee', 'Leave', 'Payroll'],
      expectedRoles: ['hr_admin', 'employee', 'manager'],
      mustBeExecutable: true
    },
    {
      id: 'r06',
      category: 'lms',
      prompt: "Online learning platform where instructors create courses with video lessons and quizzes, students enroll and track progress, with certificate generation.",
      expectedEntities: ['User', 'Course', 'Lesson', 'Enrollment'],
      expectedRoles: ['instructor', 'student'],
      mustBeExecutable: true
    },
    {
      id: 'r07',
      category: 'healthcare',
      prompt: "Patient management system for clinics: appointment booking, doctor schedules, patient records, prescriptions, billing, and role-based access for doctors/nurses/admin.",
      expectedEntities: ['User', 'Patient', 'Appointment', 'Prescription'],
      expectedRoles: ['doctor', 'nurse', 'admin'],
      mustBeExecutable: true
    },
    {
      id: 'r08',
      category: 'marketplace',
      prompt: "Freelancer marketplace where clients post jobs, freelancers bid, contracts are managed, payments via escrow, and rating system.",
      expectedEntities: ['User', 'Job', 'Bid', 'Contract', 'Review'],
      expectedRoles: ['client', 'freelancer'],
      mustBeExecutable: true
    },
    {
      id: 'r09',
      category: 'social',
      prompt: "Community platform with posts, comments, likes, following system, DMs, user profiles, moderator controls, and content reporting.",
      expectedEntities: ['User', 'Post', 'Comment', 'Follow'],
      expectedRoles: ['user', 'moderator', 'admin'],
      mustBeExecutable: true
    },
    {
      id: 'r10',
      category: 'inventory',
      prompt: "Inventory management for warehouses: products, suppliers, purchase orders, stock tracking, low-stock alerts, and barcode scanning support.",
      expectedEntities: ['User', 'Product', 'Supplier', 'PurchaseOrder'],
      expectedRoles: ['warehouse_manager', 'staff'],
      mustBeExecutable: true
    }
  ],
  edge: [
    {
      id: 'e01',
      category: 'vague',
      prompt: "I want an app for my business.",
      expectedBehavior: 'should_make_assumptions',
      expectedAssumptions: true,
      mustBeExecutable: false // may not be fully executable due to ambiguity
    },
    {
      id: 'e02',
      category: 'vague',
      prompt: "Build something like Airbnb but better.",
      expectedBehavior: 'should_infer_from_reference',
      expectedEntities: ['User', 'Listing'],
      mustBeExecutable: true
    },
    {
      id: 'e03',
      category: 'conflicting',
      prompt: "Build a social app where users can post content but also its an e-commerce store and also users are anonymous but also have profiles and can make purchases.",
      expectedBehavior: 'should_resolve_conflicts',
      conflictingRequirements: ['anonymous users', 'user profiles', 'purchases'],
      mustBeExecutable: true
    },
    {
      id: 'e04',
      category: 'conflicting',
      prompt: "Make it so all users are admins and no one has permissions and everything is public and also protected.",
      expectedBehavior: 'should_resolve_rbac_conflict',
      mustBeExecutable: true
    },
    {
      id: 'e05',
      category: 'incomplete',
      prompt: "Build an app with login.",
      expectedBehavior: 'should_generate_minimal_valid_app',
      mustBeExecutable: true
    },
    {
      id: 'e06',
      category: 'incomplete',
      prompt: "CRUD app for managing things with a nice UI.",
      expectedBehavior: 'should_make_assumptions_and_generate',
      mustBeExecutable: true
    },
    {
      id: 'e07',
      category: 'overspecified',
      prompt: "Build an app with 50 tables, 200 API endpoints, real-time websockets, AI recommendations, blockchain payments, AR interface, voice control, and offline-first PWA.",
      expectedBehavior: 'should_scope_appropriately',
      mustBeExecutable: true
    },
    {
      id: 'e08',
      category: 'domain-specific',
      prompt: "Build a SCADA system for industrial IoT with PLC integration, modbus protocol, real-time sensor data, alarm management, and OPC-UA server.",
      expectedBehavior: 'should_handle_specialized_domain',
      mustBeExecutable: true
    },
    {
      id: 'e09',
      category: 'multi-tenant',
      prompt: "Multi-tenant SaaS where each company gets isolated data, custom domains, SSO integration, and their own admin panel.",
      expectedBehavior: 'should_include_tenancy',
      expectedEntities: ['User', 'Organization', 'Tenant'],
      mustBeExecutable: true
    },
    {
      id: 'e10',
      category: 'minimal',
      prompt: "todo",
      expectedBehavior: 'should_handle_minimal_input',
      mustBeExecutable: true
    }
  ]
};

module.exports = { DATASET };
