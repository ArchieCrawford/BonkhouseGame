// Game configuration constants
export const CONFIG = {
  // Lane dimensions
  LANE_LENGTH: 60,
  LANE_WIDTH: 8,
  LANE_POSITION_Z: -30, // Center of lane in Z
  
  // Player settings
  PLAYER_MAX_HP: 100,
  PLAYER_IDLE_BOB_SPEED: 2.0,
  PLAYER_IDLE_BOB_AMOUNT: 0.05,
  FIRE_RATE: 3, // Shots per second (pistol base rate, upgrades to machine gun)
  PLAYER_COLLISION_RADIUS: 1.5,
  
  // Enemy settings
  ENEMY_BASE_SPEED: 2.0, // Units per second
  ENEMY_SPEED_INCREASE_PER_WAVE: 0.15, // +15% per wave (increased from 10%)
  ENEMY_BASE_HP: 30,
  ENEMY_HP_INCREASE_PER_WAVE: 0.25, // +25% per wave (increased from 20%)
  ENEMY_DAMAGE_TO_PLAYER: 10,
  ENEMY_COLLISION_RADIUS: 0.6,
  
  // Projectile settings
  BULLET_SPEED: 18, // Units per second
  BULLET_DAMAGE: 10,
  BULLET_COLLISION_RADIUS: 0.3,
  
  // Wave settings
  WAVE_1_ENEMIES: 10,
  ENEMIES_INCREASE_PER_WAVE: 5, // Wave 1=10, Wave 2=15, Wave 3=20 (increased from 4)
  WAVE_START_DELAY: 3.0, // Seconds between waves
  
  // Coins
  COINS_PER_KILL: 5,

  // Backend
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
  GAME_VERSION: '0.1.0',
  
  // Object pooling
  MAX_BULLETS: 50,
  MAX_ENEMIES: 30,
  MAX_PARTICLES: 100,
  MAX_POWERUPS: 5,
  
  // Power-up settings
  POWERUP_SPAWN_CHANCE: 0.08, // 8% chance per second during wave
  POWERUP_DURATION: 10, // Seconds
  POWERUP_SPEED: 3, // Units per second
};

// Runtime env support (browser)
// A plain `.env` file is not automatically readable from browser JS; this enables:
// 1) Injected env via `window.__ENV` / `window.ENV`
// 2) Local dev via fetching `./.env` (only works if your server serves dotfiles)

const isPlaceholder = (value) => {
  if (typeof value !== 'string') return true;
  const trimmed = value.trim();
  return !trimmed || trimmed.includes('YOUR_SUPABASE');
};

const parseDotEnvText = (text) => {
  const out = {};
  if (typeof text !== 'string') return out;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    out[key] = value;
  }

  return out;
};

export const applyRuntimeConfig = async () => {
  const g = globalThis;

  // 1) window-injected env (recommended for production)
  const injected = (g && (g.__ENV || g.ENV)) || null;
  if (injected && typeof injected === 'object') {
    if (typeof injected.YOUR_SUPABASE_URL === 'string' && injected.YOUR_SUPABASE_URL.trim()) {
      CONFIG.SUPABASE_URL = injected.YOUR_SUPABASE_URL.trim();
    }
    if (typeof injected.YOUR_SUPABASE_ANON_KEY === 'string' && injected.YOUR_SUPABASE_ANON_KEY.trim()) {
      CONFIG.SUPABASE_ANON_KEY = injected.YOUR_SUPABASE_ANON_KEY.trim();
    }
  }

  // 2) served .env file (handy for local dev)
  if (isPlaceholder(CONFIG.SUPABASE_URL) || isPlaceholder(CONFIG.SUPABASE_ANON_KEY)) {
    try {
      const res = await fetch('./.env', { cache: 'no-store' });
      if (res.ok) {
        const envText = await res.text();
        const env = parseDotEnvText(envText);

        if (typeof env.YOUR_SUPABASE_URL === 'string' && env.YOUR_SUPABASE_URL.trim()) {
          CONFIG.SUPABASE_URL = env.YOUR_SUPABASE_URL.trim();
        }
        if (typeof env.YOUR_SUPABASE_ANON_KEY === 'string' && env.YOUR_SUPABASE_ANON_KEY.trim()) {
          CONFIG.SUPABASE_ANON_KEY = env.YOUR_SUPABASE_ANON_KEY.trim();
        }
      }
    } catch (_) {
      // ignore
    }
  }
};

await applyRuntimeConfig();
