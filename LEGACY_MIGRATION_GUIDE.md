# Legacy Data Migration Guide

## Overview
This guide helps you migrate old Supabase project data to a new project while maintaining read-only access in the dashboard.

## Table Structure

Created 5 legacy snapshot tables + 7 unified views:

| Legacy Table | Unified View | Purpose |
|---|---|---|
| `legacy_orders` | `app_orders` | Order history (read-only) |
| `legacy_ride_feedbacks` | `app_ride_feedbacks` | Customer feedback archive |
| `legacy_bot_events` | `app_bot_events` | Telegram bot event logs |
| `legacy_order_status_logs` | `app_order_status_logs` | Order status change history |
| `legacy_order_driver_assignments` | `app_order_driver_assignments` | Driver assignment records |

**Derived Views (from legacy_ride_feedbacks & legacy_orders):**

| Source Data | Unified View | Purpose |
|---|---|---|
| `legacy_ride_feedbacks` | `app_driver_ratings` | Aggregated driver ratings (new + legacy) |
| `legacy_orders` | `app_orders_with_reassignments` | Orders with reassignments (new + legacy) |

## Key Columns in Each Legacy Table

- `old_id` — Original ID from legacy project (UNIQUE, for deduplication)
- `source` — Always `'legacy'` (vs `'new'` in current data)
- `migrated_at` — Timestamp when row was imported

## Data Migration Steps

### Step 1: Deploy Migration SQL
```bash
# Option A: Using Supabase CLI (if configured)
supabase migration up

# Option B: Manual — copy/paste 003_legacy_tables.sql into Supabase Studio SQL Editor
```

### Step 2: Export Data from Legacy Project

For each table, export as CSV or JSON:

**In Supabase Studio (legacy project):**
1. Go to SQL Editor
2. Run:
   ```sql
   SELECT * FROM orders WHERE final_status IS NOT NULL ORDER BY created_at DESC;
   SELECT * FROM ride_feedbacks ORDER BY created_at DESC;
   SELECT * FROM bot_events ORDER BY created_at DESC;
   SELECT * FROM order_status_logs ORDER BY created_at DESC;
   SELECT * FROM order_driver_assignments ORDER BY created_at DESC;
   ```
3. Export each result as CSV

### Step 3: Import into New Project

**In new Supabase project SQL Editor, run:**

```sql
-- Import orders
COPY legacy_orders (old_id, address, amount, ...) 
FROM STDIN WITH (FORMAT csv, HEADER true);

-- [Paste CSV data here]
```

**OR use a Python/Node script:**
```bash
# Node.js example
npm install @supabase/supabase-js csv-parser

node migrate-legacy-data.js
```

### Step 4: Verify Data
```sql
-- Check row counts
SELECT COUNT(*) as total, source FROM app_orders GROUP BY source;
SELECT COUNT(*) as total, source FROM app_ride_feedbacks GROUP BY source;

-- Check for duplicates
SELECT old_id, COUNT(*) FROM legacy_orders GROUP BY old_id HAVING COUNT(*) > 1;
```

## API Updates (Next Steps)

Once legacy data is in new project, update these API routes to query unified views:

- `app/api/orders/active` → select from `app_orders WHERE final_status IS NULL`
- `app/api/drivers/[id]/route.ts` → select from `app_driver_ratings` instead of `driver_ratings`
- `app/(dashboard)/feedback/page.tsx` → select from `app_ride_feedbacks`
- `app/(dashboard)/events/page.tsx` → select from `app_bot_events`
- `app/(dashboard)/orders/[id]/ManualAssign.tsx` → select from `app_orders_with_reassignments`
- `app/api/settings/...` → keep current (no legacy needed for settings)

Example patch:
```typescript
// Before
const { data } = await supabase.from('orders').select(...);
const { data } = await supabase.from('driver_ratings').select(...);

// After
const { data } = await supabase.from('app_orders').select(...);
const { data } = await supabase.from('app_driver_ratings').select(...);
```

## Important Notes

⚠️ **Legacy tables are read-only**
- Don't insert/update into legacy_* tables directly (except during migration)
- Only update through legacy project export → import flow
- Current live data goes to `orders`, `ride_feedbacks`, etc. (not legacy_*)

✅ **Unified views handle both**
- Views combine new + legacy data automatically
- No code changes needed after API route updates
- Pagination works across both sources (sort/limit on views, not before UNION)

🔄 **Realtime doesn't work on legacy rows**
- Supabase realtime listens to actual tables, not views
- Legacy rows are static history — OK to skip realtime for them
- New rows still get realtime updates

📊 **UI Source Badge (Optional)**
- Add `source` column to table display
- Show "New" (blue) or "Legacy" (gray) badge
- Helps users understand data age

## Environment Variables

No changes needed to `.env.local`:
- Keep `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_KEY` pointing to **new** project
- Legacy project is only used during CSV export (one-time operation)

## Cleanup (After Cutover)

Once confirmed all data works:
1. Delete env var for legacy project
2. Archive old project (don't delete yet — keep as backup)
3. Monitor new project for 1-2 weeks
4. Delete legacy tables/views after validation ✅
