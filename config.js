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
