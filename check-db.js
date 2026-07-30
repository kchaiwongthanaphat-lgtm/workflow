const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.from('attachments').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Success! Table exists. Data:', data);
  }
}

check();
