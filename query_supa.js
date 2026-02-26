import { createClient } from './node_modules/@supabase/supabase-js/dist/index.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data, error } = await supabase
        .from('document_chunks')
        .select('filename, subject, created_at')
        .order('created_at', { ascending: false })
        .limit(5000);

    if (error) {
        console.error('Error:', error);
        process.exit(1);
    }

    const uniqueFilesInfo = {};
    data.forEach(d => {
        if (!uniqueFilesInfo[d.filename]) {
            uniqueFilesInfo[d.filename] = { subject: d.subject, created_at: d.created_at, count: 0 };
        }
        uniqueFilesInfo[d.filename].count++;
    });

    console.log('All files:');
    Object.entries(uniqueFilesInfo)
        .sort((a, b) => new Date(b[1].created_at).getTime() - new Date(a[1].created_at).getTime())
        .forEach(([k, v]) => console.log(`${k} (${v.subject}) - ${new Date(v.created_at).toLocaleString()} - ${v.count} chunks`));

    process.exit(0);
}

run();
