# QueryCraft: Dynamic SOQL Console & Metadata Explorer

## 🎯 Overview
QueryCraft is a high-performance, custom administrative console built completely within Salesforce using Lightning Web Components (LWC) and an optimized Apex processing backend. It bypasses standard developer console limits to provide a streamlined, secure query interface for system administrators.

## 🚀 Key Technical Features
- **Dynamic Schema Exploration:** Explores org metadata dynamically using the Schema namespace and EntityDefinition based on active user sharing visibility.
- **Real-Time Input Matching:** Features a client-side utility that re-prioritizes and alphabetizes accessible fields dynamically based on live cursor inputs.
- **Server-Side Security Enforcements:** Implemented an Apex validation layer designed to explicitly block transactional DML keywords (INSERT, UPDATE, DELETE) and enforce safety execution LIMIT restrictions.
- **Data Table Virtualization:** Built custom interactive UI tables supporting dynamic ascending/descending column sorting alongside client-side CSV extraction.

## 🛠️ Tech Stack
- Frontend: Lightning Web Components (LWC), JavaScript (ES6+), SLDS, CSS3
- Backend: Apex (Controller, Utility Frameworks), SOQL, Schema Namespace, Metadata API
