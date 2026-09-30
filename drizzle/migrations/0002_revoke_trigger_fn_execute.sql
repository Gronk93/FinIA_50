REVOKE EXECUTE ON FUNCTION public.guard_closed_month() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_future_allocation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.close_month(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reopen_month(text, text) FROM PUBLIC, anon;