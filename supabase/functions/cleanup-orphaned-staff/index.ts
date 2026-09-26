import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Cleans up logins left behind by the old delete, which removed the teachers
   row but not the profile or the auth user.

   Deliberately conservative:
   - only roles created through Add Teacher that should always have a teachers
     row are considered, and never admin/system_admin - the original admin
     account was made directly in Supabase and legitimately has no such row
   - never the caller
   - dry run unless confirm:true is passed */
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
        JSON.stringify({ error: "Only admins can run this cleanup" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json().catch(() => ({}));
    const confirmed = body?.confirm === true;

    type Orphan = {
      id: string;
      email: string | null;
      full_name: string | null;
      role: string | null;
      kind: string;
    };

    /* Every profile, so a role stored as "Teacher" rather than "teacher" is
       still seen. Admin roles are excluded by name below instead of staff
       roles being included, which fails safe against unexpected casing. */
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("id, email, full_name, role");

    if (profilesError) {
      return new Response(
        JSON.stringify({ error: profilesError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    const isAdminRole = (role: string | null | undefined) => {
      const value = String(role || "").trim().toLowerCase().replace(/\s+/g, "_");
      return value === "admin" || value === "system_admin" ||
        value === "administrator";
    };

    const allProfiles = profiles || [];
    const profileIds = new Set(allProfiles.map((p) => p.id));

    const { data: allTeacherRows, error: teachersError } = await adminClient
      .from("teachers")
      .select("id");

    if (teachersError) {
      return new Response(
        JSON.stringify({ error: teachersError.message }),
        { status: 400, headers: corsHeaders }
      );
    }

    const withTeacherRow = new Set((allTeacherRows || []).map((t) => t.id));

    /* Case 1: profile with no staff record. These can still sign in. */
    const profileOrphans: Orphan[] = allProfiles
      .filter((p) => p.id !== userId)
      .filter((p) => !isAdminRole(p.role))
      .filter((p) => !withTeacherRow.has(p.id))
      .map((p) => ({
        id: p.id,
        email: p.email ?? null,
        full_name: p.full_name ?? null,
        role: p.role ?? null,
        kind: "profile+login"
      }));

    /* Case 2: login with no profile at all - what a cascade from teachers to
       profiles would leave behind. Cannot sign in (the guards reject a missing
       profile) but still holds the email address. */
    const authOnlyOrphans: Orphan[] = [];

    let page = 1;
    const perPage = 200;

    for (;;) {
      const { data: userPage, error: listError } =
        await adminClient.auth.admin.listUsers({ page, perPage });

      if (listError) {
        return new Response(
          JSON.stringify({ error: listError.message }),
          { status: 400, headers: corsHeaders }
        );
      }

      const users = userPage?.users || [];

      for (const u of users) {
        if (u.id === userId) continue;
        if (profileIds.has(u.id)) continue;
        if (withTeacherRow.has(u.id)) continue;

        authOnlyOrphans.push({
          id: u.id,
          email: u.email ?? null,
          full_name: (u.user_metadata?.full_name as string) ?? null,
          role: null,
          kind: "login only"
        });
      }

      if (users.length < perPage) break;
      page += 1;
    }

    const orphans = [...profileOrphans, ...authOnlyOrphans];

    /* nothing is removed until the caller has seen this list */
    if (!confirmed) {
      return new Response(
        JSON.stringify({ dryRun: true, orphans, deleted: 0 }),
        { status: 200, headers: corsHeaders }
      );
    }

    const failures: Array<{
      id: string;
      email: string | null;
      error: string;
    }> = [];
    let deleted = 0;

    for (const orphan of orphans) {
      const { error: classTeacherError } = await adminClient
        .from("class_teachers")
        .delete()
        .eq("teacher_id", orphan.id);

      if (classTeacherError) {
        failures.push({
          id: orphan.id,
          email: orphan.email,
          error: classTeacherError.message
        });
        continue;
      }

      const { error: subjectError } = await adminClient
        .from("teacher_subject_assignments")
        .delete()
        .eq("teacher_id", orphan.id);

      if (subjectError) {
        failures.push({
          id: orphan.id,
          email: orphan.email,
          error: subjectError.message
        });
        continue;
      }

      const { error: profileError } = await adminClient
        .from("profiles")
        .delete()
        .eq("id", orphan.id);

      if (profileError) {
        failures.push({
          id: orphan.id,
          email: orphan.email,
          error: profileError.message
        });
        continue;
      }

      const { error: authDeleteError } =
        await adminClient.auth.admin.deleteUser(orphan.id);

      if (authDeleteError) {
        failures.push({
          id: orphan.id,
          email: orphan.email,
          error: authDeleteError.message
        });
        continue;
      }

      deleted += 1;
    }

    return new Response(
      JSON.stringify({
        dryRun: false,
        orphans,
        deleted,
        failures
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
