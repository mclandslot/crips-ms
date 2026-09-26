import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
        JSON.stringify({ error: "Only admins can reset passwords" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const newPassword = String(body?.newPassword || "").trim();

    if (!email || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Email and newPassword are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (newPassword.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { data: targetProfile, error: targetProfileError } = await adminClient
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("email", email)
      .single();

    if (targetProfileError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: "No user found with that email" }),
        { status: 404, headers: corsHeaders }
      );
    }

    /* Setting someone's password is taking over their account, so a caller
       must never be able to do it to an account that outranks their own -
       otherwise any admin could seize the system_admin account. Resetting
       your own password here is still allowed. */
    const rank = (role: string | null) => {
      if (role === "system_admin") return 3;
      if (role === "admin") return 2;
      return 1;
    };

    if (
      targetProfile.id !== userId &&
      rank(targetProfile.role) >= rank(adminProfile.role)
    ) {
      return new Response(
        JSON.stringify({
          error: "You cannot reset the password of an equal or higher role"
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    const { error: updateAuthError } =
      await adminClient.auth.admin.updateUserById(targetProfile.id, {
        password: newPassword
      });

    if (updateAuthError) {
      return new Response(
        JSON.stringify({ error: updateAuthError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { error: updateProfileError } = await adminClient
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", targetProfile.id);

    if (updateProfileError) {
      return new Response(
        JSON.stringify({ error: updateProfileError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Password reset successfully"
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