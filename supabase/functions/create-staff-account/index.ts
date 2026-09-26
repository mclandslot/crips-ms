import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/* Creates a staff login on the server.

   The browser must never call auth.signUp() for this: signUp signs the
   current client in as the account it just made, which silently replaces the
   admin's session and logs them out. */
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
        JSON.stringify({ error: "Only admins can add staff" }),
        { status: 403, headers: corsHeaders }
      );
    }

    const body = await req.json();

    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const profileRole = String(body?.profileRole || "").trim();
    const teacher = body?.teacher || {};

    if (!email || !password || !profileRole) {
      return new Response(
        JSON.stringify({ error: "email, password and profileRole are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 6 characters" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const allowedRoles = ["teacher", "head_teacher", "admin", "system_admin"];

    if (!allowedRoles.includes(profileRole)) {
      return new Response(
        JSON.stringify({ error: "Invalid role" }),
        { status: 400, headers: corsHeaders }
      );
    }

    /* nobody may mint an account that outranks their own */
    const rank = (role: string | null | undefined) => {
      if (role === "system_admin") return 3;
      if (role === "admin") return 2;
      return 1;
    };

    if (rank(profileRole) > rank(adminProfile.role)) {
      return new Response(
        JSON.stringify({ error: "You cannot create an account above your own role" }),
        { status: 403, headers: corsHeaders }
      );
    }

    /* email_confirm skips the verification mail - the admin hands the
       password over directly and the first login forces a change */
    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      });

    if (createError || !created?.user) {
      return new Response(
        JSON.stringify({ error: createError?.message || "Failed to create login" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const newUserId = created.user.id;

    /* from here on, any failure leaves an unusable login behind, so the
       account is removed again before returning the error */
    const rollback = async (message: string, status = 400) => {
      await adminClient.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: corsHeaders
      });
    };

    const { error: teacherError } = await adminClient.from("teachers").insert({
      id: newUserId,
      surname: teacher.surname || null,
      first_name: teacher.first_name || null,
      dob: teacher.dob || null,
      gender: teacher.gender || null,
      marital_status: teacher.marital_status || null,
      qualification: teacher.qualification || null,
      status: teacher.status || null,
      phone: teacher.phone || null,
      email,
      address: teacher.address || null,
      role: teacher.role || null,
      employed_date: teacher.employed_date || null,
      picture_url: teacher.picture_url || null
    });

    if (teacherError) {
      return await rollback(teacherError.message);
    }

    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        id: newUserId,
        full_name: `${teacher.surname || ""} ${teacher.first_name || ""}`.trim(),
        email,
        role: profileRole,
        is_active: true,
        must_change_password: true
      },
      { onConflict: "id" }
    );

    if (profileError) {
      await adminClient.from("teachers").delete().eq("id", newUserId);
      return await rollback(profileError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        id: newUserId,
        message: "Staff added successfully"
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
