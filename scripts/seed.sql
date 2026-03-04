-- Run after you have one user and org membership
insert into customers (org_id, first_name, last_name, phone, email)
select org_id, 'Demo', 'Customer', '555-111-2222', 'demo@example.com'
from org_members
where user_id = auth.uid()
limit 1;
