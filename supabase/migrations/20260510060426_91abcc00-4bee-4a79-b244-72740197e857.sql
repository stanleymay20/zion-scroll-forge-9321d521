create extension if not exists pg_cron;
create extension if not exists pg_net;

do $$ begin
  create type public.integrity_alert_severity as enum ('info','warning','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.integrity_alert_status as enum ('open','acknowledged','resolved','dismissed');
exception when duplicate_object then null; end $$;

create table if not exists public.academic_integrity_alerts (
  id uuid primary key default gen_random_uuid(),
  check_key text not null,
  severity public.integrity_alert_severity not null default 'warning',
  entity_type text not null,
  entity_id text,
  title text not null,
  details_json jsonb not null default '{}'::jsonb,
  status public.integrity_alert_status not null default 'open',
  first_detected_at timestamptz not null default now(),
  last_detected_at timestamptz not null default now(),
  detection_count integer not null default 1,
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uniq_integrity_alert_open
  on public.academic_integrity_alerts (check_key, entity_type, coalesce(entity_id,''))
  where status in ('open','acknowledged');

create index if not exists idx_integrity_alerts_status on public.academic_integrity_alerts(status);
create index if not exists idx_integrity_alerts_severity on public.academic_integrity_alerts(severity);
create index if not exists idx_integrity_alerts_check_key on public.academic_integrity_alerts(check_key);

alter table public.academic_integrity_alerts enable row level security;

drop policy if exists "Governance can view integrity alerts" on public.academic_integrity_alerts;
create policy "Governance can view integrity alerts"
on public.academic_integrity_alerts
for select
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'superadmin')
  or public.has_role(auth.uid(),'registrar')
);

drop policy if exists "Governance can update integrity alerts" on public.academic_integrity_alerts;
create policy "Governance can update integrity alerts"
on public.academic_integrity_alerts
for update
to authenticated
using (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'superadmin')
  or public.has_role(auth.uid(),'registrar')
)
with check (
  public.has_role(auth.uid(),'admin')
  or public.has_role(auth.uid(),'superadmin')
  or public.has_role(auth.uid(),'registrar')
);

drop trigger if exists trg_integrity_alerts_updated_at on public.academic_integrity_alerts;
create trigger trg_integrity_alerts_updated_at
before update on public.academic_integrity_alerts
for each row execute function public.update_updated_at_column();

create or replace function public.resolve_integrity_alert(
  p_alert_id uuid,
  p_resolution_reason text
) returns public.academic_integrity_alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alert public.academic_integrity_alerts;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not (
    public.has_role(auth.uid(),'admin')
    or public.has_role(auth.uid(),'superadmin')
    or public.has_role(auth.uid(),'registrar')
  ) then
    raise exception 'Insufficient privileges to resolve integrity alerts';
  end if;

  if p_resolution_reason is null or length(trim(p_resolution_reason)) < 10 then
    raise exception 'A written resolution reason of at least 10 characters is required';
  end if;

  update public.academic_integrity_alerts
     set status = 'resolved',
         resolved_at = now(),
         resolved_by = auth.uid(),
         resolution_reason = p_resolution_reason
   where id = p_alert_id
   returning * into v_alert;

  if v_alert.id is null then
    raise exception 'Alert not found: %', p_alert_id;
  end if;

  begin
    perform public.log_suyas_action(
      'integrity_alert_resolved',
      'academic_integrity_alerts',
      v_alert.id::text,
      jsonb_build_object(
        'check_key', v_alert.check_key,
        'severity', v_alert.severity,
        'entity_type', v_alert.entity_type,
        'entity_id', v_alert.entity_id,
        'reason', p_resolution_reason
      )
    );
  exception when others then null; end;

  return v_alert;
end;
$$;

revoke all on function public.resolve_integrity_alert(uuid, text) from public;
grant execute on function public.resolve_integrity_alert(uuid, text) to authenticated;