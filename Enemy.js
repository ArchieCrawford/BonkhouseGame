import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';

export class Enemy {
  constructor(scene, pool) {
    this.scene = scene;
    this.pool = pool;
    this.active = false;
    
    // Group to hold either 3D primitive or GLB model
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);
    
    // Create enemy mesh - will be colored based on type when spawned
    const geometry = new THREE.CapsuleGeometry(0.35, 0.8, 8, 16);
    this.material = new THREE.MeshStandardMaterial({ 
      color: 0x8B4789, // Default Purple
      emissive: 0x5B2C6F,
      emissiveIntensity: 0.3,
      metalness: 0.2,
      roughness: 0.8
    });
    
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.group.add(this.mesh);
    
    // Animation system for GLB models
    this.mixer = null;
    this.model = null;
    this.useAnimatedModel = false;
    this.isBoss = false;
    
    // Add spiky decoration for visual variety
    this.spikes = [];
    for (let i = 0; i < 4; i++) {
      const spikeGeometry = new THREE.ConeGeometry(0.1, 0.3, 4);
      const spikeMaterial = new THREE.MeshStandardMaterial({ color: 0xFF0000 });
      const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
      spike.rotation.x = Math.PI / 2;
      const angle = (i / 4) * Math.PI * 2;
      spike.position.set(Math.cos(angle) * 0.4, 0.3, Math.sin(angle) * 0.4);
      this.mesh.add(spike);
      this.spikes.push(spike);
    }
    
    this.enemyType = 'normal';
    
