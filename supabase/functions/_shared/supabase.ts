import { createClient, type User } from "@supabase/supabase-js";

function getNamedKeyFromJsonEnv(envName: string, name: string): string | undefined {
  const json = Deno.env.get(envName);
  if (!json) return undefined;
  try {
    const keys = JSON.parse(json) as Record<string, string>;
    return keys[name];
  } catch {
    return undefined;
  }
}

function getSecretKey(name = "default"): string {
  return (
    getNamedKeyFromJsonEnv("SUPABASE_SECRET_KEYS", name) ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    ""
  );
}

function getPublishableKey(name = "default"): string {
  return (
    getNamedKeyFromJsonEnv("SUPABASE_PUBLISHABLE_KEYS", name) ??
    Deno.env.get("SUPABASE_ANON_KEY") ??
    ""
  );
}

export function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = getSecretKey();
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getUserFromRequest(req: Request): Promise<User | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const publishableKey = getPublishableKey();
  const supabase = createClient(url, publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}
