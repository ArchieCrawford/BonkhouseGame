import * as THREE from 'three';

export class Weapon {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.currentLevel = 0;
    this.currentWeapon = null;
    
    // Create initial pistol
    this.updateWeaponModel(0);
  }
  
  updateWeaponModel(level) {
    if (this.currentLevel === level) return;
    
    // Remove old weapon
    if (this.currentWeapon) {
      this.group.remove(this.currentWeapon);
    }
    
    this.currentLevel = level;

    // Clear any level-specific references from previous weapon.
    this.barrelGroup = null;
    
    // Create weapon based on level
    if (level === 0) {
      this.currentWeapon = this.createPistol();
    } else if (level === 1) {
      this.currentWeapon = this.createSMG();
    } else if (level === 2) {
      this.currentWeapon = this.createMachineGun();
    } else if (level === 3) {
      this.currentWeapon = this.createAssaultRifle();
    } else if (level === 4) {
      this.currentWeapon = this.createHeavyRifle();
    } else if (level >= 5) {
      this.currentWeapon = this.createMinigun();
    }
    
    this.group.add(this.currentWeapon);
  }
  
  createPistol() {
    const weapon = new THREE.Group();
    
    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.08, 0.25, 0.08);
    const gripMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a3a3a,
      metalness: 0.3,
      roughness: 0.7
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.y = -0.1;
    weapon.add(grip);
    
    // Barrel
    const barrelGeometry = new THREE.BoxGeometry(0.06, 0.15, 0.06);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x505050,
      metalness: 0.8,
      roughness: 0.2
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0.1, 0);
    weapon.add(barrel);
    
    // Slide (top part)
    const slideGeometry = new THREE.BoxGeometry(0.07, 0.08, 0.07);
    const slideMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x606060,
      metalness: 0.9,
      roughness: 0.1
    });
    const slide = new THREE.Mesh(slideGeometry, slideMaterial);
    slide.position.set(0, 0.1, 0);
    weapon.add(slide);
    
    weapon.scale.set(1.2, 1.2, 1.2);
    return weapon;
  }
  
  createSMG() {
    const weapon = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.1, 0.35, 0.12);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2d2d2d,
      metalness: 0.4,
      roughness: 0.6
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    weapon.add(body);
    
    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x404040,
      metalness: 0.9,
      roughness: 0.1
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0.25, 0);
    weapon.add(barrel);
    
    // Magazine
    const magGeometry = new THREE.BoxGeometry(0.08, 0.15, 0.1);
    const magMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.2,
      roughness: 0.8
    });
    const mag = new THREE.Mesh(magGeometry, magMaterial);
    mag.position.set(0, -0.15, 0);
    weapon.add(mag);
    
    // Stock
    const stockGeometry = new THREE.BoxGeometry(0.08, 0.2, 0.08);
    const stockMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3d2817,
      metalness: 0.1,
      roughness: 0.9
    });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, -0.05, -0.15);
    weapon.add(stock);
    
    // Golden accent
    const accentGeometry = new THREE.BoxGeometry(0.12, 0.04, 0.04);
    const accentMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700,
      metalness: 0.9,
      roughness: 0.2,
      emissive: 0xFFD700,
      emissiveIntensity: 0.3
    });
    const accent = new THREE.Mesh(accentGeometry, accentMaterial);
    accent.position.set(0, 0, 0.08);
    weapon.add(accent);
    
    weapon.scale.set(1.3, 1.3, 1.3);
    return weapon;
  }
  
  createMachineGun() {
    const weapon = new THREE.Group();
    
    // Main body - chunkier
    const bodyGeometry = new THREE.BoxGeometry(0.12, 0.4, 0.14);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a,
      metalness: 0.5,
      roughness: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    weapon.add(body);
    
    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x505050,
      metalness: 0.9,
      roughness: 0.1
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0.3, 0);
    weapon.add(barrel);
    
    // Barrel shroud (cooling)
    const shroudGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.25, 8);
    const shroudMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a3a3a,
      metalness: 0.6,
      roughness: 0.4
    });
    const shroud = new THREE.Mesh(shroudGeometry, shroudMaterial);
    shroud.position.set(0, 0.25, 0);
    weapon.add(shroud);
    
    // Magazine
    const magGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.12);
    const magMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.2,
      roughness: 0.8
    });
    const mag = new THREE.Mesh(magGeometry, magMaterial);
    mag.position.set(0, -0.2, 0);
    weapon.add(mag);
    
    // Stock
    const stockGeometry = new THREE.BoxGeometry(0.1, 0.25, 0.1);
    const stockMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3d2817,
      metalness: 0.1,
      roughness: 0.9
    });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, -0.05, -0.2);
    weapon.add(stock);
    
    // Golden accents - dual stripes
    const accent1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.03, 0.03),
      new THREE.MeshStandardMaterial({ 
        color: 0xFFD700,
        metalness: 0.9,
        roughness: 0.2,
        emissive: 0xFFD700,
        emissiveIntensity: 0.4
      })
    );
    accent1.position.set(0, 0.05, 0.09);
    weapon.add(accent1);
    
    const accent2 = accent1.clone();
    accent2.position.set(0, -0.05, 0.09);
    weapon.add(accent2);
    
    weapon.scale.set(1.4, 1.4, 1.4);
    return weapon;
  }
  
  createAssaultRifle() {
    const weapon = new THREE.Group();
    
    // Main body - tactical
    const bodyGeometry = new THREE.BoxGeometry(0.14, 0.45, 0.16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2b2b2b,
      metalness: 0.6,
      roughness: 0.4
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    weapon.add(body);
    
    // Long barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.045, 0.045, 0.45, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a4a4a,
      metalness: 0.95,
      roughness: 0.05
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0.35, 0);
    weapon.add(barrel);
    
    // Handguard/Rail
    const railGeometry = new THREE.BoxGeometry(0.1, 0.3, 0.12);
    const railMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a3a3a,
      metalness: 0.7,
      roughness: 0.3
    });
    const rail = new THREE.Mesh(railGeometry, railMaterial);
    rail.position.set(0, 0.2, 0);
    weapon.add(rail);
    
    // Magazine
    const magGeometry = new THREE.BoxGeometry(0.09, 0.25, 0.14);
    const magMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.3,
      roughness: 0.7
    });
    const mag = new THREE.Mesh(magGeometry, magMaterial);
    mag.position.set(0, -0.22, 0);
    weapon.add(mag);
    
    // Stock - adjustable style
    const stockGeometry = new THREE.BoxGeometry(0.11, 0.3, 0.11);
    const stockMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2b2b2b,
      metalness: 0.4,
      roughness: 0.6
    });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, -0.05, -0.25);
    weapon.add(stock);
    
    // Scope
    const scopeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8);
    const scopeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.8,
      roughness: 0.2
    });
    const scope = new THREE.Mesh(scopeGeometry, scopeMaterial);
    scope.rotation.z = Math.PI / 2;
    scope.position.set(0, 0.15, 0);
    weapon.add(scope);
    
    // Golden tactical accents
    const createAccent = (x, y, z) => {
      const accent = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.025, 0.025),
        new THREE.MeshStandardMaterial({ 
          color: 0xFFD700,
          metalness: 0.95,
          roughness: 0.1,
          emissive: 0xFFD700,
          emissiveIntensity: 0.5
        })
      );
      accent.position.set(x, y, z);
      return accent;
    };
    
    weapon.add(createAccent(0, 0.08, 0.1));
    weapon.add(createAccent(0, -0.08, 0.1));
    
    weapon.scale.set(1.5, 1.5, 1.5);
    return weapon;
  }
  
  createHeavyRifle() {
    const weapon = new THREE.Group();
    
    // Heavy body
    const bodyGeometry = new THREE.BoxGeometry(0.16, 0.5, 0.18);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a,
      metalness: 0.7,
      roughness: 0.3
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    weapon.add(body);
    
    // Heavy barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.5, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x505050,
      metalness: 0.95,
      roughness: 0.05
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0.4, 0);
    weapon.add(barrel);
    
    // Muzzle brake
    const brakeGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.08, 6);
    const brakeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700,
      metalness: 0.95,
      roughness: 0.1,
      emissive: 0xFFD700,
      emissiveIntensity: 0.6
    });
    const brake = new THREE.Mesh(brakeGeometry, brakeMaterial);
    brake.position.set(0, 0.62, 0);
    weapon.add(brake);
    
    // Large magazine
    const magGeometry = new THREE.BoxGeometry(0.11, 0.3, 0.16);
    const magMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.3,
      roughness: 0.7
    });
    const mag = new THREE.Mesh(magGeometry, magMaterial);
    mag.position.set(0, -0.25, 0);
    weapon.add(mag);
    
    // Reinforced stock
    const stockGeometry = new THREE.BoxGeometry(0.13, 0.35, 0.13);
    const stockMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2b2b2b,
      metalness: 0.5,
      roughness: 0.5
    });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, -0.05, -0.3);
    weapon.add(stock);
    
    // Advanced scope
    const scopeBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.15, 8),
      new THREE.MeshStandardMaterial({ 
        color: 0x1a1a1a,
        metalness: 0.9,
        roughness: 0.1
      })
    );
    scopeBody.rotation.z = Math.PI / 2;
    scopeBody.position.set(0, 0.2, 0);
    weapon.add(scopeBody);
    
    // Golden armor plates
    for (let i = 0; i < 3; i++) {
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(0.17, 0.04, 0.03),
        new THREE.MeshStandardMaterial({ 
          color: 0xFFD700,
          metalness: 0.95,
          roughness: 0.1,
          emissive: 0xFFD700,
          emissiveIntensity: 0.6
        })
      );
      plate.position.set(0, 0.1 - i * 0.1, 0.11);
      weapon.add(plate);
    }
    
    weapon.scale.set(1.6, 1.6, 1.6);
    return weapon;
  }
  
  createMinigun() {
    const weapon = new THREE.Group();
    
    // Main body - rotating barrel housing
    const housingGeometry = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 6);
    const housingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a,
      metalness: 0.8,
      roughness: 0.2
    });
    const housing = new THREE.Mesh(housingGeometry, housingMaterial);
    housing.position.set(0, 0.25, 0);
    weapon.add(housing);
    
    // Multiple rotating barrels
    const barrelGroup = new THREE.Group();
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x505050,
      metalness: 0.95,
      roughness: 0.05
    });
    
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6);
      const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
      
      const radius = 0.08;
      barrel.position.set(
        Math.cos(angle) * radius,
        0.4,
        Math.sin(angle) * radius
      );
      barrelGroup.add(barrel);
    }
    weapon.add(barrelGroup);
    this.barrelGroup = barrelGroup; // Store for rotation animation
    
    // Ammo drum
    const drumGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.12, 16);
    const drumMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.4,
      roughness: 0.6
    });
    const drum = new THREE.Mesh(drumGeometry, drumMaterial);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, 0, -0.15);
    weapon.add(drum);
    
    // Handle/Grip
    const gripGeometry = new THREE.BoxGeometry(0.1, 0.25, 0.1);
    const gripMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3d2817,
      metalness: 0.2,
      roughness: 0.8
    });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.1, 0);
    weapon.add(grip);
    
    // Epic golden ring
    const ringGeometry = new THREE.TorusGeometry(0.13, 0.02, 8, 16);
    const ringMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700,
      metalness: 0.95,
      roughness: 0.05,
      emissive: 0xFFD700,
      emissiveIntensity: 0.8
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.set(0, 0.25, 0);
    weapon.add(ring);
    
    // Golden tip
    const tipGeometry = new THREE.ConeGeometry(0.08, 0.12, 6);
    const tipMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700,
      metalness: 0.95,
      roughness: 0.05,
      emissive: 0xFFD700,
      emissiveIntensity: 0.8
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.set(0, 0.7, 0);
    weapon.add(tip);
    
    weapon.scale.set(1.8, 1.8, 1.8);
    return weapon;
  }
  
  update(deltaTime, isShooting = false) {
    // Animate minigun barrels when shooting
    if (this.currentLevel >= 5 && this.barrelGroup && isShooting) {
      this.barrelGroup.rotation.y += deltaTime * 20; // Fast rotation
    }
  }
  
  playRecoilAnimation() {
    // Weapon recoil when shooting
    const originalZ = this.group.position.z;
    this.group.position.z -= 0.08;
    
    setTimeout(() => {
      if (this.group) {
        this.group.position.z = originalZ;
      }
    }, 60);
  }
  
  getGroup() {
    return this.group;
  }
  
  destroy() {
    if (this.currentWeapon) {
      this.group.remove(this.currentWeapon);
    }
  }
}
