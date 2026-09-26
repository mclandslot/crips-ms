import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Blocks or unblocks a staff login by flipping profiles.is_active.

   Done on the server so the rule cannot be bypassed from a console: a
   client-side update relies entirely on the RLS policy for profiles, and the
   common "users may update their own row" policy would let a blocked user
   unblock themselves. */
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
        JSON.stringify({ error: "Only admins can block or unblock staff" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const staffId = String(body?.staffId || "").trim();
    const isActive = body?.isActive;

    if (!staffId || typeof isActive !== "boolean") {
      return new Response(
        JSON.stringify({ error: "staffId and isActive are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (staffId === userId) {
      return new Response(
        JSON.stringify({ error: "You cannot block your own account" }),
        { status: 403, headers: corsHeaders }
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

    /* locking someone out is a privileged act, so the same ranking rule as
       the password reset and the delete applies */
    const rank = (role: string | null | undefined) => {
      if (role === "system_admin") return 3;
      if (role === "admin") return 2;
      return 1;
    };

    if (rank(targetProfile.role) >= rank(adminProfile.role)) {
      return new Response(
        JSON.stringify({
          error: "You cannot block or unblock an equal or higher role"
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", staffId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    /* The guards only re-read the profile on the next page load, so a blocked
       user with a tab already open would keep working until then. Revoking
       their refresh token ends the session instead of waiting. */
    if (!isActive) {
      const { error: signOutError } =
        await adminClient.auth.admin.signOut(staffId, "global");

      if (signOutError) {
        return new Response(
          JSON.stringify({
            success: true,
            warning: `Blocked, but the active session could not be ended: ${signOutError.message}`
          }),
          { status: 200, headers: corsHeaders }
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: isActive ? "Staff unblocked" : "Staff blocked"
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
