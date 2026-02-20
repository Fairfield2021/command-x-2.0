
## Grant Admin Access to chris.guevara97@gmail.com

### Current State
- User **chris.guevara97@gmail.com** exists in the system (ID: `319c5277-ae95-432a-922a-63131fe2bf79`)
- They currently have **no role assigned** — confirmed the `user_roles` table has no row for this user
- A clean insert (not an update) is needed

### What Needs to Happen
Insert a single row into the `user_roles` table:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('319c5277-ae95-432a-922a-63131fe2bf79', 'admin');
```

### Security Notes
- Roles are stored in the separate `user_roles` table (not on the profiles table), which is correct per the system's security model
- The `has_role()` security definer function will immediately recognize this user as admin across all RLS policies
- Admin role grants full access to all modules per the `has_permission()` function

### Impact
Once applied, chris.guevara97@gmail.com will have:
- Full access to all modules (view, add, edit, delete)
- Access to User Management, Permissions Management, Settings, Audit Logs
- Ability to invite users, lock accounting periods, and manage all system data
- The change takes effect immediately on their next action — no logout/login required
