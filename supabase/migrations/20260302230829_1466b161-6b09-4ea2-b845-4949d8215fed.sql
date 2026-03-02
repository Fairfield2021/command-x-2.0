-- Extend tm_ticket_status enum with new values
ALTER TYPE public.tm_ticket_status ADD VALUE IF NOT EXISTS 'open';
ALTER TYPE public.tm_ticket_status ADD VALUE IF NOT EXISTS 'cap_reached';
ALTER TYPE public.tm_ticket_status ADD VALUE IF NOT EXISTS 'pending_approval';
ALTER TYPE public.tm_ticket_status ADD VALUE IF NOT EXISTS 'converted_to_co';