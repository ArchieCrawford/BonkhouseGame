import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';
import { Weapon } from './Weapon.js';

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.position.set(0, 0, -5); // Bottom of lane, on the street
    
    // Health
    this.maxHP = CONFIG.PLAYER_MAX_HP;
    this.hp = this.maxHP;
    
    // Animation system
    this.mixer = null;
    this.animations = {};
    this.currentAction = null;
    this.model = null;
    
    // Create animated character
    this.createAnimatedCharacter();
    
    scene.add(this.group);
    
    // Add "YOU" indicator above squad
    this.createYouIndicator();
    
    // Health bar above squad
    this.createHealthBar();
    
    // Weapon system
    this.weapon = new Weapon(scene);
    this.weapon.getGroup().position.set(1.2, 2, 0.8); // Position weapon to right side of character
    this.weapon.getGroup().rotation.x = -0.2; // Tilt forward
    this.weapon.getGroup().rotation.y = -0.1; // Angle inward slightly
    this.weapon.getGroup().rotation.z = 0.15; // Slight outward tilt
    this.group.add(this.weapon.getGroup());
    
    // Shooting
    this.shootTimer = 0;
    this.shootInterval = 1.0 / CONFIG.FIRE_RATE;
    this.isShooting = false;
    
    // Weapon modes (power-ups)
    this.weaponMode = 'normal'; // normal, machinegun, laser, shotgun
    this.powerUpTimer = 0;
    this.powerUpDuration = CONFIG.POWERUP_DURATION;
    
    // Movement
    this.moveSpeed = 8;
    this.maxX = CONFIG.LANE_WIDTH / 2 - 0.8;
    
    this.time = 0;
  }
  
  createAnimatedCharacter() {
    // Load the animated GLB model
    const loader = new GLTFLoader();
    
    loader.load(
      'https://rosebud.ai/assets/Meshy_Merged_Animations.glb?wfmY',
      (gltf) => {
        console.log('Character model loaded successfully!');
        this.model = gltf.scene;
        
        // Scale and position the model
        this.model.scale.set(2, 2, 2); // Adjust scale as needed
        this.model.position.set(0, 0, 0);
        
        // Rotate to face forward (up the lane) - 180 degrees
        this.model.rotation.y = Math.PI;
        
        // Enable shadows
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        this.group.add(this.model);
        
        // Setup animations
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);
          
          // Store all animations
          gltf.animations.forEach((clip) => {
            const action = this.mixer.clipAction(clip);
            this.animations[clip.name] = action;
            console.log('Animation found:', clip.name);
          });
          
          // Play running animation by default (try common names)
          this.playAnimation('Run') || 
          this.playAnimation('Running') || 
          this.playAnimation('run') || 
          this.playAnimation('running') ||
          this.playAnimation(gltf.animations[0].name); // Fallback to first animation
        }
        
        this.textureLoaded = true;
      },
      (progress) => {
        console.log('Loading character:', Math.round((progress.loaded / progress.total) * 100) + '%');
      },
      (error) => {
        console.error('Error loading character model:', error);
        // Fallback to simple 3D model
        this.create3DBonkhouse();
      }
    );
    
    // Golden rim light glow
    const glowGeometry = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFFD700,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.glow.position.set(0, 0.05, 0);
    this.glow.rotation.x = Math.PI / 2;
    this.group.add(this.glow);
    
    this.textureLoaded = false;
  }
  
  playAnimation(animationName) {
    if (!this.animations[animationName]) return false;
    
    // Stop current animation
    if (this.currentAction) {
      this.currentAction.fadeOut(0.2);
    }
    
    // Play new animation
    this.currentAction = this.animations[animationName];
    this.currentAction.reset().fadeIn(0.2).play();
    
    return true;
  }
  
  create3DBonkhouse() {
    // Fallback 3D Bonkhouse model
    this.use3DModel = true;
    
    // Body (dog) - warm brown color
    const bodyGeometry = new THREE.CapsuleGeometry(0.5, 1.2, 8, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xD2691E,
      emissive: 0x8B4513,
      emissiveIntensity: 0.2,
      metalness: 0.1,
      roughness: 0.8
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.6;
    body.castShadow = true;
    this.group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.4, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xCD853F,
      metalness: 0.1,
      roughness: 0.8
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.set(0, 1.5, 0.2);
    head.scale.set(1, 0.9, 1.2);
    head.castShadow = true;
    this.group.add(head);
    
    // Ears
    const earGeometry = new THREE.ConeGeometry(0.15, 0.4, 8);
    const earMaterial = new THREE.MeshStandardMaterial({ color: 0xA0522D });
    
    const leftEar = new THREE.Mesh(earGeometry, earMaterial);
    leftEar.position.set(-0.3, 1.9, 0);
    leftEar.rotation.z = 0.3;
    this.group.add(leftEar);
    
    const rightEar = new THREE.Mesh(earGeometry, earMaterial);
    rightEar.position.set(0.3, 1.9, 0);
    rightEar.rotation.z = -0.3;
    this.group.add(rightEar);
    
    // House on back
    const houseGroup = new THREE.Group();
    houseGroup.position.set(0, 1.0, -0.5);
    houseGroup.scale.set(0.6, 0.6, 0.6);
    
    const houseBaseGeometry = new THREE.BoxGeometry(1, 0.8, 0.8);
    const houseMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      metalness: 0.1,
      roughness: 0.9
    });
    const houseBase = new THREE.Mesh(houseBaseGeometry, houseMaterial);
    houseBase.castShadow = true;
    houseGroup.add(houseBase);
    
    const roofGeometry = new THREE.ConeGeometry(0.8, 0.6, 4);
    const roofMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xA0522D,
      metalness: 0.2,
      roughness: 0.8
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 0.7;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    houseGroup.add(roof);
    
    const windowGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.05);
    const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xFFD700 }); // Golden window to match theme
    const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
    window1.position.set(0, 0.1, 0.41);
    houseGroup.add(window1);
    
    this.group.add(houseGroup);
    this.houseGroup = houseGroup;
    
    // Cloak
    const cloakGeometry = new THREE.CylinderGeometry(0.6, 0.8, 1.2, 8, 1, true);
    const cloakMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2C3E50,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.9
    });
    const cloak = new THREE.Mesh(cloakGeometry, cloakMaterial);
    cloak.position.set(0, 0.6, -0.3);
    cloak.castShadow = true;
    this.group.add(cloak);
    this.cloak = cloak;
    
    // Weapon
    const weaponGeometry = new THREE.BoxGeometry(0.15, 0.15, 0.8);
    const weaponMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x34495E,
      metalness: 0.7,
      roughness: 0.3
    });
    const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
    weapon.position.set(0.4, 0.8, 0.5);
    weapon.rotation.x = -0.3;
    this.group.add(weapon);
    this.weapon = weapon;
    
    this.bonkhouseParts = { body, head, weapon, cloak, houseGroup };
    this.textureLoaded = true; // Allow animations to work
  }
  
  // No longer needed - single image sprite
  updateSpriteFrame(frameIndex) {
    // Not used with single sprite image
  }
  
  createYouIndicator() {
    // Create "YOU" text indicator
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('YOU', 128, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ 
      map: texture,
      transparent: true,
      depthTest: false
    });
    
    this.youIndicator = new THREE.Sprite(material);
    this.youIndicator.position.set(0, 5.5, 0);
    this.youIndicator.scale.set(2, 1, 1);
    this.group.add(this.youIndicator);
    
    // Arrow pointing down
    const arrowGeometry = new THREE.ConeGeometry(0.3, 0.6, 3);
    const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0x00FFFF });
    this.arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    this.arrow.position.set(0, 4, 0);
    this.arrow.rotation.x = Math.PI;
    this.group.add(this.arrow);
  }
  
  createHealthBar() {
    // Health bar background
    const bgGeometry = new THREE.BoxGeometry(2.5, 0.2, 0.05);
    const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7 });
    this.healthBarBg = new THREE.Mesh(bgGeometry, bgMaterial);
    this.healthBarBg.position.set(0, 4.5, 0);
    this.group.add(this.healthBarBg);
    
    // Health bar fill
    const fillGeometry = new THREE.BoxGeometry(2.5, 0.18, 0.06);
    const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
    this.healthBarFill = new THREE.Mesh(fillGeometry, fillMaterial);
    this.healthBarFill.position.set(0, 4.5, 0.01);
    this.group.add(this.healthBarFill);
  }
  
  update(deltaTime, moveDirection = 0) {
    this.time += deltaTime;
    
    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
    
    // Gentle breathing bob (subtle)
    const breathe = Math.sin(this.time * CONFIG.PLAYER_IDLE_BOB_SPEED) * CONFIG.PLAYER_IDLE_BOB_AMOUNT;
    this.group.position.y = breathe;
    
    // Bounce arrow indicator
    this.arrow.position.y = 4.5 + Math.sin(this.time * 3) * 0.2;
    
    // Horizontal movement
    if (moveDirection !== 0) {
      this.group.position.x += moveDirection * this.moveSpeed * deltaTime;
      
      // Clamp to lane bounds
      this.group.position.x = Math.max(-this.maxX, Math.min(this.maxX, this.group.position.x));
      
      // Lean character when moving
      if (this.model) {
        this.model.rotation.z = THREE.MathUtils.lerp(
          this.model.rotation.z,
          -moveDirection * 0.1,
          deltaTime * 5
        );
      }
    } else if (this.model) {
      // Return to neutral
      this.model.rotation.z = THREE.MathUtils.lerp(
        this.model.rotation.z,
        0,
        deltaTime * 5
      );
    }
    
    // 3D fallback model animations
    if (this.use3DModel) {
      if (this.cloak) {
        this.cloak.rotation.z = Math.sin(this.time * 1.5) * 0.1;
      }
      if (this.houseGroup) {
        this.houseGroup.rotation.z = Math.sin(this.time * 1.2) * 0.05;
      }
    }
    
    // Pulse glow
    if (this.glow) {
      const pulse = Math.sin(this.time * 2) * 0.15 + 0.3;
      this.glow.material.opacity = pulse;
      this.glow.rotation.z += deltaTime * 0.5; // Rotate glow
    }
    
    // Shooting animation state
    if (this.isShooting) {
      const shootPulse = Math.max(0, 1 - (this.time - this.shootStartTime) * 10);
      
      if (shootPulse <= 0) {
        this.isShooting = false;
      }
    }
    
    // Update shoot timer
    this.shootTimer += deltaTime;
    
    // Update weapon animations
    if (this.weapon) {
      this.weapon.update(deltaTime, this.isShooting);
    }
  }
  
  canShoot() {
    // Laser has no cooldown, always ready
    if (this.weaponMode === 'laser') return true;
    return this.shootTimer >= this.shootInterval;
  }
  
  resetShootTimer() {
    this.shootTimer = 0;
  }
  
  activatePowerUp(type) {
    this.weaponMode = type;
    this.powerUpTimer = this.powerUpDuration;
    
    // Adjust shooting based on power-up
    switch(type) {
      case 'machinegun':
        this.shootInterval = 1.0 / (CONFIG.FIRE_RATE * 3); // 3x fire rate
        break;
      case 'laser':
        this.shootInterval = 0; // Continuous fire
        break;
      case 'shotgun':
        this.shootInterval = 1.0 / (CONFIG.FIRE_RATE * 0.5); // Slower fire rate
        break;
    }
  }
  
  updatePowerUp(deltaTime, fireRateUpgrade = 0) {
    if (this.powerUpTimer > 0) {
      this.powerUpTimer -= deltaTime;
      
      if (this.powerUpTimer <= 0) {
        // Power-up expired, return to normal
        this.weaponMode = 'normal';
        this.powerUpTimer = 0;
        
        // Restore normal fire rate (considering upgrades)
        this.shootInterval = 1.0 / (CONFIG.FIRE_RATE + fireRateUpgrade);
        
        // Return true to signal power-up ended
        return true;
      }
    }
    return false;
  }
  
  getPowerUpTimeRemaining() {
    return this.powerUpTimer;
  }
  
  takeDamage(damage) {
    this.hp = Math.max(0, this.hp - damage);
    this.updateHealthBar();
    
    // Flash red on character
    if (this.model) {
      this.model.traverse((child) => {
        if (child.isMesh && child.material) {
          const originalColor = child.material.color.getHex();
          child.material.color.setHex(0xff0000);
          setTimeout(() => {
            child.material.color.setHex(originalColor);
          }, 100);
        }
      });
    }
    
    // Flash red on fallback 3D model
    if (this.use3DModel && this.bonkhouseParts && this.bonkhouseParts.body) {
      this.bonkhouseParts.body.material.emissive.setHex(0xff0000);
      setTimeout(() => {
        this.bonkhouseParts.body.material.emissive.setHex(0x8B4513);
      }, 100);
    }
    
    return this.hp <= 0;
  }
  
  playShootAnimation() {
    // Set shooting state for weapon animation
    this.isShooting = true;
    this.shootStartTime = this.time;
    
    // Weapon recoil
    if (this.weapon) {
      this.weapon.playRecoilAnimation();
    }
    
    // Try to play shooting animation if available
    if (this.animations['Shoot'] || this.animations['Attack'] || this.animations['Fire']) {
      const shootAnim = this.animations['Shoot'] || this.animations['Attack'] || this.animations['Fire'];
      // Play once then return to running
      shootAnim.reset();
      shootAnim.setLoop(THREE.LoopOnce);
      shootAnim.clampWhenFinished = true;
      shootAnim.play();
      
      // Return to running after animation
      setTimeout(() => {
        this.playAnimation('Run') || 
        this.playAnimation('Running') || 
        this.playAnimation('run');
      }, 300);
    }
    
    // Character recoil
    if (this.model) {
      const originalZ = this.model.position.z;
      this.model.position.z -= 0.1;
      setTimeout(() => {
        if (this.model) {
          this.model.position.z = originalZ;
        }
      }, 60);
    }
    
    // 3D fallback model weapon recoil
    if (this.use3DModel && this.bonkhouseParts.weapon) {
      this.bonkhouseParts.weapon.position.z = 0.3;
      setTimeout(() => {
        if (this.bonkhouseParts.weapon) {
          this.bonkhouseParts.weapon.position.z = 0.5;
        }
      }, 50);
    }
  }
  
  updateHealthBar() {
    const healthPercent = this.hp / this.maxHP;
    this.healthBarFill.scale.x = healthPercent;
    this.healthBarFill.position.x = -1.25 * (1 - healthPercent);
    
    // Change color based on health
    if (healthPercent < 0.3) {
      this.healthBarFill.material.color.setHex(0xe74c3c);
    } else if (healthPercent < 0.6) {
      this.healthBarFill.material.color.setHex(0xf39c12);
    }
  }
  
  updateWeapon(upgradeLevel) {
    if (this.weapon) {
      this.weapon.updateWeaponModel(upgradeLevel);
    }
  }
  
  getPosition() {
    return this.group.position.clone();
  }
  
  destroy() {
    if (this.weapon) {
      this.weapon.destroy();
    }
    this.scene.remove(this.group);
  }
}