    // Health bar background
    const healthBarBgGeometry = new THREE.BoxGeometry(0.9, 0.08, 0.02);
    const healthBarBgMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 });
    this.healthBarBg = new THREE.Mesh(healthBarBgGeometry, healthBarBgMaterial);
    this.healthBarBg.position.y = 1.3;
    this.group.add(this.healthBarBg);
    
    // Health bar fill
    const healthBarGeometry = new THREE.BoxGeometry(0.85, 0.06, 0.03);
    const healthBarMaterial = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
    this.healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
    this.healthBar.position.y = 1.3;
    this.healthBar.position.z = 0.01;
    this.group.add(this.healthBar);
  }
  
  loadAnimatedModel(enemyType) {
    // Load animated walking enemy GLB
    const loader = new GLTFLoader();
    
    // Different models for different enemy types
    let modelUrl;
    let scale = 0.8;
    let emissiveColor = null;
    let emissiveIntensity = 0;
    let animSpeed = 1.0;
    
    // Assign models and properties based on enemy type
    switch(enemyType) {
      case 'boss':
        modelUrl = 'https://rosebud.ai/assets/Meshy_AI_Animation_Walking_withSkin.glb?1r6U';
        scale = 1.2;
        emissiveColor = new THREE.Color(0x440000); // Red glow
        emissiveIntensity = 0.4;
        break;
      case 'scout':
        modelUrl = 'https://rosebud.ai/assets/Meshy_AI_Animation_Walking_withSkin.glb?JeqK';
        scale = 0.6;
        emissiveColor = new THREE.Color(0x002244); // Blue glow
        emissiveIntensity = 0.3;
        animSpeed = 1.3;
        break;
      case 'elite':
        modelUrl = 'https://rosebud.ai/assets/Meshy_Merged_Animations.glb?wfmY';
        scale = 1.0;
        emissiveColor = new THREE.Color(0x880000); // Dark red glow
        emissiveIntensity = 0.5;
        break;
      case 'fast':
        modelUrl = 'https://rosebud.ai/assets/Meshy_AI_Animation_Walking_withSkin.glb?w0rF';
        scale = 0.7;
        emissiveColor = new THREE.Color(0x006666); // Cyan glow
        emissiveIntensity = 0.4;
        animSpeed = 1.4;
        break;
      case 'tank':
        modelUrl = 'https://rosebud.ai/assets/Meshy_AI_Animation_Walking_withSkin.glb?w0rF';
        scale = 1.1;
        emissiveColor = new THREE.Color(0x2F3F1F); // Dark olive glow
        emissiveIntensity = 0.3;
        animSpeed = 0.8;
        break;
      default: // normal
        modelUrl = 'https://rosebud.ai/assets/Meshy_AI_Animation_Walking_withSkin.glb?w0rF';
        scale = 0.8;
        emissiveColor = new THREE.Color(0x5B2C6F); // Purple glow
        emissiveIntensity = 0.3;
        break;
    }
    
    loader.load(
      modelUrl,
      (gltf) => {
        this.model = gltf.scene;
        
        this.model.scale.set(scale, scale, scale);
        this.model.position.set(0, 0, 0);
        
        // Rotate to face player direction (toward positive Z)
        this.model.rotation.y = 0;
        
        // Enable shadows and apply emissive colors
        this.model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            if (emissiveColor && child.material) {
              child.material.emissive = emissiveColor;
              child.material.emissiveIntensity = emissiveIntensity;
            }
          }
        });
        
        // Hide the primitive mesh (fallback)
        this.mesh.visible = false;
        this.spikes.forEach(spike => spike.visible = false);
        
        // Add to group
        this.group.add(this.model);
        
        // Setup animations
        if (gltf.animations && gltf.animations.length > 0) {
          this.mixer = new THREE.AnimationMixer(this.model);
          
          // Play walking animation with speed variation
          const walkAction = this.mixer.clipAction(gltf.animations[0]);
          walkAction.timeScale = animSpeed;
          walkAction.play();
        }
        
        console.log(`${enemyType} enemy model loaded`);
      },
      undefined,
      (error) => {
        console.error(`Error loading ${enemyType} enemy model:`, error);
      }
    );
  }
  
  spawn(x, z, speed, health, wave = 1, forceBoss = false) {
    this.active = true;
    this.speed = speed;
    this.maxHealth = health;
    this.health = health;
    this.isDead = false;
    
    this.group.position.set(x, 0, z);
    this.group.visible = true;
    this.group.scale.set(1, 1, 1);
    
    // Determine enemy type based on wave and random chance
    this.determineEnemyType(wave, forceBoss);
    
    // Reset health bar
    this.healthBar.scale.x = 1;
    this.healthBar.position.x = 0;
    this.healthBar.material.color.setHex(0x2ecc71);
  }
  
  determineEnemyType(wave, forceBoss = false) {
    const rand = Math.random();
    
    // ALL enemies now use animated GLB models
    this.useAnimatedModel = true;
    this.mesh.visible = false;
    this.spikes.forEach(spike => spike.visible = false);
    
    // Boss enemy - spawns every 5 waves
    if (forceBoss || (wave % 5 === 0 && wave >= 5 && rand < 0.25)) {
      this.enemyType = 'boss';
      this.isBoss = true;
      this.healthBarBg.position.y = 3.5;
      this.healthBar.position.y = 3.5;
      this.speed *= 0.6;
      this.maxHealth *= 3;
      this.health = this.maxHealth;
      this.loadAnimatedModel('boss');
      return;
    }
    
    // Elite enemy (15% chance after wave 5)
    if (wave >= 5 && rand < 0.15) {
      this.enemyType = 'elite';
      this.healthBarBg.position.y = 2.8;
      this.healthBar.position.y = 2.8;
      this.speed *= 0.9;
      this.maxHealth *= 1.5;
      this.health = this.maxHealth;
      this.loadAnimatedModel('elite');
      return;
    }
    
    // Tank enemy (20% chance after wave 2)
    if (wave >= 2 && rand < 0.35) {
      this.enemyType = 'tank';
      this.healthBarBg.position.y = 2.7;
      this.healthBar.position.y = 2.7;
      this.speed *= 0.7;
      this.maxHealth *= 1.8;
      this.health = this.maxHealth;
      this.loadAnimatedModel('tank');
      return;
    }
    
    // Fast enemy (20% chance after wave 3)
    if (wave >= 3 && rand < 0.55) {
      this.enemyType = 'fast';
      this.healthBarBg.position.y = 2.3;
      this.healthBar.position.y = 2.3;
      this.speed *= 1.5;
      this.maxHealth *= 0.8;
      this.health = this.maxHealth;
      this.loadAnimatedModel('fast');
      return;
    }
    
    // Scout enemy (25% chance - common, weak)
    if (rand < 0.25) {
      this.enemyType = 'scout';
      this.healthBarBg.position.y = 2.0;
      this.healthBar.position.y = 2.0;
      this.speed *= 1.4;
      this.maxHealth *= 0.5;
      this.health = this.maxHealth;
      this.loadAnimatedModel('scout');
      return;
    }
    
    // Normal enemy (default)
    this.enemyType = 'normal';
    this.healthBarBg.position.y = 2.5;
    this.healthBar.position.y = 2.5;
    this.loadAnimatedModel('normal');
  }
  
  update(deltaTime) {
    if (!this.active || this.isDead) return;
    
    // Update animation mixer for animated models
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }
    
    // Move forward toward player (positive Z direction)
    this.group.position.z += this.speed * deltaTime;
    
    // Slight rotation bob for non-animated enemies
    if (!this.useAnimatedModel) {
      const time = Date.now() * 0.002;
      this.mesh.rotation.y = Math.sin(time + this.group.position.x) * 0.15;
    }
  }
  
  takeDamage(damage) {
    if (!this.active || this.isDead) return false;
    
    this.health -= damage;
    
    // Flash white briefly
    if (this.useAnimatedModel && this.model) {
      // Flash animated model
      this.model.traverse((child) => {
        if (child.isMesh && child.material) {
          const originalColor = child.material.color.getHex();
          child.material.color.setHex(0xffffff);
          setTimeout(() => {
            child.material.color.setHex(originalColor);
          }, 50);
        }
      });
    } else {
      // Flash primitive mesh
      this.mesh.material.emissive.setHex(0xffffff);
      setTimeout(() => {
        if (this.mesh.material) {
          this.mesh.material.emissive.setHex(0x000000);
        }
      }, 50);
    }
    
    // Update health bar
    const healthPercent = Math.max(0, this.health / this.maxHealth);
    this.healthBar.scale.x = healthPercent;
    this.healthBar.position.x = -0.425 * (1 - healthPercent);
    
    // Change color based on health
    if (healthPercent < 0.3) {
      this.healthBar.material.color.setHex(0xe74c3c);
    } else if (healthPercent < 0.6) {
      this.healthBar.material.color.setHex(0xf39c12);
    }
    
    if (this.health <= 0) {
      this.isDead = true;
      return true;
    }
    return false;
  }
  
  playDeathAnimation(onComplete) {
    // Quick scale down "pop" animation
    const startScale = 1;
    const duration = 200; // ms
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const scale = startScale * (1 - progress);
      
      this.group.scale.set(scale, scale, scale);
      this.group.rotation.y += 0.3;
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.deactivate();
        if (onComplete) onComplete();
      }
    };
    
    animate();
  }
  
  getPosition() {
    return this.group.position.clone();
  }
  
  hasReachedPlayer(playerPos) {
    const distance = this.group.position.distanceTo(playerPos);
    return distance < CONFIG.PLAYER_COLLISION_RADIUS;
  }
  
  deactivate() {
    this.active = false;
    this.group.visible = false;
    this.group.position.set(0, -100, 0);
  }
  
  destroy() {
    if (this.model) {
      this.group.remove(this.model);
    }
    this.scene.remove(this.group);
  }
}
