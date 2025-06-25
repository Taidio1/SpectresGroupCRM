-- =====================================
-- SYSTEM POWIADOMIEŃ - TABELA I TRIGGERY
-- =====================================

-- 1. Tabela notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('reminder', 'antysale_warning', 'system', 'manual')),
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  urgent boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NULL,
  
  -- Indeksy dla wydajności
  CONSTRAINT notifications_check_type CHECK (type IN ('reminder', 'antysale_warning', 'system', 'manual'))
);

-- Indeksy dla wydajności
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_client_id ON public.notifications(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON public.notifications(expires_at);

-- 2. RLS Policies dla notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Pracownicy widzą tylko swoje powiadomienia
CREATE POLICY "pracownicy_widza_swoje_powiadomienia" ON public.notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
        AND users.role = 'pracownik'
        AND notifications.user_id = users.id
    )
  );

-- Policy: Project managerowie widzą powiadomienia z ich lokalizacji
CREATE POLICY "project_managerowie_widza_z_lokalizacji" ON public.notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users u1
      WHERE u1.id = auth.uid() 
        AND u1.role = 'project_manager'
        AND EXISTS (
          SELECT 1 FROM public.users u2
          WHERE u2.id = notifications.user_id
            AND u2.location_id = u1.location_id
        )
    )
  );

-- Policy: Managerowie, admin i szef widzą wszystkie powiadomienia
CREATE POLICY "managerowie_widza_wszystkie_powiadomienia" ON public.notifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
        AND users.role IN ('manager', 'admin', 'szef', 'junior_manager')
    )
  );

-- 3. Funkcja do tworzenia powiadomień o przypomnieniach
CREATE OR REPLACE FUNCTION create_reminder_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  reminder_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
  target_user_id UUID;
  project_manager_id UUID;
BEGIN
  -- Sprawdź klientów z aktywnymi przypomnieniami na dziś
  FOR reminder_record IN 
    SELECT 
      c.id as client_id,
      c.first_name,
      c.last_name,
      c.company_name,
      c.owner_id,
      c.location_id,
      c.reminder,
      l.project_manager_id
    FROM public.clients c
    LEFT JOIN public.locations l ON c.location_id = l.id
    WHERE c.reminder IS NOT NULL
      AND (c.reminder->>'enabled')::boolean = true
      AND (c.reminder->>'date')::date = CURRENT_DATE
      AND (c.reminder->>'time')::time <= CURRENT_TIME + INTERVAL '5 minutes'
      AND (c.reminder->>'time')::time >= CURRENT_TIME - INTERVAL '5 minutes'
  LOOP
    -- Przygotuj treść powiadomienia
    notification_title := '📌 Przypomnienie o kliencie';
    notification_message := format(
      'Przypomnienie o kliencie %s %s (%s) na %s. Notatka: %s',
      reminder_record.first_name,
      reminder_record.last_name,
      reminder_record.company_name,
      reminder_record.reminder->>'time',
      COALESCE(reminder_record.reminder->>'note', 'Brak notatki')
    );

    -- Utwórz powiadomienie dla właściciela klienta (jeśli istnieje)
    IF reminder_record.owner_id IS NOT NULL THEN
      -- Sprawdź czy powiadomienie już nie istnieje
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE user_id = reminder_record.owner_id 
          AND client_id = reminder_record.client_id
          AND type = 'reminder'
          AND created_at::date = CURRENT_DATE
      ) THEN
        INSERT INTO public.notifications (
          user_id, 
          client_id, 
          type, 
          title, 
          message, 
          urgent,
          metadata
        ) VALUES (
          reminder_record.owner_id,
          reminder_record.client_id,
          'reminder',
          notification_title,
          notification_message,
          true,
          jsonb_build_object(
            'reminder_time', reminder_record.reminder->>'time',
            'reminder_note', reminder_record.reminder->>'note'
          )
        );
      END IF;
    END IF;

    -- Utwórz powiadomienie dla project managera (jeśli istnieje i jest inny niż właściciel)
    IF reminder_record.project_manager_id IS NOT NULL 
       AND reminder_record.project_manager_id != reminder_record.owner_id THEN
      
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE user_id = reminder_record.project_manager_id 
          AND client_id = reminder_record.client_id
          AND type = 'reminder'
          AND created_at::date = CURRENT_DATE
      ) THEN
        INSERT INTO public.notifications (
          user_id, 
          client_id, 
          type, 
          title, 
          message, 
          urgent,
          metadata
        ) VALUES (
          reminder_record.project_manager_id,
          reminder_record.client_id,
          'reminder',
          notification_title,
          notification_message,
          true,
          jsonb_build_object(
            'reminder_time', reminder_record.reminder->>'time',
            'reminder_note', reminder_record.reminder->>'note',
            'is_project_manager_notification', true
          )
        );
      END IF;
    END IF;

  END LOOP;
END;
$$;

-- 4. Funkcja do powiadomień o długotrwałych statusach antysale
CREATE OR REPLACE FUNCTION create_antysale_warnings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  antysale_record RECORD;
  notification_title TEXT;
  notification_message TEXT;
  days_in_antysale INTEGER;
