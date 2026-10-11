-- VYLOOP: private data, exact paise, immutable reward ledger, atomic RPCs.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (length(name)<=60),
  goals text[] not null default '{}', interests text[] not null default '{}',
  daily_minutes integer not null default 30 check (daily_minutes between 5 and 240),
  onboarded boolean not null default false, share_activity boolean not null default false,
  avatar text not null default 'violet' check(length(avatar)<=40),
  theme text not null default 'dark' check(theme in ('dark','light','system')),
  created_at timestamptz not null default now()
);
create table public.quests (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 120), description text not null default '' check(length(description)<=1000),
  category text not null check(category in ('Coding & Technology','Learning','Fitness','Productivity','Creativity','Personal Development','Financial Literacy')),
  difficulty text not null check(difficulty in ('Easy','Medium','Hard')),
  xp integer not null check(xp between 0 and 100), deadline date, is_custom boolean not null default true, catalog_key text, quest_day date, created_at timestamptz not null default now(),
  unique(id,user_id), unique(user_id,catalog_key,quest_day),
  check((catalog_key is null and quest_day is null) or (catalog_key is not null and quest_day is not null and not is_custom))
);
create table public.daily_quest_days (
  user_id uuid not null references public.profiles(id) on delete cascade, day date not null, created_at timestamptz not null default now(), primary key(user_id,day)
);
create table public.quest_completions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  quest_id uuid not null unique, xp integer not null check(xp between 0 and 100), completed_at timestamptz not null default now(),
  foreign key(quest_id,user_id) references public.quests(id,user_id) on delete restrict
);
create table public.xp_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  event_key text not null, amount integer not null check(amount between 0 and 100), created_at timestamptz not null default now(),
  unique(user_id,event_key)
);
create table public.expenses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 120), category text not null check(category in ('Food','Travel','Education','Shopping','Entertainment','Subscriptions','Health','Others')),
  amount_paise bigint not null check(amount_paise between 1 and 100000000000), date date not null, note text not null default '' check(length(note)<=1000), created_at timestamptz not null default now()
);
create table public.budgets (
  user_id uuid not null references public.profiles(id) on delete cascade,
  month text not null check(month ~ '^\d{4}-(0[1-9]|1[0-2])$'), amount_paise bigint not null check(amount_paise between 0 and 100000000000), updated_at timestamptz not null default now(),
  primary key(user_id,month)
);
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 120), target_paise bigint not null check(target_paise between 1 and 100000000000), target_date date, created_at timestamptz not null default now(), unique(id,user_id)
);
create table public.savings_contributions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  goal_id uuid not null, amount_paise bigint not null check(amount_paise between 1 and 100000000000), created_at timestamptz not null default now(),
  foreign key(goal_id,user_id) references public.savings_goals(id,user_id) on delete cascade
);
create table public.squads (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 60), invite_code text not null unique default upper(substr(encode(gen_random_bytes(12),'hex'),1,12)), created_at timestamptz not null default now()
);
create table public.squad_members (
  squad_id uuid not null references public.squads(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, joined_at timestamptz not null default now(), primary key(squad_id,user_id)
);
create table public.squad_challenges (
  id uuid primary key default gen_random_uuid(), squad_id uuid not null references public.squads(id) on delete cascade,
  title text not null check(length(trim(title)) between 1 and 120), target integer not null check(target between 1 and 100), created_by uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now()
);
create table public.squad_challenge_completions (
  challenge_id uuid not null references public.squad_challenges(id) on delete cascade, user_id uuid not null references public.profiles(id) on delete cascade, completed_at timestamptz not null default now(), primary key(challenge_id,user_id)
);
create index quests_user_created on public.quests(user_id,created_at);
create index completions_user_date on public.quest_completions(user_id,completed_at);
create index events_user_date on public.xp_events(user_id,created_at);
create index expenses_user_date on public.expenses(user_id,date);
create index savings_user_goal on public.savings_contributions(user_id,goal_id);
create index members_user on public.squad_members(user_id);

alter table public.profiles enable row level security;
alter table public.quests enable row level security;
alter table public.daily_quest_days enable row level security;
alter table public.quest_completions enable row level security;
alter table public.xp_events enable row level security;
alter table public.expenses enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_contributions enable row level security;
alter table public.squads enable row level security;
alter table public.squad_members enable row level security;
alter table public.squad_challenges enable row level security;
alter table public.squad_challenge_completions enable row level security;

-- SECURITY DEFINER avoids recursive membership policies. Identity is always auth.uid().
create function public.is_squad_member(p_squad_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$ select exists(select 1 from public.squad_members where squad_id=p_squad_id and user_id=auth.uid()); $$;
create function public.can_view_squad_completion(p_challenge_id uuid,p_actor_id uuid) returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select auth.uid() is not null and exists(
    select 1 from public.squad_challenges c
    join public.squad_members viewer on viewer.squad_id=c.squad_id and viewer.user_id=auth.uid()
    join public.squad_members actor on actor.squad_id=c.squad_id and actor.user_id=p_actor_id
    join public.profiles actor_profile on actor_profile.id=p_actor_id
    where c.id=p_challenge_id and actor_profile.share_activity
  );
$$;
create policy profile_private on public.profiles for select to authenticated using(id=auth.uid());
create policy quests_private on public.quests for select to authenticated using(user_id=auth.uid());
create policy daily_days_private on public.daily_quest_days for select to authenticated using(user_id=auth.uid());
create policy completions_private on public.quest_completions for select to authenticated using(user_id=auth.uid());
create policy events_private on public.xp_events for select to authenticated using(user_id=auth.uid());
create policy expenses_private on public.expenses for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy budgets_private on public.budgets for select to authenticated using(user_id=auth.uid());
create policy goals_private on public.savings_goals for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy contributions_private on public.savings_contributions for select to authenticated using(user_id=auth.uid());
create policy squads_members_only on public.squads for select to authenticated using(public.is_squad_member(id));
create policy members_squad_only on public.squad_members for select to authenticated using(public.is_squad_member(squad_id));
create policy challenges_squad_only on public.squad_challenges for select to authenticated using(public.is_squad_member(squad_id));
create policy challenge_completions_shared on public.squad_challenge_completions for select to authenticated using(user_id=auth.uid() or public.can_view_squad_completion(challenge_id,user_id));

-- No direct writes to rewards, completions, budgets, quests, membership, or profiles.
revoke all on public.profiles,public.quests,public.daily_quest_days,public.quest_completions,public.xp_events,public.expenses,public.budgets,public.savings_goals,public.savings_contributions,public.squads,public.squad_members,public.squad_challenges,public.squad_challenge_completions from public,anon;
revoke all on public.profiles,public.quests,public.daily_quest_days,public.quest_completions,public.xp_events,public.expenses,public.budgets,public.savings_goals,public.savings_contributions,public.squads,public.squad_members,public.squad_challenges,public.squad_challenge_completions from authenticated;
grant select on public.profiles,public.quests,public.daily_quest_days,public.quest_completions,public.xp_events,public.expenses,public.budgets,public.savings_goals,public.savings_contributions,public.squads,public.squad_members,public.squad_challenges,public.squad_challenge_completions to authenticated;
grant insert,update,delete on public.expenses,public.savings_goals to authenticated;

create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public,pg_temp as $$ begin insert into public.profiles(id,name) values(new.id,left(coalesce(new.raw_user_meta_data->>'name',''),60)); return new; end; $$;
create trigger create_vyloop_profile after insert on auth.users for each row execute function public.handle_new_user();
insert into public.profiles(id,name) select id,left(coalesce(raw_user_meta_data->>'name',''),60) from auth.users on conflict do nothing;

create function public.require_user() returns uuid language plpgsql stable security definer set search_path=public,pg_temp as $$ declare v_uid uuid:=auth.uid(); begin if v_uid is null then raise exception 'Authentication required'; end if; return v_uid; end; $$;

create function public.ensure_daily_quests() returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=public.require_user();v_day date:=(now() at time zone 'UTC')::date;begin
  perform 1 from public.profiles where id=v_uid for update;
  -- The batch marker survives quest deletion, so a refresh cannot resurrect a quest.
  insert into public.daily_quest_days(user_id,day) values(v_uid,v_day) on conflict(user_id,day) do nothing;
  if not found then return;end if;
  insert into public.quests(user_id,title,description,category,difficulty,xp,is_custom,catalog_key,quest_day)
  select v_uid,c.title,c.description,c.category,c.difficulty,c.xp,false,c.catalog_key,v_day from (values
    ('build','Build something for 30 minutes','Open your editor and make one small thing better. Progress beats perfection.','Coding & Technology','Medium',60),
    ('move','Move your body','Take a walk, stretch, or get a short workout in. Make it your own.','Fitness','Easy',40),
    ('read','Read 10 pages','A little curiosity goes a long way. Pick up that book you started.','Learning','Easy',40),
    ('budget','Give your budget a check-in','Review your spending and plan your next week with intention.','Financial Literacy','Easy',40),
    ('focus','Make room for deep work','Put your phone away and focus on a single task for 25 minutes.','Productivity','Medium',60),
    ('create','Create just for fun','Sketch, write, play, or make something without worrying about the result.','Creativity','Medium',60)
  ) as c(catalog_key,title,description,category,difficulty,xp);
end; $$;

create function public.create_quest(p_title text,p_description text,p_category text,p_difficulty text,p_deadline date default null) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=public.require_user();v_id uuid;v_xp integer;
begin
  perform 1 from public.profiles where id=v_uid for update;
  v_xp:=case p_difficulty when 'Easy' then 40 when 'Medium' then 60 when 'Hard' then 100 else null end;
  if v_xp is null then raise exception 'Invalid difficulty'; end if;
  if (select count(*) from public.quests where user_id=v_uid and is_custom and created_at>=(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC'))>=20 then raise exception 'Daily quest creation limit reached'; end if;
  insert into public.quests(user_id,title,description,category,difficulty,xp,deadline) values(v_uid,trim(p_title),coalesce(p_description,''),p_category,p_difficulty,v_xp,p_deadline) returning id into v_id;return v_id;
end; $$;

create function public.complete_quest(p_quest_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=public.require_user();v_quest public.quests%rowtype;v_daily integer;
begin
  -- Serialize reward decisions per account and lock the owned quest before writing.
  perform 1 from public.profiles where id=v_uid for update;
  select * into v_quest from public.quests where id=p_quest_id and user_id=v_uid for update;
  if not found then raise exception 'Quest not found'; end if;
  if v_quest.quest_day is not null and v_quest.quest_day<>(now() at time zone 'UTC')::date then raise exception 'This daily quest has expired';end if;
  if exists(select 1 from public.quest_completions where quest_id=p_quest_id) then raise exception 'This quest is already complete'; end if;
  select coalesce(sum(xp),0) into v_daily from public.quest_completions where user_id=v_uid and completed_at>=(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC');
  if v_daily+v_quest.xp>500 then raise exception 'Daily quest XP limit is 500. Come back tomorrow.'; end if;
  insert into public.quest_completions(user_id,quest_id,xp) values(v_uid,p_quest_id,v_quest.xp);
  insert into public.xp_events(user_id,event_key,amount) values(v_uid,'quest:'||p_quest_id::text,v_quest.xp);
end; $$;

create function public.delete_quest(p_quest_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=public.require_user();begin if exists(select 1 from public.quest_completions where quest_id=p_quest_id and user_id=v_uid) then raise exception 'Completed quests stay in activity history';end if;delete from public.quests where id=p_quest_id and user_id=v_uid;if not found then raise exception 'Quest not found';end if;end; $$;

create function public.set_budget(p_month text,p_amount bigint) returns void language plpgsql security definer set search_path=public,pg_temp as $$ declare v_uid uuid:=public.require_user();begin insert into public.budgets(user_id,month,amount_paise) values(v_uid,p_month,p_amount) on conflict(user_id,month) do update set amount_paise=excluded.amount_paise,updated_at=now();end; $$;

create function public.contribute_savings(p_goal_id uuid,p_amount bigint) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=public.require_user();v_goal public.savings_goals%rowtype;v_total bigint;v_milestone integer;v_daily_xp integer;begin
  perform 1 from public.profiles where id=v_uid for update;
  select * into v_goal from public.savings_goals where id=p_goal_id and user_id=v_uid for update;
  if not found then raise exception 'Savings goal not found';end if;
  if p_amount is null or p_amount<=0 or p_amount>100000000000 then raise exception 'Invalid contribution';end if;
  select coalesce(sum(amount_paise),0)+p_amount into v_total from public.savings_contributions where goal_id=p_goal_id and user_id=v_uid;
  if v_total>100000000000 then raise exception 'Savings amount exceeds supported range';end if;
  insert into public.savings_contributions(user_id,goal_id,amount_paise) values(v_uid,p_goal_id,p_amount);
  select coalesce(sum(amount),0) into v_daily_xp from public.xp_events where user_id=v_uid and event_key like 'savings:%' and created_at>=(date_trunc('day',now() at time zone 'UTC') at time zone 'UTC');
  foreach v_milestone in array array[25,50,100] loop
    if v_total*100>=v_goal.target_paise*v_milestone and v_daily_xp+80<=240 then insert into public.xp_events(user_id,event_key,amount) values(v_uid,'savings:'||p_goal_id::text||':'||v_milestone::text,80) on conflict(user_id,event_key) do nothing;if found then v_daily_xp:=v_daily_xp+80;end if;end if;
  end loop;
end; $$;

create function public.update_profile(p_changes jsonb) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=public.require_user();v_goals text[];v_interests text[];begin
  if p_changes?'goals' then select array_agg(value) into v_goals from jsonb_array_elements_text(p_changes->'goals');v_goals:=coalesce(v_goals,'{}');if cardinality(v_goals)>12 or exists(select 1 from unnest(v_goals) g where length(g)>120) then raise exception 'Invalid goals';end if;end if;
  if p_changes?'interests' then select array_agg(value) into v_interests from jsonb_array_elements_text(p_changes->'interests');v_interests:=coalesce(v_interests,'{}');if cardinality(v_interests)>12 or exists(select 1 from unnest(v_interests) i where length(i)>120) then raise exception 'Invalid interests';end if;end if;
  if p_changes?'name' and length(trim(p_changes->>'name'))=0 then raise exception 'Display name is required';end if;
  update public.profiles set name=case when p_changes?'name' then trim(p_changes->>'name') else name end,goals=coalesce(v_goals,goals),interests=coalesce(v_interests,interests),daily_minutes=case when p_changes?'dailyMinutes' then (p_changes->>'dailyMinutes')::integer else daily_minutes end,onboarded=case when p_changes?'onboarded' then (p_changes->>'onboarded')::boolean else onboarded end,share_activity=case when p_changes?'shareActivity' then (p_changes->>'shareActivity')::boolean else share_activity end,avatar=case when p_changes?'avatar' then p_changes->>'avatar' else avatar end,theme=case when p_changes?'theme' then p_changes->>'theme' else theme end where id=v_uid;
  if p_changes?'name' then update public.squad_members set name=trim(p_changes->>'name') where user_id=v_uid;end if;
end; $$;

create function public.finish_onboarding(p_profile jsonb,p_budget bigint default null,p_goal jsonb default null,p_month text default null) returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=public.require_user();v_onboarded boolean;begin
  select onboarded into v_onboarded from public.profiles where id=v_uid for update;
  if not found then raise exception 'Account profile is missing';end if;
  if jsonb_typeof(coalesce(p_profile,'{}'::jsonb))<>'object' then raise exception 'Invalid profile';end if;
  -- All profile, budget, and optional goal writes commit or roll back together.
  perform public.update_profile(coalesce(p_profile,'{}'::jsonb)||'{"onboarded":true}'::jsonb);
  if not exists(select 1 from public.profiles where id=v_uid and length(trim(name)) between 1 and 60) then raise exception 'Display name is required';end if;
  if p_budget is not null then perform public.set_budget(coalesce(p_month,to_char(now() at time zone 'UTC','YYYY-MM')),p_budget);end if;
  if p_goal is not null and p_goal<>'null'::jsonb and not v_onboarded then
    insert into public.savings_goals(user_id,title,target_paise,target_date) values(v_uid,trim(p_goal->>'title'),(p_goal->>'targetPaise')::bigint,nullif(p_goal->>'targetDate','')::date);
  end if;
end; $$;

create function public.create_squad(p_name text) returns uuid language plpgsql security definer set search_path=public,pg_temp as $$ declare v_uid uuid:=public.require_user();v_id uuid;begin if(select count(*) from public.squad_members where user_id=v_uid)>=20 then raise exception 'Maximum of 20 squads';end if;insert into public.squads(owner_id,name) values(v_uid,trim(p_name)) returning id into v_id;insert into public.squad_members(squad_id,user_id,name) select v_id,v_uid,name from public.profiles where id=v_uid;return v_id;end; $$;
create function public.join_squad(p_code text) returns void language plpgsql security definer set search_path=public,pg_temp as $$ declare v_uid uuid:=public.require_user();v_squad uuid;begin if(select count(*) from public.squad_members where user_id=v_uid)>=20 then raise exception 'Maximum of 20 squads';end if;select id into v_squad from public.squads where invite_code=upper(trim(p_code));if v_squad is null then raise exception 'Invite code not found';end if;insert into public.squad_members(squad_id,user_id,name) select v_squad,v_uid,name from public.profiles where id=v_uid;end; $$;
create function public.add_squad_challenge(p_squad_id uuid,p_title text,p_target integer) returns void language plpgsql security definer set search_path=public,pg_temp as $$ declare v_uid uuid:=public.require_user();begin if not public.is_squad_member(p_squad_id) then raise exception 'Squad membership required';end if;insert into public.squad_challenges(squad_id,title,target,created_by) values(p_squad_id,trim(p_title),p_target,v_uid);end; $$;
create function public.complete_squad_challenge(p_challenge_id uuid) returns void language plpgsql security definer set search_path=public,pg_temp as $$ declare v_uid uuid:=public.require_user();v_squad uuid;begin select squad_id into v_squad from public.squad_challenges where id=p_challenge_id;if v_squad is null or not public.is_squad_member(v_squad) then raise exception 'Squad membership required';end if;if not exists(select 1 from public.profiles where id=v_uid and share_activity) then raise exception 'Enable activity sharing before contributing';end if;insert into public.squad_challenge_completions(challenge_id,user_id) values(p_challenge_id,v_uid);end; $$;

-- A member's financial data is never joined into a squad response.
create function public.get_app_state() returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
declare v_uid uuid:=public.require_user();v_result jsonb;begin
  select jsonb_build_object(
    'profile',jsonb_build_object('name',p.name,'goals',p.goals,'interests',p.interests,'dailyMinutes',p.daily_minutes,'onboarded',p.onboarded,'shareActivity',p.share_activity,'avatar',p.avatar),
    'theme',p.theme,
    'quests',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'title',q.title,'description',q.description,'category',q.category,'difficulty',q.difficulty,'xp',q.xp,'createdAt',q.created_at,'deadline',q.deadline,'isCustom',q.is_custom,'catalogKey',q.catalog_key,'day',q.quest_day) order by q.created_at desc) from public.quests q where q.user_id=v_uid and (q.quest_day is null or q.quest_day=(now() at time zone 'UTC')::date or exists(select 1 from public.quest_completions qc where qc.quest_id=q.id and qc.user_id=v_uid))),'[]'::jsonb),
    'dailyQuestDays',coalesce((select jsonb_agg(d.day order by d.day) from public.daily_quest_days d where d.user_id=v_uid),'[]'::jsonb),
    'completions',coalesce((select jsonb_agg(jsonb_build_object('questId',c.quest_id,'completedAt',c.completed_at,'xp',c.xp)) from public.quest_completions c where c.user_id=v_uid),'[]'::jsonb),
    'xpEvents',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'key',e.event_key,'amount',e.amount,'date',e.created_at)) from public.xp_events e where e.user_id=v_uid),'[]'::jsonb),
    'expenses',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'title',e.title,'category',e.category,'amountPaise',e.amount_paise,'date',e.date,'note',e.note) order by e.date desc,e.created_at desc) from public.expenses e where e.user_id=v_uid),'[]'::jsonb),
    'budgetPaise',coalesce((select b.amount_paise from public.budgets b where b.user_id=v_uid and b.month=to_char(now(),'YYYY-MM')),0),
    'budgets',coalesce((select jsonb_object_agg(b.month,b.amount_paise) from public.budgets b where b.user_id=v_uid),'{}'::jsonb),
    'goals',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'title',g.title,'targetPaise',g.target_paise,'targetDate',g.target_date,'contributions',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'amountPaise',c.amount_paise,'date',c.created_at) order by c.created_at) from public.savings_contributions c where c.goal_id=g.id and c.user_id=v_uid),'[]'::jsonb))) from public.savings_goals g where g.user_id=v_uid),'[]'::jsonb),
    'squads',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'code',s.invite_code,
      'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',m.name,'joinedAt',m.joined_at)) from public.squad_members m where m.squad_id=s.id),'[]'::jsonb),
      'challenges',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'title',c.title,'target',c.target,'completedBy',coalesce((select jsonb_agg(cc.user_id) from public.squad_challenge_completions cc join public.profiles cp on cp.id=cc.user_id where cc.challenge_id=c.id and cp.share_activity),'[]'::jsonb))) from public.squad_challenges c where c.squad_id=s.id),'[]'::jsonb))) from public.squads s where public.is_squad_member(s.id)),'[]'::jsonb)
  ) into v_result from public.profiles p where p.id=v_uid;
  if v_result is null then raise exception 'Account profile is missing';end if;return v_result;
