import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhcocoucxmwnhhxmvsep.supabase.co';
const supabaseAnonKey = 'sb_publishable_2fvWfSGjp50-WHnnLuZnkw_5uaYHCX9';
const email = 'sheebanskfitness@gmail.com';
const password = 'sheeban43@';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function registerProfile() {
  try {
    console.log('Logging in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (authError) {
      console.error('Auth Login Error:', authError);
      return;
    }

    const userId = authData.user.id;
    console.log('Logged in successfully. User ID:', userId);

    console.log('Inserting profile in public.users...');
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .insert([
        {
          id: userId,
          email: email,
          role: 'super_admin',
          madarsa_id: null
        }
      ])
      .select();

    if (profileError) {
      console.error('Profile Insert Error:', profileError);
    } else {
      console.log('Profile Inserted Successfully:', profileData);
    }
  } catch (err) {
    console.error('Exception:', err);
  }
}

registerProfile();
