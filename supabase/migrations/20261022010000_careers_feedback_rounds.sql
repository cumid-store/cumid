BEGIN;
ALTER TABLE public.career_applications
 ADD COLUMN task_opens_at timestamptz,
 ADD COLUMN task_deadline timestamptz,
 ADD COLUMN task_brief text NOT NULL DEFAULT '' CHECK(length(task_brief)<=4000),
 ADD CONSTRAINT task_window_valid CHECK((task_opens_at IS NULL AND task_deadline IS NULL) OR (task_opens_at IS NOT NULL AND task_deadline>task_opens_at));

CREATE POLICY "Candidate or admin reads applications" ON public.career_applications FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());
CREATE POLICY "Candidate or admin reads submissions" ON public.career_submissions FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.career_applications a WHERE a.id=application_id AND (a.user_id=auth.uid() OR public.is_admin())));
CREATE POLICY "Candidate or admin reads file metadata" ON public.career_files FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.career_applications a WHERE a.id=application_id AND (a.user_id=auth.uid() OR public.is_admin())));
GRANT SELECT ON public.career_applications,public.career_submissions,public.career_files TO authenticated;

CREATE FUNCTION public.apply_for_career(p_name text,p_role text,p_introduction text,p_links jsonb,p_version text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE u uuid:=auth.uid(); a public.career_applications; added boolean:=false;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Sign in to apply'; END IF;
 IF p_role NOT IN('Design & illustration','Content & social media','Web development','Marketing & sales','Operations & sourcing','Other') THEN RAISE EXCEPTION 'Invalid role'; END IF;
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
GRANT EXECUTE ON FUNCTION public.apply_for_career(text,text,text,jsonb,text) TO authenticated;

-- Preserve the existing quota/storage transactions behind ownership and time gates.
ALTER FUNCTION public.create_career_submission(uuid,uuid,text,text,jsonb) RENAME TO create_career_submission_internal;
REVOKE ALL ON FUNCTION public.create_career_submission_internal(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.create_career_submission(p_user uuid,p_application uuid,p_title text,p_notes text,p_links jsonb)
RETURNS public.career_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE a public.career_applications;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' AND (auth.uid() IS NULL OR auth.uid()<>p_user) THEN RAISE EXCEPTION 'Not authorised'; END IF;
 SELECT * INTO a FROM public.career_applications WHERE id=p_application AND user_id=p_user FOR UPDATE;
 IF NOT FOUND OR a.status<>'task_sent' OR a.task_opens_at IS NULL OR a.task_deadline IS NULL OR now()<a.task_opens_at OR now()>=a.task_deadline THEN RAISE EXCEPTION 'Task round is not open'; END IF;
 IF jsonb_typeof(p_links)<>'array' OR jsonb_array_length(p_links)>10 THEN RAISE EXCEPTION 'Invalid links'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_links) v WHERE jsonb_typeof(v)<>'string' OR (v#>>'{}')!~'^https://') THEN RAISE EXCEPTION 'Use HTTPS links'; END IF;
 RETURN public.create_career_submission_internal(p_user,p_application,p_title,p_notes,p_links);
END $$;
REVOKE ALL ON FUNCTION public.create_career_submission(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_career_submission(uuid,uuid,text,text,jsonb) TO authenticated,service_role;

ALTER FUNCTION public.reserve_career_file(uuid,uuid,text,integer) RENAME TO reserve_career_file_internal;
REVOKE ALL ON FUNCTION public.reserve_career_file_internal(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.reserve_career_file(p_user uuid,p_submission uuid,p_name text,p_size integer)
RETURNS public.career_files LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 PERFORM 1 FROM public.career_applications a JOIN public.career_submissions s ON s.application_id=a.id WHERE s.id=p_submission AND a.user_id=p_user AND a.status='task_sent' AND now()>=a.task_opens_at AND now()<a.task_deadline FOR UPDATE OF a;
 IF NOT FOUND THEN RAISE EXCEPTION 'Task round is not open'; END IF;
 RETURN public.reserve_career_file_internal(p_user,p_submission,p_name,p_size);
END $$;
REVOKE ALL ON FUNCTION public.reserve_career_file(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_career_file(uuid,uuid,text,integer) TO service_role;

CREATE FUNCTION public.manage_career_round(p_application uuid,p_status text,p_open timestamptz DEFAULT NULL,p_deadline timestamptz DEFAULT NULL,p_brief text DEFAULT NULL,p_update_window boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF p_status NOT IN('received','reviewing','task_sent','shortlisted','closed') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 IF p_update_window THEN
  IF p_open IS NULL OR p_deadline IS NULL OR p_deadline<=p_open OR p_deadline<=now() OR length(trim(p_brief)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Choose a future deadline and task brief'; END IF;
  UPDATE public.career_applications SET status=p_status,task_opens_at=p_open,task_deadline=p_deadline,task_brief=trim(p_brief) WHERE id=p_application;
 ELSE UPDATE public.career_applications SET status=p_status WHERE id=p_application;
 END IF;
 IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.manage_career_round(uuid,text,timestamptz,timestamptz,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_career_round(uuid,text,timestamptz,timestamptz,text,boolean) TO authenticated;
COMMIT;
