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

    /* the caller's own role is read with the service key so RLS cannot be
       tricked into reporting a role the caller does not have */
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
        JSON.stringify({ error: "Only admins can delete staff" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();
    const staffId = String(body?.staffId || "").trim();

    if (!staffId) {
      return new Response(
        JSON.stringify({ error: "staffId is required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (staffId === userId) {
      return new Response(
        JSON.stringify({ error: "You cannot delete your own account" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", staffId)
      .maybeSingle();

    /* Deleting an account is at least as powerful as taking it over, so the
       same ranking rule as the password reset applies. */
    const rank = (role: string | null | undefined) => {
      if (role === "system_admin") return 3;
      if (role === "admin") return 2;
      return 1;
    };

    if (targetProfile && rank(targetProfile.role) >= rank(adminProfile.role)) {
      return new Response(
        JSON.stringify({
          error: "You cannot delete an equal or higher role"
        }),
        { status: 403, headers: corsHeaders }
      );
    }

    /* Order matters: the rows that point at this teacher go first, then the
       staff record, then the profile, then the login itself. Marks are keyed
       by student/class/subject/term and never reference the teacher, so no
       academic history is touched here. */
    const { error: classTeacherError } = await adminClient
      .from("class_teachers")
      .delete()
      .eq("teacher_id", staffId);

    if (classTeacherError) {
      return new Response(
        JSON.stringify({
          error: `Failed to clear class assignments: ${classTeacherError.message}`
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { error: subjectError } = await adminClient
      .from("teacher_subject_assignments")
      .delete()
      .eq("teacher_id", staffId);

    if (subjectError) {
      return new Response(
        JSON.stringify({
          error: `Failed to clear subject assignments: ${subjectError.message}`
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { error: teacherError } = await adminClient
      .from("teachers")
      .delete()
      .eq("id", staffId);

    if (teacherError) {
      return new Response(
        JSON.stringify({
          error: `Failed to delete staff record: ${teacherError.message}`
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", staffId);

    if (profileError) {
      return new Response(
        JSON.stringify({
          error: `Failed to delete profile: ${profileError.message}`
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    /* Last, because without this the person can still sign in and the email
       stays taken, which is the bug this endpoint exists to fix. */
    const { error: authDeleteError } =
      await adminClient.auth.admin.deleteUser(staffId);

    if (authDeleteError) {
      return new Response(
        JSON.stringify({
          error: `Staff records removed, but the login could not be deleted: ${authDeleteError.message}`
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Staff deleted successfully"
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
