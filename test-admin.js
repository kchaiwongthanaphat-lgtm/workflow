const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .limit(1);
  
  if (data) {
    if (data.length > 0) {
      console.log('Columns:', Object.keys(data[0]));
    } else {
      console.log('Table exists but is empty. Inserting a dummy comment to get columns...');
      const { data: inserted, error: insertErr } = await supabase.from('comments').insert({
        task_id: '00000000-0000-0000-0000-000000000000', // dummy
        user_id: '00000000-0000-0000-0000-000000000000', // dummy
        content: 'test'
      }).select();
      if (inserted) console.log('Columns:', Object.keys(inserted[0]));
      if (insertErr) console.error('Insert error:', insertErr);
    }
  }
  if (error) console.error('Error:', error);
}

run();
