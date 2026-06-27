import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { action, phone, code } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize phone: ensure it starts with +
    const normalizedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    // ── SEND OTP ──────────────────────────────────────────────────
    if (action === 'send') {
      // Invalidate old codes for this phone
      await supabaseAdmin
        .from('otp_codes')
        .update({ used: true })
        .eq('phone', normalizedPhone)
        .eq('used', false);

      // Generate 6-digit code
      const otpCode = String(Math.floor(100000 + Math.random() * 900000));

      // Store new code
      const { error: insertError } = await supabaseAdmin
        .from('otp_codes')
        .insert({
          phone: normalizedPhone,
          code: otpCode,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        });

      if (insertError) {
        console.error('OTP insert error:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to generate OTP' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[OTP] Code for ${normalizedPhone}: ${otpCode}`);

      // Return code in response (demo mode — no SMS needed)
      return new Response(
        JSON.stringify({ success: true, demo_code: otpCode, message: 'OTP generated successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ── VERIFY OTP ────────────────────────────────────────────────
    if (action === 'verify') {
      if (!code) {
        return new Response(
          JSON.stringify({ error: 'OTP code is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find valid, unused, non-expired code
      const { data: otpRow, error: lookupError } = await supabaseAdmin
        .from('otp_codes')
        .select('*')
        .eq('phone', normalizedPhone)
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lookupError || !otpRow) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired OTP' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark code as used
      await supabaseAdmin
        .from('otp_codes')
        .update({ used: true })
        .eq('id', otpRow.id);

      // Check if user with this phone already exists in profiles
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      let userEmail: string;
      let userId: string;

      if (existingProfile) {
        // Existing user — get their email from auth.users
        userId = existingProfile.id;
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        userEmail = authUser.user?.email ?? `phone_${normalizedPhone.replace(/\+/g, '')}@livequiz.app`;
      } else {
        // New user — create auth account
        userEmail = `phone_${normalizedPhone.replace(/\+/g, '')}@livequiz.app`;
        const strongPassword = crypto.randomUUID() + crypto.randomUUID();
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: userEmail,
          password: strongPassword,
          email_confirm: true,
          user_metadata: { phone: normalizedPhone },
        });

        if (createError || !newUser.user) {
          console.error('Create user error:', createError);
          return new Response(
            JSON.stringify({ error: 'Failed to create user account' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        userId = newUser.user.id;

        // Update profile with phone
        await supabaseAdmin
          .from('profiles')
          .update({ phone: normalizedPhone })
          .eq('id', userId);
      }

      // Generate a magic link token to sign the user in
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'magiclink',
        email: userEmail,
      });

      if (linkError || !linkData) {
        console.error('Generate link error:', linkError);
        return new Response(
          JSON.stringify({ error: 'Failed to create session' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const hashed_token = linkData.properties?.hashed_token;

      return new Response(
        JSON.stringify({ success: true, hashed_token, user_id: userId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "send" or "verify".' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
