import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const parseDotEnv = (filePath) => {
  try {
    const raw = readFileSync(filePath, 'utf8');
    const env = {};
    raw.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) return;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      env[key] = value;
    });
    return env;
  } catch {
    return {};
  }
};

const env = {
  ...parseDotEnv(resolve(process.cwd(), '.env')),
  ...process.env
};

const supabaseUrl = env.YOUR_SUPABASE_URL;
const supabaseKey = env.YOUR_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing YOUR_SUPABASE_URL or YOUR_SUPABASE_ANON_KEY in .env or process env.');
  process.exit(1);
}

const headers = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};

const insertScore = async () => {
  const wallet = `test-wallet-${Date.now()}`;
  const payload = {
    wallet,
    score: 123456,
    wave: 3,
    character_id: 'bonkhouse',
    duration_ms: 123456
  };
  const res = await fetch(`${supabaseUrl}/rest/v1/scores`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body, wallet };
};

const fetchLeaderboard = async () => {
  const res = await fetch(
    `${supabaseUrl}/rest/v1/leaderboard_top?select=wallet,best_score,best_wave,last_played&limit=5`,
    { headers }
  );
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
};

const run = async () => {
  console.log('Running Supabase smoke test...');
  const insertResult = await insertScore();
  console.log('Insert result:', insertResult);

  const leaderboardResult = await fetchLeaderboard();
  console.log('Leaderboard result:', leaderboardResult);

  if (!insertResult.ok || !leaderboardResult.ok) {
    process.exit(1);
  }
};

run().catch((err) => {
  console.error('Smoke test failed:', err);
  process.exit(1);
});
