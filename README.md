# Craic HQ 1.1.5 — HACCP Linking Patch

Data-preserving patch based on Craic HQ 1.1.4 Packaging Manager.

Fixes:
- Completed batches display HACCP records from the same production date, including records entered afterwards.
- Existing saved HACCP links remain intact.
- Duplicate HACCP records are not displayed twice.
- After completing a batch, the app asks whether to create a Production HACCP record.
- Generated records include date, operator, batch code, blend, planned quantity, actual quantity and Pass result.
- Duplicate automatic Production HACCP records for the same batch are blocked.
- Adds Production and Supplier Delivery Check as HACCP record types.

Unchanged:
- Ingredient and packaging stock
- Supplier lots
- Production calculations
- Recipes
- Costing
- Reports
- Existing batches
- Existing HACCP records
- Existing traceability history

Export a backup before updating, then upload all files to the GitHub repository root.
