-- Migration: 004_trusted_vendors_and_fastpass.sql
-- Description: Adds Trusted Partners/Vendors and Invoice Smart Fast-Pass Policy Engine

CREATE TABLE IF NOT EXISTS trusted_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    vendor_name VARCHAR(255) NOT NULL,
    sender_domains TEXT[] NOT NULL DEFAULT '{}',
    sender_emails TEXT[] NOT NULL DEFAULT '{}',
    enforce_dkim BOOLEAN NOT NULL DEFAULT TRUE,
    enforce_spf BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_link_domains TEXT[] NOT NULL DEFAULT '{}',
    category VARCHAR(64) NOT NULL DEFAULT 'INVOICE',
    auto_fastpass BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    total_fastpasses INTEGER NOT NULL DEFAULT 0,
    last_fastpass_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trusted_vendors_org ON trusted_vendors(organization_id);
CREATE INDEX IF NOT EXISTS idx_trusted_vendors_domains ON trusted_vendors USING GIN(sender_domains);

-- Seed standard enterprise billing & invoice vendors for default organization
INSERT INTO trusted_vendors (
    organization_id, vendor_name, sender_domains, allowed_link_domains, category, auto_fastpass, notes
)
VALUES 
(
    '00000000-0000-0000-0000-000000000001',
    'Stripe Invoicing & Billing',
    ARRAY['stripe.com', 'billing.stripe.com', 'invoice.stripe.com'],
    ARRAY['stripe.com', 'billing.stripe.com', 'invoice.stripe.com'],
    'INVOICE',
    TRUE,
    'Official Stripe automated customer invoice and receipt dispatch system'
),
(
    '00000000-0000-0000-0000-000000000001',
    'Amazon Web Services (AWS Billing)',
    ARRAY['amazon.com', 'amazonaws.com', 'amazon.in'],
    ARRAY['aws.amazon.com', 'console.aws.amazon.com', 'payments.amazon.com'],
    'INFRASTRUCTURE_BILLING',
    TRUE,
    'Monthly AWS cloud computing statements and payment confirmations'
),
(
    '00000000-0000-0000-0000-000000000001',
    'Razorpay Invoicing & Subscriptions',
    ARRAY['razorpay.com', 'razorpay.in'],
    ARRAY['razorpay.com', 'rzp.io', 'pages.razorpay.com'],
    'PAYMENT_GATEWAY',
    TRUE,
    'B2B merchant recurring invoice links and settlement statements'
),
(
    '00000000-0000-0000-0000-000000000001',
    'QuickBooks / Intuit Billing',
    ARRAY['intuit.com', 'quickbooks.com'],
    ARRAY['qbo.intuit.com', 'quickbooks.intuit.com', 'app.intuit.com'],
    'ACCOUNTING',
    TRUE,
    'Vendor accounting statements and automated invoice dispatches'
),
(
    '00000000-0000-0000-0000-000000000001',
    'PayPal Business Invoicing',
    ARRAY['paypal.com', 'paypal.me'],
    ARRAY['paypal.com', 'paypal.me'],
    'INVOICE',
    TRUE,
    'Official PayPal business invoices and merchant billing notifications'
)
ON CONFLICT DO NOTHING;
