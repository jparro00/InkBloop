import { execSync } from 'child_process';

const ALIAS = 'inkbloop-dev.vercel.app';
const SUPABASE_URL = 'https://kshwkljbhbwyqumnxuzu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzaHdrbGpiaGJ3eXF1bW54dXp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNDg1NzgsImV4cCI6MjA5MTgyNDU3OH0.cOQA-iz60Ut-4RRpRPnKKXf7U1OqjUqCe-aJUEyXkzs';

// Deploy
const deployCmd = `npx vercel -b VITE_SUPABASE_URL=${SUPABASE_URL} -b VITE_SUPABASE_ANON_KEY=${SUPABASE_KEY} --yes`;
const output = execSync(deployCmd, { encoding: 'utf-8' });
console.log(output);

// Extract deployment URL and alias it
const match = output.match(/https:\/\/inkbloop-\S+\.vercel\.app/);
if (match) {
  const url = match[0];
  console.log(`\nAliasing ${url} → ${ALIAS}`);
  execSync(`npx vercel alias ${url} ${ALIAS}`, { stdio: 'inherit' });
} else {
  console.error('Could not extract deployment URL');
  process.exit(1);
}