BEGIN
  -- Znajdź klientów w statusie antysale dłużej niż 5 dni
  FOR antysale_record IN 
    SELECT 
      c.id as client_id,
      c.first_name,
      c.last_name,
      c.company_name,
      c.owner_id,
      c.location_id,
      c.status_changed_at,
      l.project_manager_id,
      EXTRACT(day FROM NOW() - c.status_changed_at)::integer as days_in_status
    FROM public.clients c
    LEFT JOIN public.locations l ON c.location_id = l.id
    WHERE c.status = 'antysale'
      AND c.status_changed_at <= NOW() - INTERVAL '5 days'
  LOOP
    days_in_antysale := antysale_record.days_in_status;
    
    -- Przygotuj treść powiadomienia
    notification_title := '⚠️ Długotrwały status antysale';
    notification_message := format(
      'Klient %s %s (%s) jest w statusie antysale już %s dni (od %s). Wymaga interwencji.',
      antysale_record.first_name,
      antysale_record.last_name,
      antysale_record.company_name,
      days_in_antysale,
      antysale_record.status_changed_at::date
    );

    -- Utwórz powiadomienie dla właściciela klienta (jeśli istnieje)
    IF antysale_record.owner_id IS NOT NULL THEN
      -- Sprawdź czy powiadomienie już nie istnieje (jedno na dzień)
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE user_id = antysale_record.owner_id 
          AND client_id = antysale_record.client_id
          AND type = 'antysale_warning'
          AND created_at::date = CURRENT_DATE
      ) THEN
        INSERT INTO public.notifications (
          user_id, 
          client_id, 
          type, 
          title, 
          message, 
          urgent,
          metadata
        ) VALUES (
          antysale_record.owner_id,
          antysale_record.client_id,
          'antysale_warning',
          notification_title,
          notification_message,
          true,
          jsonb_build_object(
            'days_in_antysale', days_in_antysale,
            'status_changed_at', antysale_record.status_changed_at
          )
        );
      END IF;
    END IF;

    -- Utwórz powiadomienie dla project managera (jeśli istnieje i jest inny niż właściciel)
    IF antysale_record.project_manager_id IS NOT NULL 
       AND antysale_record.project_manager_id != antysale_record.owner_id THEN
      
      IF NOT EXISTS (
        SELECT 1 FROM public.notifications 
        WHERE user_id = antysale_record.project_manager_id 
          AND client_id = antysale_record.client_id
          AND type = 'antysale_warning'
          AND created_at::date = CURRENT_DATE
      ) THEN
        INSERT INTO public.notifications (
          user_id, 
          client_id, 
          type, 
          title, 
          message, 
          urgent,
          metadata
        ) VALUES (
          antysale_record.project_manager_id,
          antysale_record.client_id,
          'antysale_warning',
          notification_title,
          notification_message,
          true,
          jsonb_build_object(
            'days_in_antysale', days_in_antysale,
            'status_changed_at', antysale_record.status_changed_at,
            'is_project_manager_notification', true
          )
        );
      END IF;
    END IF;

  END LOOP;
END;
$$;

-- 5. Funkcja automatycznego czyszczenia starych powiadomień
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Usuń przeczytane powiadomienia starsze niż 30 dni
  DELETE FROM public.notifications 
  WHERE read = true 
    AND created_at < NOW() - INTERVAL '30 days';
    
  -- Usuń nieprzeczytane powiadomienia starsze niż 90 dni
  DELETE FROM public.notifications 
  WHERE read = false 
    AND created_at < NOW() - INTERVAL '90 days';
    
  -- Usuń wygasłe powiadomienia
  DELETE FROM public.notifications 
  WHERE expires_at IS NOT NULL 
    AND expires_at < NOW();
END;
$$;

-- 6. Funkcja do oznaczania powiadomień jako przeczytane
CREATE OR REPLACE FUNCTION mark_notification_as_read(notification_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications 
  SET read = true 
  WHERE id = notification_id
    AND user_id = auth.uid();
    
  RETURN FOUND;
END;
$$;

-- 7. Funkcja do oznaczania wszystkich powiadomień jako przeczytane
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE public.notifications 
  SET read = true 
  WHERE user_id = auth.uid()
    AND read = false;
    
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- 8. Automatyczne uruchamianie funkcji (cron jobs) - konieczne skonfigurowanie w Supabase
-- Te funkcje powinny być uruchamiane przez pg_cron lub Supabase Edge Functions

-- Komentarz: Aby uruchomić automatyczne wykonywanie:
-- 1. W Supabase Dashboard -> Database -> Extensions włącz pg_cron
-- 2. Uruchom następujące komendy:

/*
-- Przypomnienia co minutę
SELECT cron.schedule('reminder-notifications', '* * * * *', 'SELECT create_reminder_notifications();');

-- Ostrzeżenia antysale codziennie o 9:00
SELECT cron.schedule('antysale-warnings', '0 9 * * *', 'SELECT create_antysale_warnings();');

-- Czyszczenie starych powiadomień co tydzień w niedzielę o 2:00
SELECT cron.schedule('cleanup-notifications', '0 2 * * 0', 'SELECT cleanup_old_notifications();');
*/

-- 9. Komentarze i dokumentacja
COMMENT ON TABLE public.notifications IS 'Tabela przechowująca powiadomienia dla użytkowników';
COMMENT ON COLUMN public.notifications.type IS 'Typ powiadomienia: reminder, antysale_warning, system, manual';
COMMENT ON COLUMN public.notifications.urgent IS 'Czy powiadomienie jest pilne (wyświetlane z wyższym priorytetem)';
COMMENT ON COLUMN public.notifications.metadata IS 'Dodatkowe dane w formacie JSON';
COMMENT ON COLUMN public.notifications.expires_at IS 'Data wygaśnięcia powiadomienia (opcjonalne)';

-- 10. Grant permissions
GRANT ALL ON public.notifications TO authenticated;
GRANT EXECUTE ON FUNCTION create_reminder_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION create_antysale_warnings() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_as_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read() TO authenticated; 