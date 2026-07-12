-- Create trigger functions to sync store_salesmen with auth.users

-- 1. Sync store_salesmen additions/updates to auth.users
CREATE OR REPLACE FUNCTION public.sync_store_salesman_to_auth()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_password TEXT;
BEGIN
    -- Crypt the password using blowfish (standard bcrypt used by auth.users)
    v_encrypted_password := crypt(NEW.salesman_password, gen_salt('bf'));

    IF TG_OP = 'UPDATE' AND LOWER(NEW.salesman_email) <> LOWER(OLD.salesman_email) THEN
        -- Verify that the new email doesn't hijack an existing merchant account
        SELECT id INTO v_user_id FROM auth.users WHERE email = LOWER(NEW.salesman_email);
        IF v_user_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.profiles WHERE user_id = v_user_id
        ) THEN
            RAISE EXCEPTION 'Email % is registered as a merchant account and cannot be used for a salesman.', NEW.salesman_email;
        END IF;

        -- Update the email and password of the existing user
        UPDATE auth.users
        SET 
            email = LOWER(NEW.salesman_email),
            encrypted_password = v_encrypted_password,
            raw_user_meta_data = json_build_object('role', 'salesman', 'display_name', NEW.salesman_name)::jsonb,
            updated_at = now()
        WHERE email = LOWER(OLD.salesman_email);
    ELSE
        -- For INSERT or non-email UPDATE:
        -- Check if user already exists in auth.users
        SELECT id INTO v_user_id FROM auth.users WHERE email = LOWER(NEW.salesman_email);

        IF v_user_id IS NULL THEN
            -- Insert a new user into auth.users
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at,
                confirmation_token,
                email_change,
                email_change_token_new,
                recovery_token
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                gen_random_uuid(),
                'authenticated',
                'authenticated',
                LOWER(NEW.salesman_email),
                v_encrypted_password,
                now(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                json_build_object('role', 'salesman', 'display_name', NEW.salesman_name)::jsonb,
                now(),
                now(),
                '',
                '',
                '',
                ''
            );
        ELSE
            -- Verify that we don't hijack a merchant account
            IF EXISTS (
                SELECT 1 FROM public.profiles WHERE user_id = v_user_id
            ) AND NOT EXISTS (
                SELECT 1 FROM public.store_salesmen WHERE salesman_email = NEW.salesman_email
            ) THEN
                RAISE EXCEPTION 'Email % is registered as a merchant account and cannot be used for a salesman.', NEW.salesman_email;
            END IF;

            -- Update existing user's password and metadata
            UPDATE auth.users
            SET 
                encrypted_password = v_encrypted_password,
                raw_user_meta_data = json_build_object('role', 'salesman', 'display_name', NEW.salesman_name)::jsonb,
                updated_at = now()
            WHERE id = v_user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Trigger on store_salesmen table for inserts/updates
DROP TRIGGER IF EXISTS sync_store_salesman_to_auth_trigger ON public.store_salesmen;
CREATE TRIGGER sync_store_salesman_to_auth_trigger
AFTER INSERT OR UPDATE OF salesman_email, salesman_password, salesman_name
ON public.store_salesmen
FOR EACH ROW
EXECUTE FUNCTION public.sync_store_salesman_to_auth();

-- 3. Delete store_salesmen from auth.users on deletion
CREATE OR REPLACE FUNCTION public.delete_store_salesman_from_auth()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM auth.users WHERE email = LOWER(OLD.salesman_email);
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS delete_store_salesman_from_auth_trigger ON public.store_salesmen;
CREATE TRIGGER delete_store_salesman_from_auth_trigger
AFTER DELETE
ON public.store_salesmen
FOR EACH ROW
EXECUTE FUNCTION public.delete_store_salesman_from_auth();

-- 4. Sync any existing store_salesmen to auth.users immediately
DO $$
DECLARE
    r RECORD;
    v_user_id UUID;
    v_encrypted_password TEXT;
BEGIN
    FOR r IN SELECT * FROM public.store_salesmen LOOP
        -- Hash password
        v_encrypted_password := crypt(r.salesman_password, gen_salt('bf'));
        
        -- Check if user exists in auth.users
        SELECT id INTO v_user_id FROM auth.users WHERE email = LOWER(r.salesman_email);
        
        IF v_user_id IS NULL THEN
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at,
                confirmation_token,
                email_change,
                email_change_token_new,
                recovery_token
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                gen_random_uuid(),
                'authenticated',
                'authenticated',
                LOWER(r.salesman_email),
                v_encrypted_password,
                now(),
                '{"provider":"email","providers":["email"]}'::jsonb,
                json_build_object('role', 'salesman', 'display_name', r.salesman_name)::jsonb,
                now(),
                now(),
                '',
                '',
                '',
                ''
            );
        ELSE
            UPDATE auth.users
            SET 
                encrypted_password = v_encrypted_password,
                raw_user_meta_data = json_build_object('role', 'salesman', 'display_name', r.salesman_name)::jsonb,
                updated_at = now()
            WHERE id = v_user_id;
        END IF;
    END LOOP;
END;
$$;

-- 5. Add RLS policy to allow salesmen to view profiles of assigned stores
DROP POLICY IF EXISTS "Salesmen can view profiles of assigned stores" ON public.profiles;
CREATE POLICY "Salesmen can view profiles of assigned stores"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.store_salesmen
            WHERE store_salesmen.store_id = profiles.user_id
            AND LOWER(store_salesmen.salesman_email) = LOWER(auth.jwt()->>'email')
        )
    );
