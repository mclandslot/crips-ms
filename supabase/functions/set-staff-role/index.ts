import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Applies a role change to profiles.role.

   teachers.role holds the label typed into the form ("Head Teacher") while
   profiles.role holds the value every guard compares against
   ("head_teacher"), so the two are mapped here rather than copied. Editing a
   teacher used to write teachers.role only, which left the account routed to
   its old portal.

   Role is effectively a permission, so this cannot be a client write or a
   trigger: it needs the caller's own rank checked. */
serve(async (req) => {
  const corsHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, Authorization, x-client-info, apikey, content-type"
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader =
      req.headers.get("authorization") || req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Missing environment variables" }),
        { status: 500, headers: corsHeaders }
      );
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey);
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const { data: claimsData, error: claimsError } =
      await authClient.auth.getClaims(token);

    const userId = claimsData?.claims?.sub;

    if (claimsError || !userId) {
      return new Response(
        JSON.stringify({
          error: "Invalid JWT",
          details: claimsError?.message || null
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { data: adminProfile, error: adminProfileError } = await adminClient
      .from("profiles")
      .select("id, role, is_active")
      .eq("id", userId)
      .single();

    if (adminProfileError || !adminProfile) {
      return new Response(
        JSON.stringify({ error: "Admin profile not found" }),
        { status: 403, headers: corsHeaders }
      );
    }

    if (!adminProfile.is_active) {
      return new Response(
        JSON.stringify({ error: "Your account is inactive" }),
        { status: 403, headers: corsHeaders }
      );
    }

    if (
      adminProfile.role !== "admin" &&
      adminProfile.role !== "system_admin"
    ) {
      return new Response(
        JSON.stringify({ error: "Only admins can change a role" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const staffId = String(body?.staffId || "").trim();
    const rawRole = String(body?.role || "").trim();

    if (!staffId || !rawRole) {
      return new Response(
        JSON.stringify({ error: "staffId and role are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (staffId === userId) {
      return new Response(
        JSON.stringify({ error: "You cannot change your own role" }),
        { status: 403, headers: corsHeaders }
      );
    }

    /* same mapping the Add Teacher form applies, kept here so the server
       never trusts a profile role sent by the browser */
    const mapProfileRole = (role: string) => {
      const value = role.trim().toLowerCase().replace(/\s+/g, "_");

      if (value === "administrator" || value === "admin") return "admin";
      if (value === "system_admin") return "system_admin";
      if (value === "head_teacher" || value === "headteacher") {
        return "head_teacher";
      }
      if (value === "teacher") return "teacher";

      return "";
    };

    const newRole = mapProfileRole(rawRole);

    if (!newRole) {
      return new Response(
        JSON.stringify({ error: `Unrecognised role: ${rawRole}` }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", staffId)
      .maybeSingle();

    if (targetProfileError) {
      return new Response(
        JSON.stringify({ error: targetProfileError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ error: "No login account found for this staff" }),
        { status: 404, headers: corsHeaders }
      );
    }

    const rank = (role: string | null | undefined) => {
      if (role === "system_admin") return 3;
      if (role === "admin") return 2;
      return 1;
    };

    /* cannot touch an account that outranks you ... */
    if (rank(targetProfile.role) >= rank(adminProfile.role)) {
      return new Response(
        JSON.stringify({
          error: "You cannot change the role of an equal or higher role"
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    /* ... nor promote anyone above yourself */
    if (rank(newRole) > rank(adminProfile.role)) {
      return new Response(
        JSON.stringify({ error: "You cannot grant a role above your own" }),
        { status: 403, headers: corsHeaders }
      );
    }

    if (targetProfile.role === newRole) {
      return new Response(
        JSON.stringify({ success: true, changed: false, role: newRole }),
        { status: 200, headers: corsHeaders }
      );
    }

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ role: newRole })
      .eq("id", staffId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    /* Their open session still carries the old role, and the portal guards
       only re-check on the next page load. Ending the session sends them
       back through login and into the portal the new role belongs to. */
    const { error: signOutError } =
      await adminClient.auth.admin.signOut(staffId, "global");

    return new Response(
      JSON.stringify({
        success: true,
        changed: true,
        role: newRole,
        warning: signOutError
          ? `Role changed, but the active session could not be ended: ${signOutError.message}`
          : undefined
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error?.message || "Unexpected server error"
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
