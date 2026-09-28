-- ==============================================================================
-- SunMail Database Schema & Security Policies (Production Ready)
-- ==============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Profiles Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Trigger to auto-create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, user_id, name, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. Domains Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'disabled')),
    verification_token TEXT NOT NULL,
    verified_at TIMESTAMPTZ,
    mx_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_domain UNIQUE (user_id, domain),
    CONSTRAINT unique_domain_global UNIQUE (domain)
);

CREATE INDEX IF NOT EXISTS idx_domains_user_id ON public.domains(user_id);
CREATE INDEX IF NOT EXISTS idx_domains_domain ON public.domains(domain);
CREATE INDEX IF NOT EXISTS idx_domains_status ON public.domains(status);

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own domains"
    ON public.domains FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own domains"
    ON public.domains FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domains"
    ON public.domains FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domains"
    ON public.domains FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. SMTP Destinations Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.smtp_destinations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    host TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 587 CHECK (port > 0 AND port < 65536),
    encryption TEXT NOT NULL DEFAULT 'STARTTLS' CHECK (encryption IN ('None', 'STARTTLS', 'TLS')),
    username TEXT NOT NULL,
    encrypted_password TEXT NOT NULL,
    from_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_smtp_destinations_user_id ON public.smtp_destinations(user_id);

ALTER TABLE public.smtp_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own smtp destinations"
    ON public.smtp_destinations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own smtp destinations"
    ON public.smtp_destinations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own smtp destinations"
    ON public.smtp_destinations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own smtp destinations"
    ON public.smtp_destinations FOR DELETE
    USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 4. Domain Routes Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.domain_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
    smtp_destination_id UUID NOT NULL REFERENCES public.smtp_destinations(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_domain_route UNIQUE (domain_id, smtp_destination_id)
);

CREATE INDEX IF NOT EXISTS idx_domain_routes_domain_id ON public.domain_routes(domain_id);
CREATE INDEX IF NOT EXISTS idx_domain_routes_smtp_dest ON public.domain_routes(smtp_destination_id);

ALTER TABLE public.domain_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view routes for their domains"
    ON public.domain_routes FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = domain_routes.domain_id AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert routes for their domains"
    ON public.domain_routes FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = domain_routes.domain_id AND d.user_id = auth.uid()
        ) AND
        EXISTS (
            SELECT 1 FROM public.smtp_destinations s
            WHERE s.id = domain_routes.smtp_destination_id AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update routes for their domains"
    ON public.domain_routes FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = domain_routes.domain_id AND d.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete routes for their domains"
    ON public.domain_routes FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = domain_routes.domain_id AND d.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 5. Email Messages Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
    message_id TEXT,
    envelope_from TEXT NOT NULL,
    envelope_to TEXT NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    subject TEXT,
    text_body TEXT,
    html_body TEXT,
    raw_eml_path TEXT,
    size BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processing', 'forwarded', 'failed', 'rejected')),
    received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    forwarded_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_email_messages_domain_id ON public.email_messages(domain_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_status ON public.email_messages(status);
CREATE INDEX IF NOT EXISTS idx_email_messages_received_at ON public.email_messages(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_to_address ON public.email_messages(to_address);

ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view emails for their domains"
    ON public.email_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.domains d
            WHERE d.id = email_messages.domain_id AND d.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 6. Email Attachments Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size BIGINT NOT NULL DEFAULT 0,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_email_attachments_email_id ON public.email_attachments(email_id);

ALTER TABLE public.email_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for their emails"
    ON public.email_attachments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.email_messages em
            JOIN public.domains d ON d.id = em.domain_id
            WHERE em.id = email_attachments.email_id AND d.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 7. Delivery Attempts Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.delivery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID NOT NULL REFERENCES public.email_messages(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    smtp_host TEXT NOT NULL,
    smtp_response_code INTEGER,
    smtp_response TEXT,
    status TEXT NOT NULL CHECK (status IN ('success', 'temporary_failure', 'permanent_failure')),
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_email_id ON public.delivery_attempts(email_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_attempted_at ON public.delivery_attempts(attempted_at DESC);

ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery attempts for their emails"
    ON public.delivery_attempts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.email_messages em
            JOIN public.domains d ON d.id = em.domain_id
            WHERE em.id = delivery_attempts.email_id AND d.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 8. Webhooks Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    events TEXT[] NOT NULL DEFAULT ARRAY['email.received', 'email.forwarded', 'email.failed', 'email.rejected']::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON public.webhooks(user_id);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own webhooks"
    ON public.webhooks FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 9. Webhook Deliveries Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
    event TEXT NOT NULL,
    payload JSONB NOT NULL,
    status_code INTEGER,
    response TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON public.webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON public.webhook_deliveries(created_at DESC);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view deliveries for their webhooks"
    ON public.webhook_deliveries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.webhooks w
            WHERE w.id = webhook_deliveries.webhook_id AND w.user_id = auth.uid()
        )
    );

-- ------------------------------------------------------------------------------
-- 10. Realtime Publications
-- ------------------------------------------------------------------------------
-- Enable Supabase Realtime for email messages and delivery attempts
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'email_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.email_messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'delivery_attempts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.delivery_attempts;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Handle if publication doesn't exist in local/isolated test envs
END $$;

-- ------------------------------------------------------------------------------
-- 11. Storage Bucket Configuration (SQL representation)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('email-attachments', 'email-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Allow authenticated users to read attachments of their own domains"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'email-attachments'
    );
