import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
const rootEnv = path.join(__dirname, '..', '.env');
const env = {};
if (fs.existsSync(rootEnv)) {
  const envConfig = fs.readFileSync(rootEnv, 'utf-8');
  envConfig.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length > 1) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key) env[key] = val;
    }
  });
}

const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in env config.");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function check() {
  try {
    const { data, error } = await supabaseAdmin.from('feature_requests').select('*').limit(1);
    if (error) {
      console.log("Table check failed:", error.message);
    } else {
      console.log("Table exists! Query result:", data);
    }
  } catch (err) {
    console.error("Failed to execute check query:", err);
  }
}

check();