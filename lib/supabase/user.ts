import "server-only";
import { cache } from "react";
import { createClient } from "./server";

// getUser() is a round trip to Supabase Auth. A signed-in page used to
// make four to six of them per render (layout, credits, membership,
// profile, the page itself); cache() shares one per request. Server
// actions and API routes still call getUser() themselves.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
