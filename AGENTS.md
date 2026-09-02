# RPro System Official Rules

## Dashboard (Painel)
- **Interactive Control Center**: The dashboard is a central control hub. Every element must be clickable and navigate to its respective operational module.
- **Company Selector**: Must exist at the top. Switching companies must refresh all charts, lists, and widgets across the dashboard.
- **Revenue Block**: Must feature a dynamic chart (Line/Bar) with period filters (Hoje, Ontem, 7 dias, 30 dias, Personalizado). Clicking the chart or points must show granular details (Daily value, sales qty, services qty, entries qty).
- **Services Block**: Must list recent services (Client, Value, Status, Date, Responsible, Company). Clicking opens the full services list for management.
- **Real Estate Sales Block**: Exclusively shows real estate lot sales. Must NOT count PDV sales. Shows total sales, value, and count.
- **Pending Entries Block**: Focuses on unfinished financial flows (partially paid entries). Shows client, total, paid, balance, type, date, and responsible.

## CRM & Messaging
- **Automated Entry**: ALL incoming messages (from any channel) must automatically generate a lead in the "ENTRADA" column of the CRM Funnel.
- **Seamless Integration**: One can start a sale directly from the CRM lead or Real Estate module, navigating straight to the POS with pre-filled customer data.

## Point of Sale (PDV)
- **Persistence**: The register (caixa) status is persistent across module navigation. It remains open until explicitly closed by the user.
- **Flexible Flow**: Customer identification is preferred before payment. Scheduling is optional with a clear "Skip" path.

## Code Maintenance & Safety
- **No Full Rewrites of Modules.tsx**: NEVER rewrite `src/components/Modules.tsx` (or large files) completely. Always make surgical, pinpoint edits (`edit_file` / `multi_edit_file`) on specific lines to preserve all existing functionality and avoid truncation or corruption.
