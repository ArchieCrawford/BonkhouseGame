// Simple upgrade system for Bonkhouse
export class UpgradeSystem {
  constructor() {
    this.upgrades = {
      fireRate: {
        level: 0,
        maxLevel: 5,
        cost: [10, 25, 50, 100, 200],
        name: 'Machine Gun',
        description: 'Unlock auto-fire and shoot faster',
        bonus: [0, 0.2, 0.4, 0.6, 0.8, 1.0] // Multiplier
      },
      damage: {
        level: 0,
        maxLevel: 5,
        cost: [15, 30, 60, 120, 250],
        name: 'Damage',
        description: 'Deal more damage',
        bonus: [0, 2, 4, 7, 10, 15] // Flat bonus
      },
      bulletSpeed: {
        level: 0,
        maxLevel: 3,
        cost: [20, 50, 100],
        name: 'Bullet Speed',
        description: 'Faster projectiles',
        bonus: [0, 5, 10, 15] // Flat bonus
      },
      maxHP: {
        level: 0,
        maxLevel: 5,
        cost: [15, 35, 70, 150, 300],
        name: 'Max Health',
        description: 'Increase maximum HP',
        bonus: [0, 25, 50, 75, 100, 150] // Flat bonus
      }
    };
  }
  
  canAfford(upgradeKey, coins) {
    const upgrade = this.upgrades[upgradeKey];
    if (!upgrade || upgrade.level >= upgrade.maxLevel) return false;
    return coins >= upgrade.cost[upgrade.level];
  }
  
  purchase(upgradeKey, coins) {
    const upgrade = this.upgrades[upgradeKey];
    if (!this.canAfford(upgradeKey, coins)) return { success: false };
    
    const cost = upgrade.cost[upgrade.level];
    upgrade.level++;
    
    return {
      success: true,
      cost: cost,
      newLevel: upgrade.level,
      bonus: upgrade.bonus[upgrade.level]
    };
  }
  
  getUpgradeValue(upgradeKey) {
    const upgrade = this.upgrades[upgradeKey];
    if (!upgrade) return 0;
    return upgrade.bonus[upgrade.level];
  }
  
  getAllUpgrades() {
    return Object.entries(this.upgrades).map(([key, data]) => ({
      key,
      ...data,
      currentBonus: data.bonus[data.level],
      nextBonus: data.level < data.maxLevel ? data.bonus[data.level + 1] : null,
      currentCost: data.level < data.maxLevel ? data.cost[data.level] : null
    }));
  }
}
