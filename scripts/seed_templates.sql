-- Seeds default follow-up templates for the current authenticated user's org.
insert into message_templates (org_id, created_by, name, channel, body, is_default)
select om.org_id, auth.uid(), 'Default SMS Follow-Up', 'sms',
       'Hey {first_name}, just checking in on the quote I sent over. Want to get this on the schedule?', true
from org_members om
where om.user_id = auth.uid()
  and not exists (
    select 1 from message_templates mt where mt.org_id = om.org_id and mt.is_default = true and mt.channel = 'sms'
  )
limit 1;

insert into message_templates (org_id, created_by, name, channel, subject, body, is_default)
select om.org_id, auth.uid(), 'Default Email Follow-Up', 'email',
       'Quick follow-up on your quote',
       'Hi {first_name}, just checking in on the quote I sent over. Happy to answer questions and get you on the schedule.',
       true
from org_members om
where om.user_id = auth.uid()
  and not exists (
    select 1 from message_templates mt where mt.org_id = om.org_id and mt.is_default = true and mt.channel = 'email'
  )
limit 1;
