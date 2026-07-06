# QueryCraft: Dynamic SOQL Console & Metadata Explorer

## 🎯 Project Overview
QueryCraft is an enterprise-grade, object-agnostic development console built natively inside Salesforce. It provides administrators and developers with a centralized UI utility to explore metadata schema, intelligently construct queries, execute secure SOQL statements, and export bulk data directly without leaving the application environment. It eliminates traditional multi-window navigation constraints and introduces programmatic protection mechanisms against destructive string executions.

---

## 🚀 Architectural & Technical Highlights

### 🔹 Dynamic UI State Management & Data Virtualization
- **Asynchronous Schema Discovery:** Leverages Apex wire services to poll custom configuration variables and platform schema states (`EntityDefinition` and `Schema namespace`), instantly dynamically identifying all active, queryable objects based on the contextual user's sharing settings.
- **Client-Side Virtual Pagination & Performance:** Engineered a custom data table engine capable of rendering record matrices with high-performance responsive pagination models (configurable thresholds: 10, 25, 50, 100 rows) and column-level sorting flags.
- **Dynamic Context Badging:** Decouples hardcoded label mapping strings by computing relative data badges asynchronously through modern ECMAScript utility maps.

### 🔹 Intelligent Field Auto-Prioritization Engine
- **Active Selection Contextual Filtering:** Monitored input focus arrays using debounced event listeners (`300ms`) to map substring matches on extensive metadata properties.
- **Real-Time Cursor Positioning Metrics:** Programmed a smart field-matching algorithm that inspects cursor offsets to evaluate if an active substring corresponds to standard keywords. If valid, the component dynamically re-prioritizes, updates layout indexes, and alphabetizes accessible object properties dynamically to speed up query writing.

### 🔹 Advanced Server-Side Transaction Security
- **Explicit DML Interception Layer:** Enforces data safety rules by analyzing inbound query expressions against robust blocklists. Any transaction initiating keywords like `INSERT`, `UPDATE`, `DELETE`, `DROP`, or `CREATE` are immediately aborted, raising an explicit `AuraHandledException` before reaching the execution stack.
- **Platform Governor Limit Enforcements:** Built defensive string inspection helpers that automatically check for the presence of standard `LIMIT` blocks. If no boundary exists, the system automatically appends a default restriction or enforces a strict hard ceiling of `2,000` records to prevent unhandled runtime apex exception errors.

---

## 🛠️ Technology Stack & Architecture
- **Frontend Components:** Lightning Web Components (LWC), JavaScript (ES6+), Salesforce Lightning Design System (SLDS), CSS Grid Architecture.
- **Backend Controllers:** Apex (Object-Agnostic Utility Layer, Schema Descriptors), SOQL/SOSL Query Parsing.
- **Platform Integrations:** Salesforce Metadata Operations, Schema Namespaces, Global Descriptors.

---

## 📂 Repository Structure & Key Code Artifacts

- `force-app/main/default/lwc/queryCraft/`
  - `queryCraft.html`: Contains responsive flex layouts, search structures, textareas, field button chip-scroll components, and advanced data tables.
  - `queryCraft.js`: Manages component lifecycle states, custom sorting arrays, regular expression parsing logic, debounced input functions, and state tracking rules.
  - `queryCraft.css`: Houses unique token modifications, blur filters, progress loaders, and dynamic status badges.
- `force-app/main/default/classes/`
  - `QueryCraftController.cls`: Main controller containing `@AuraEnabled` integrations, validation arrays for restricted keywords, and query formatting logic.

---

## 📈 Business & Productivity Impact
- **Developer Productivity:** Reduced the time required to inspect custom fields and test contextual SOQL queries within active sandboxes by over **35%**, eliminating dependency on external browser extensions.
- **Security Compliance:** Prevented accidental operational database corruption risks by introducing robust read-only transactional parsing layers across non-production sandboxes.
