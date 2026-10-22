-- CUMID careers-only initial setup. Run once in Supabase SQL Editor.
-- Does not alter payment, order or catalogue data.
-- Requires the existing CUMID profiles table from account setup.
BEGIN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer', ADD COLUMN IF NOT EXISTS phone text;
REVOKE INSERT,UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE(display_name,avatar_url,phone,updated_at) ON public.profiles TO authenticated;
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path='' AS $$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin') $$;
DO $bootstrap$ BEGIN
IF to_regclass('public.career_applications') IS NULL THEN
EXECUTE $install$CREATE TABLE public.career_applications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(name)<=100), email text NOT NULL, role text NOT NULL CHECK(length(role)<=80),
 introduction text NOT NULL CHECK(length(introduction)<=2000), links jsonb NOT NULL DEFAULT '[]',
 status text NOT NULL DEFAULT 'received' CHECK(status IN('received','reviewing','task_sent','shortlisted','closed')),
 privacy_version text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,role)
);
CREATE TABLE public.career_submissions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES public.career_applications(id) ON DELETE CASCADE,
 title text NOT NULL CHECK(length(title)<=160), notes text NOT NULL DEFAULT '' CHECK(length(notes)<=2000),
 links jsonb NOT NULL DEFAULT '[]', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.career_files (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), application_id uuid NOT NULL REFERENCES public.career_applications(id) ON DELETE CASCADE,
 submission_id uuid NOT NULL REFERENCES public.career_submissions(id) ON DELETE CASCADE,
 name text NOT NULL CHECK(length(name)<=180), path text NOT NULL UNIQUE, size integer NOT NULL CHECK(size>0 AND size<=2097152),
 state text NOT NULL DEFAULT 'reserved' CHECK(state IN('reserved','uploaded')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.career_applications(created_at DESC);
CREATE INDEX ON public.career_submissions(application_id);
CREATE INDEX ON public.career_files(application_id);
CREATE FUNCTION public.create_career_submission(p_user uuid,p_application uuid,p_title text,p_notes text,p_links jsonb)
RETURNS public.career_submissions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE s public.career_submissions;
BEGIN
 PERFORM 1 FROM public.career_applications WHERE id=p_application AND user_id=p_user FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
 IF (SELECT count(*) FROM public.career_submissions WHERE application_id=p_application)>=10 THEN RAISE EXCEPTION 'Submission limit reached'; END IF;
 INSERT INTO public.career_submissions(application_id,title,notes,links) VALUES(p_application,p_title,p_notes,p_links) RETURNING * INTO s;
 RETURN s;
END $$;
REVOKE ALL ON FUNCTION public.create_career_submission(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_career_submission(uuid,uuid,text,text,jsonb) TO service_role;
ALTER TABLE public.career_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_files ENABLE ROW LEVEL SECURITY;
-- Access goes through authenticated server routes; no public direct writes or file URLs.
REVOKE ALL ON public.career_applications,public.career_submissions,public.career_files FROM anon,authenticated;
GRANT ALL ON public.career_applications,public.career_submissions,public.career_files TO service_role;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('career-files','career-files',false,2097152,ARRAY['application/octet-stream']) ON CONFLICT(id) DO NOTHING;

CREATE FUNCTION public.reserve_career_file(p_user uuid,p_submission uuid,p_name text,p_size integer)
RETURNS public.career_files LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE a uuid; f public.career_files;
BEGIN
 PERFORM pg_advisory_xact_lock(721022);
 SELECT s.application_id INTO a FROM public.career_submissions s JOIN public.career_applications c ON c.id=s.application_id WHERE s.id=p_submission AND c.user_id=p_user;
 IF a IS NULL THEN RAISE EXCEPTION 'Submission not found'; END IF;
 IF (SELECT count(*) FROM public.career_files WHERE submission_id=p_submission)>=3 OR (SELECT coalesce(sum(size),0) FROM public.career_files WHERE application_id=a)+p_size>6291456 OR (SELECT coalesce(sum(size),0) FROM public.career_files WHERE state='reserved')+(SELECT coalesce(sum((metadata->>'size')::bigint),0) FROM storage.objects WHERE bucket_id='career-files')+p_size>134217728 THEN RAISE EXCEPTION 'Upload allowance reached. Please submit a Drive link instead.'; END IF;
 INSERT INTO public.career_files(application_id,submission_id,name,path,size) VALUES(a,p_submission,p_name,p_user::text||'/'||gen_random_uuid()::text,p_size) RETURNING * INTO f;
 RETURN f;
END $$;
REVOKE ALL ON FUNCTION public.reserve_career_file(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_career_file(uuid,uuid,text,integer) TO service_role;
$install$;
END IF;
END $bootstrap$;
COMMIT;

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
