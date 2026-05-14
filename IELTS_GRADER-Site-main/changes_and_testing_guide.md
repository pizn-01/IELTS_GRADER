# Whisperoo — Changes & Testing Guide

> **Date:** May 9, 2026  
> **Commit:** `91f4286` → `main`  
> **Edge Function Deployed:** `create-payment` ✅

---

## Table of Contents

1. [Expert Inquiry Confirmation Modal](#1-expert-inquiry-confirmation-modal)
2. [SuperAdmin Consultation Oversight](#2-superadmin-consultation-oversight)
3. [Discount Code Usage Tracking](#3-discount-code-usage-tracking)
4. [Hospital Resource Tenant Scoping](#4-hospital-resource-tenant-scoping)
5. [QR Code Onboarding Attribution](#5-qr-code-onboarding-attribution)
6. [Migration Deployment Order](#6-migration-deployment-order)

---

## 1. Expert Inquiry Confirmation Modal

### What Changed

When users request an appointment with an **inquiry-based** expert, they now see a polished confirmation modal instead of a simple toast notification. SuperAdmins can customize the message shown in this modal per-expert.

### Files Modified

| File | What Changed |
|------|--------------|
| `supabase/migrations/20260509_inquiry_message.sql` | Added `inquiry_confirmation_message` column to `profiles` |
| `supabase/migrations/20260509_update_create_expert_rpc.sql` | Updated `fn_admin_create_expert` RPC to accept the new field |
| `src/pages/admin/AdminExpertForm.tsx` | Added textarea for custom message; wired into load/save/create |
| `src/pages/ExpertDetails.tsx` | Replaced toast with confirmation modal; fetches custom message |
| `src/types/database.types.ts` | Added `inquiry_confirmation_message` to profiles type |

### Data Flow

```
SuperAdmin sets custom message → profiles.inquiry_confirmation_message
                                          ↓
User clicks "Request Appointment" → consultation_bookings INSERT (status: pending)
                                          ↓
                              Confirmation Modal appears showing:
                                 ✅ "Request Created"
                                 📝 Custom message (or default)
                                 ⏳ Status: Pending
```

### How to Test

#### Test 1A: Custom Message (SuperAdmin)
1. **Log in as SuperAdmin**
2. Go to **Admin Portal → Experts** tab
3. Click **Edit** on any expert
4. Scroll to **"Inquiry Confirmation Message"** textarea
5. Enter a custom message, e.g.: *"Thank you! I typically respond within 24 hours. Please have your insurance card ready."*
6. Click **Save**

**Expected:** Toast confirms "Expert successfully updated." The message persists when you re-open the edit form.

#### Test 1B: User Sees Custom Message
1. **Log in as a regular user**
2. Navigate to the expert whose message you just set
3. Ensure this expert has an **inquiry-based** consultation (booking_model = 'inquiry' OR price = $0)
4. Click **"Request Appointment"**

**Expected:**
- A **modal** appears (not a toast)
- Header shows **"✅ Request Created"**
- Blue box shows your **custom message** from step 5 above
- Status badge shows **"⏳ Pending"**
- A "Got it" button closes the modal

#### Test 1C: Default Message Fallback
1. Edit a different expert and **leave the confirmation message blank**
2. As a user, request an appointment with that expert

**Expected:** The modal shows the default: *"We'll notify [Expert Name] directly. They'll reach out within 24–48 hours to coordinate a time that works for you."*

#### Test 1D: New Expert Creation
1. As SuperAdmin, create a **new expert** via the admin form
2. Fill in all fields including the inquiry confirmation message
3. Save

**Expected:** The expert is created with the custom message. Verify by editing the expert — the message should persist.

---

## 2. SuperAdmin Consultation Oversight

### What Changed

The Consultation Bookings panel now has two new columns:
- **Admin Notes** — Inline-editable text field for coordination notes
- **Discount Code** — Shows which promo code was applied (if any)

### Files Modified

| File | What Changed |
|------|--------------|
| `supabase/migrations/20260509_consultation_admin_notes.sql` | Added `admin_notes` and `discount_code` columns to `consultation_bookings` |
| `src/pages/admin/ConsultationBookingsPanel.tsx` | Added Admin Notes column with inline edit; shows discount code badge |
| `src/types/database.types.ts` | Added both columns to consultation_bookings type |
| `supabase/functions/create-payment/index.ts` | Passes `discount_code` into booking INSERT |

### Data Flow

```
User books consultation with discount code "MOM25"
        ↓
create-payment edge function:
  → INSERT purchases (discount_code: 'MOM25')
  → INSERT consultation_bookings (discount_code: 'MOM25')
        ↓
SuperAdmin opens Bookings tab:
  → Sees 🎟️ MOM25 badge under appointment name
  → Clicks "+ Add notes" to record coordination details
  → Notes are saved to consultation_bookings.admin_notes
```

### How to Test

#### Test 2A: Admin Notes
1. **Log in as SuperAdmin**
2. Go to **Admin Portal → Bookings** tab
3. Find any booking row
4. Click **"+ Add notes"** in the Admin Notes column

**Expected:** A textarea appears inline. Type some notes like *"Contacted expert via email. Awaiting response."*

5. Click **Save**

**Expected:** Toast shows "Notes updated." The notes now display in italic text in the column. Refreshing the page preserves the notes.

6. Click on the notes text to edit again

**Expected:** The textarea re-opens with the existing text. You can modify and re-save.

#### Test 2B: Discount Code Visibility
1. As a user, purchase a consultation using a discount code
2. As SuperAdmin, go to Bookings tab
3. Find the new booking

**Expected:** A small purple badge like **🎟️ MOM25** appears below the appointment name.

#### Test 2C: Notes on Completed/Cancelled Bookings
1. Add notes to a "Pending" booking
2. Mark the booking as "Done"

**Expected:** The notes remain visible even after the booking is completed.

---

## 3. Discount Code Usage Tracking

### What Changed

Previously, discount codes were validated but `current_uses` was **never incremented** — meaning a code with `max_uses = 10` could be used unlimited times. Now, a database trigger automatically increments usage when a purchase reaches `completed` status.

### Files Modified

| File | What Changed |
|------|--------------|
| `supabase/migrations/20260509_discount_usage_tracking.sql` | Added `discount_code` column to `purchases`; created trigger function `fn_handle_discount_usage_increment` |
| `supabase/functions/create-payment/index.ts` | Sets `discount_code` on purchase INSERT; removed manual RPC calls |
| `src/types/database.types.ts` | Added `discount_code` to purchases type |

### Data Flow

```
User applies code "MOM25" at checkout
        ↓
create-payment edge function:
  → Validates code (active, within dates, under max_uses)
  → Calculates discounted price
  → INSERT purchases (discount_code: 'MOM25', status: 'pending')
        ↓ (For free purchases: status = 'completed' immediately)
        ↓ (For paid purchases: Stripe confirms → status updated to 'completed')
        ↓
Database trigger fires on INSERT (status=completed) or UPDATE (status→completed):
  → UPDATE discount_codes SET current_uses = current_uses + 1
    WHERE code = 'MOM25'
```

> [!IMPORTANT]
> The trigger only increments on successful completion — abandoned/cancelled purchases do NOT count against usage limits. This is a key design decision.

### How to Test

#### Test 3A: Free Purchase with Discount (100% off)
1. As SuperAdmin, create a discount code **"TEST100"** — Percentage, 100%, max uses: 3
2. Note the current_uses value (should be 0)
3. As a user, find a paid resource and apply **TEST100** at checkout
4. Complete the (now free) purchase

**Expected:**
- Purchase completes successfully (paymentIntentId = 'free')
- In Supabase dashboard → `discount_codes` table: `current_uses` should now be **1**
- In Supabase dashboard → `purchases` table: the new row has `discount_code = 'TEST100'`

#### Test 3B: Paid Purchase with Partial Discount
1. Create a discount code **"HALF50"** — Percentage, 50%, max uses: 2
2. As a user, purchase a $20 resource with **HALF50**
3. Complete the Stripe payment for $10

**Expected:**
- After Stripe confirms, `discount_codes.current_uses` increments to **1**
- The `purchases` row shows `discount_code = 'HALF50'`, `amount = 10`

#### Test 3C: Usage Limit Enforcement
1. Use the same code **"HALF50"** for a second purchase → `current_uses` should be **2**
2. Try to use it a third time

**Expected:** Validation rejects the code — the user sees it's no longer valid (the checkout should not apply the discount).

#### Test 3D: Abandoned Purchase (No Increment)
1. Create a fresh code **"NOCOUNT"** — Fixed $5 off, max uses: 5
2. Start a checkout with this code but **do NOT complete the Stripe payment** (close the page)

**Expected:** `current_uses` remains at **0**. The pending purchase row has `discount_code = 'NOCOUNT'` but because status never reached `completed`, the trigger does not fire.

#### Test 3E: Backfill Verification
1. Check `purchases` table for any rows that had `metadata->>'discount_code'` populated but `discount_code` column was NULL

**Expected:** The migration backfills these: `discount_code` column should now match `metadata->>'discount_code'`.

---

## 4. Hospital Resource Tenant Scoping

### What Changed

Hospital-specific resources (e.g., resources tied to Memorial Hospital) are now scoped so they **only appear** for users within that hospital's tenant. They never leak into other hospital experiences or the generic Whisperoo experience.

### Files Modified

| File | What Changed |
|------|--------------|
| `supabase/migrations/20260509_product_tenant_scoping.sql` | Added `tenant_id` to `products`; backfilled from expert profiles; created scoped RLS policies |
| `src/types/database.types.ts` | Added `tenant_id` and `is_hospital_resource` to products type |

### Data Flow

```
Product created → is_hospital_resource = true, tenant_id = [Memorial Hospital UUID]
                                    ↓
RLS Policy "Scoped product visibility":
  → Non-hospital resources: visible to ALL authenticated users
  → Hospital resources: visible ONLY if user's tenant_id matches product's tenant_id
  → Legacy hospital resources with NULL tenant_id: remain visible (safe fallback)

RLS Policy "Anon see public products":
  → Only non-hospital published products visible to anonymous users
```

### How to Test

#### Test 4A: Hospital User Sees Their Own Resources
1. Log in as a user affiliated with **Hospital A** (tenant_id matches)
2. Browse the resources/products page

**Expected:** You see both generic Whisperoo resources AND Hospital A's specific resources.

#### Test 4B: Hospital User Does NOT See Other Hospital's Resources
1. Log in as a user affiliated with **Hospital B**
2. Browse the resources/products page

**Expected:** You see generic Whisperoo resources and Hospital B's resources. You do **NOT** see Hospital A's resources.

#### Test 4C: Generic User (No Hospital)
1. Log in as a user with **no tenant_id** (signed up without QR/hospital affiliation)
2. Browse the resources/products page

**Expected:** You see only generic Whisperoo resources. No hospital-specific resources appear.

#### Test 4D: Anonymous User
1. Open the app in an incognito browser (not logged in)
2. If any resource listing is publicly accessible, check what appears

**Expected:** Only non-hospital published products are visible.

#### Test 4E: Backfill Verification
1. In Supabase SQL editor, run:
```sql
SELECT id, title, is_hospital_resource, tenant_id, expert_id
FROM products
WHERE is_hospital_resource = true;
```

**Expected:** Hospital resources should have a `tenant_id` matching their expert's tenant_id from the profiles table.

---

## 5. QR Code Onboarding Attribution

### What Changed

**Nothing — already fully functional.** This section documents the existing system for verification.

### Data Flow

```
Physical QR Code (plastered on hospital wall)
        ↓ User scans
/qr/:token route (QrLanding.tsx)
        ↓ Lookup token in qr_codes table
        ↓ Log scan event to qr_events
        ↓ Redirect to /auth/create?tenant=slug&qr=token
        ↓ User completes signup
AuthContext.tsx:
        ↓ Resolves token → qr_code_id
        ↓ Updates profiles.signup_qr_code_id
        ↓ Logs signup_complete event to qr_events
        ↓
MetricsDash.tsx:
        → SuperAdmin sees QR Signup Attribution table
        → Per QR: label, department, scans, signups, conversion %
```

### How to Test

#### Test 5A: QR Scan Tracking
1. Navigate to `/qr/[valid-token]` in a browser
2. Check `qr_events` table in Supabase

**Expected:** A new row with `event_type = 'scan'` appears.

#### Test 5B: Signup Attribution
1. Complete a signup flow that started from a QR scan (use the redirected URL with `?qr=token`)
2. Check `profiles` table for the new user

**Expected:** `signup_qr_code_id` is populated with the matching `qr_codes.id`.

#### Test 5C: Admin Metrics
1. As SuperAdmin, go to **Admin Portal → Metrics** tab
2. Scroll down to **"QR Signup Attribution"** section

**Expected:** A table showing each QR code's label, department, scan count, signup count, and conversion percentage.

---

## 6. Migration Deployment Order

> [!IMPORTANT]
> Apply these migrations in order via the Supabase SQL editor. Each is idempotent (`IF NOT EXISTS` / `CREATE OR REPLACE`), so re-running is safe.

| # | Migration File | Purpose |
|---|----------------|---------|
| 1 | `20260509_inquiry_message.sql` | Adds `inquiry_confirmation_message` column to `profiles` |
| 2 | `20260509_discount_usage_tracking.sql` | Adds `discount_code` to `purchases` + trigger for usage increment |
| 3 | `20260509_consultation_admin_notes.sql` | Adds `admin_notes` and `discount_code` to `consultation_bookings` |
| 4 | `20260509_product_tenant_scoping.sql` | Adds `tenant_id` to `products` + scoped RLS policies |
| 5 | `20260509_update_create_expert_rpc.sql` | Updates expert creation RPC with `inquiry_confirmation_message` param |

**Edge function already deployed:** `create-payment` ✅

---

## Quick Reference — What Users See

| User Role | What's New |
|-----------|-----------|
| **Regular User** | Sees polished confirmation modal when requesting inquiry consultations; hospital resources scoped to their hospital only |
| **SuperAdmin** | Can set custom inquiry messages per expert; can add coordination notes to bookings; sees discount codes on bookings; sees accurate discount usage counts |
| **Anonymous** | No hospital resources visible |
