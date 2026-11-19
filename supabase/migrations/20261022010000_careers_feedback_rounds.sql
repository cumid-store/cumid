BEGIN;
-- Admin check function supporting role='admin' and owner email allowlist
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path='' AS $$
SELECT EXISTS(
  SELECT 1 FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = auth.uid() 
  AND (
    p.role = 'admin' 
    OR lower(coalesce(u.email,'')) IN ('sumitkatiyar783@gmail.com', 'ankshitdey@gmail.com', 'sumitkatiyar3655@gmail.com')
  )
) $$;

ALTER TABLE public.career_applications
  ADD COLUMN IF NOT EXISTS task_opens_at timestamptz,
  ADD COLUMN IF NOT EXISTS task_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS task_brief text NOT NULL DEFAULT '' CHECK(length(task_brief)<=4000);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'task_window_valid'
  ) THEN
    ALTER TABLE public.career_applications
      ADD CONSTRAINT task_window_valid CHECK((task_opens_at IS NULL AND task_deadline IS NULL) OR (task_opens_at IS NOT NULL AND task_deadline>task_opens_at));
  END IF;
END $$;

DROP POLICY IF EXISTS "Candidate or admin reads applications" ON public.career_applications;
CREATE POLICY "Candidate or admin reads applications" ON public.career_applications FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Candidate or admin reads submissions" ON public.career_submissions;
CREATE POLICY "Candidate or admin reads submissions" ON public.career_submissions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.career_applications a WHERE a.id=application_id AND (a.user_id=auth.uid() OR public.is_admin())));

GRANT SELECT ON public.career_applications,public.career_submissions TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_for_career(p_name text,p_role text,p_introduction text,p_links jsonb,p_version text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE u uuid:=auth.uid(); a public.career_applications; added boolean:=false;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in to apply'; END IF;
 IF p_role NOT IN('Design & illustration','Content & social media','Web development','Marketing & sales') THEN RAISE EXCEPTION 'Invalid role'; END IF;
 IF length(trim(p_name)) NOT BETWEEN 1 AND 100 OR length(trim(p_introduction)) NOT BETWEEN 1 AND 2000 OR length(p_role)>80 OR jsonb_typeof(p_links)<>'array' OR jsonb_array_length(p_links)>10 THEN RAISE EXCEPTION 'Invalid application'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_links) v WHERE jsonb_typeof(v)<>'string' OR (v#>>'{}')!~'^https://') THEN RAISE EXCEPTION 'Use HTTPS links'; END IF;
 INSERT INTO public.career_applications(user_id,name,email,role,introduction,links,privacy_version)
 SELECT u,trim(p_name),email,p_role,trim(p_introduction),p_links,p_version FROM auth.users WHERE id=u
 ON CONFLICT(user_id,role) DO NOTHING RETURNING * INTO a;
 IF FOUND THEN added:=true; ELSE SELECT * INTO a FROM public.career_applications WHERE user_id=u AND role=p_role; END IF;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Application was not saved'; END IF;
 RETURN jsonb_build_object('id',a.id,'name',a.name,'role',a.role,'status',a.status,'created_at',a.created_at,'task_opens_at',a.task_opens_at,'task_deadline',a.task_deadline,'task_brief',a.task_brief,'created',added);
END $$;
REVOKE ALL ON FUNCTION public.apply_for_career(text,text,text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_for_career(text,text,text,jsonb,text) TO authenticated,service_role;

-- Link-only work submission RPC: enforces round time window, limits and at least one link
CREATE OR REPLACE FUNCTION public.create_career_submission(p_user uuid,p_application uuid,p_title text,p_notes text,p_links jsonb)
RETURNS public.career_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  a public.career_applications;
  s public.career_submissions;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' AND (auth.uid() IS NULL OR auth.uid()<>p_user) THEN
    RAISE EXCEPTION 'Not authorised';
  END IF;

  SELECT * INTO a FROM public.career_applications WHERE id=p_application AND user_id=p_user FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF a.status<>'task_sent' OR a.task_opens_at IS NULL OR a.task_deadline IS NULL OR now()<a.task_opens_at OR now()>=a.task_deadline THEN
    RAISE EXCEPTION 'Task round is not open';
  END IF;

  IF jsonb_typeof(p_links)<>'array' OR jsonb_array_length(p_links)=0 OR jsonb_array_length(p_links)>10 THEN
    RAISE EXCEPTION 'Provide between 1 and 10 valid links';
  END IF;

  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_links) v WHERE jsonb_typeof(v)<>'string' OR (v#>>'{}')!~'^https://') THEN
    RAISE EXCEPTION 'Use HTTPS links';
  END IF;

  IF (SELECT count(*) FROM public.career_submissions WHERE application_id=p_application)>=10 THEN
    RAISE EXCEPTION 'Submission limit reached';
  END IF;

  INSERT INTO public.career_submissions(application_id,title,notes,links)
  VALUES (p_application,trim(p_title),trim(coalesce(p_notes, '')),p_links)
  RETURNING * INTO s;

  RETURN s;
END $$;
REVOKE ALL ON FUNCTION public.create_career_submission(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_career_submission(uuid,uuid,text,text,jsonb) TO authenticated,service_role;

-- Manage career round
CREATE OR REPLACE FUNCTION public.manage_career_round(p_application uuid,p_status text,p_open timestamptz DEFAULT NULL,p_deadline timestamptz DEFAULT NULL,p_brief text DEFAULT NULL,p_update_window boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF p_status NOT IN('received','reviewing','task_sent','shortlisted','closed') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 IF p_update_window THEN
  IF p_open IS NULL OR p_deadline IS NULL OR p_deadline<=p_open OR p_deadline<=now() OR length(trim(p_brief)) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'Choose a future deadline and task brief';
  END IF;
  UPDATE public.career_applications SET status=p_status,task_opens_at=p_open,task_deadline=p_deadline,task_brief=trim(p_brief) WHERE id=p_application;
 ELSE
  UPDATE public.career_applications SET status=p_status WHERE id=p_application;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.manage_career_round(uuid,text,timestamptz,timestamptz,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_career_round(uuid,text,timestamptz,timestamptz,text,boolean) TO authenticated,service_role;
COMMIT;