end; $$;

-- Derived read models: no mutable client achievement or skill unlock records.
create view public.skill_progression with (security_invoker=true) as select q.user_id,q.category,count(c.id)::integer as completed_quests from public.quests q left join public.quest_completions c on c.quest_id=q.id group by q.user_id,q.category;
create view public.achievement_progress with (security_invoker=true) as select p.id as user_id,(select count(*) from public.quest_completions c where c.user_id=p.id) as completed_quests,(select count(*) from public.expenses e where e.user_id=p.id) as logged_expenses,(select coalesce(sum(c.amount_paise),0) from public.savings_contributions c where c.user_id=p.id) as savings_paise from public.profiles p;
revoke all on public.skill_progression,public.achievement_progress from public,anon,authenticated;
grant select on public.skill_progression,public.achievement_progress to authenticated;

create function public.delete_account() returns void language plpgsql security definer set search_path=public,pg_temp as $$ declare v_uid uuid:=public.require_user();begin
  -- Remove restrictive completed-quest references before cascading the account.
  delete from public.quest_completions where user_id=v_uid;
  delete from auth.users where id=v_uid;
end; $$;

-- PostgreSQL functions default to PUBLIC execute: remove it explicitly.
revoke execute on function public.handle_new_user(),public.require_user(),public.is_squad_member(uuid),public.can_view_squad_completion(uuid,uuid),public.ensure_daily_quests(),public.create_quest(text,text,text,text,date),public.complete_quest(uuid),public.delete_quest(uuid),public.set_budget(text,bigint),public.contribute_savings(uuid,bigint),public.update_profile(jsonb),public.finish_onboarding(jsonb,bigint,jsonb,text),public.create_squad(text),public.join_squad(text),public.add_squad_challenge(uuid,text,integer),public.complete_squad_challenge(uuid),public.get_app_state(),public.delete_account() from public,anon,authenticated;
grant execute on function public.is_squad_member(uuid),public.can_view_squad_completion(uuid,uuid),public.ensure_daily_quests(),public.create_quest(text,text,text,text,date),public.complete_quest(uuid),public.delete_quest(uuid),public.set_budget(text,bigint),public.contribute_savings(uuid,bigint),public.update_profile(jsonb),public.finish_onboarding(jsonb,bigint,jsonb,text),public.create_squad(text),public.join_squad(text),public.add_squad_challenge(uuid,text,integer),public.complete_squad_challenge(uuid),public.get_app_state(),public.delete_account() to authenticated;
