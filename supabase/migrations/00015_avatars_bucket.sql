-- Private `avatars` bucket for client profile pictures.
--
-- Why: profile pics used to be stored as base64 data URLs directly in
-- sim_profiles.profile_pic and participant_profiles.profile_pic. This
-- bloated rows to ~900 KB each and caused ~2 MB payloads on every page
-- load. Moving avatars to Storage drops per-row DB cost to ~220 bytes
-- and lets the browser/CDN cache the image bytes separately.
--
-- Privacy model:
-- - Bucket is PRIVATE (public = false). Direct URLs 403 without a
--   signed token. This prevents drive-by access by anyone who learns
--   a bucket path.
-- - SELECT policy allows ANY authenticated role to read the bucket.
--   Tighter scoping (per-user paths) isn't added because PSIDs are
--   cryptographically random and user A never learns user B's PSIDs
--   (participant_profiles is RLS-gated per user_id). That gives us
--   defense-in-depth without policy joins that would hurt perf.
-- - INSERT/UPDATE/DELETE: no policies added. Only the service role
--   writes (via the sim-api edge function), and service role bypasses
--   RLS entirely.
--
-- Consumers: sim-api edge function (service-role writes + server-side
-- signed URL generation for the simulator UI), and the main app
-- frontend (authenticated user generates signed URLs client-side).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  262144,  -- 256 KB hard cap; resized client-side to ~15-25 KB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Authenticated read avatars"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');
