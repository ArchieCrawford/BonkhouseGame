import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Projectile {
  constructor(scene, pool) {
    this.scene = scene;
    this.pool = pool;
    this.active = false;
    
    // Create projectile (golden energy bullet from Bonkhouse)
    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xFFD700, // Gold
      transparent: true,
      opacity: 0.95
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.visible = false;
    scene.add(this.mesh);
    
    // Add glow effect (golden energy)
    const glowGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFFA500, // Orange glow
      transparent: true,
      opacity: 0.4
    });
    this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(this.glow);
    
    // Add muzzle flash trail
    const trailGeometry = new THREE.ConeGeometry(0.1, 0.3, 6);
    const trailMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xFFD700,
      transparent: true,
      opacity: 0.6
    });
    this.trail = new THREE.Mesh(trailGeometry, trailMaterial);
    this.trail.rotation.x = Math.PI / 2;
    this.trail.position.z = 0.2;
    this.mesh.add(this.trail);
  }
  
  spawn(startPos) {
    this.active = true;
    this.mesh.position.copy(startPos);
    this.mesh.position.y = 0.7;
    this.mesh.visible = true;
    
    // Reset bullet appearance and properties
    this.mesh.scale.set(1, 1, 1);
    this.mesh.material.color.setHex(0xFFD700);
    this.mesh.material.emissive.setHex(0xFFAA00);
    this.mesh.userData.angleOffset = null;
  }
  
  update(deltaTime, bulletSpeedBonus = 0) {
    if (!this.active) return;
    
    // Move forward (negative Z direction - toward enemies)
    const totalSpeed = CONFIG.BULLET_SPEED + bulletSpeedBonus;
    this.mesh.position.z -= totalSpeed * deltaTime;
    
    // Apply shotgun spread angle if present
    if (this.mesh.userData.angleOffset) {
      this.mesh.position.x += Math.sin(this.mesh.userData.angleOffset) * totalSpeed * deltaTime * 0.5;
    }
    
    // Pulse glow
    const pulse = Math.sin(Date.now() * 0.015) * 0.3 + 0.7;
    this.glow.scale.setScalar(pulse);
    
    // Deactivate if too far
    if (this.mesh.position.z < -65) {
      this.deactivate();
    }
    
    // Shotgun has limited range
    if (this.mesh.userData.angleOffset && this.mesh.position.z < -30) {
      this.deactivate();
    }
  }
  
  getPosition() {
    return this.mesh.position.clone();
  }
  
  deactivate() {
    this.active = false;
    this.mesh.visible = false;
    this.mesh.position.set(0, -100, 0);
  }
  
  destroy() {
    this.scene.remove(this.mesh);
  }
}
