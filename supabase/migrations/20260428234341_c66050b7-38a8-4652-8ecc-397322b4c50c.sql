
CREATE POLICY "Deny all client access to serpapi_cache"
  ON public.serpapi_cache FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
