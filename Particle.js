import * as THREE from 'three';

export class Particle {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    
    // Create spark particle with varied shapes
    const shapeType = Math.floor(Math.random() * 3);
    let geometry;
    
    if (shapeType === 0) {
      geometry = new THREE.SphereGeometry(0.08, 4, 4);
    } else if (shapeType === 1) {
      geometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    } else {
      geometry = new THREE.TetrahedronGeometry(0.1);
    }
    
    const material = new THREE.MeshBasicMaterial({ 
      color: 0xffa500,
      transparent: true
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.visible = false;
    scene.add(this.mesh);
    
    // Add glowing trail
    const trailGeometry = new THREE.SphereGeometry(0.15, 4, 4);
    const trailMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffa500,
      transparent: true,
      opacity: 0.3
    });
    this.trail = new THREE.Mesh(trailGeometry, trailMaterial);
    this.mesh.add(this.trail);
    
    this.velocity = new THREE.Vector3();
    this.rotation = new THREE.Vector3(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10
    );
    this.life = 0;
    this.maxLife = 0;
    this.particleType = 'default';
  }
  
  spawn(position, color = 0xffa500, type = 'default') {
    this.active = true;
    this.particleType = type;
    this.mesh.position.copy(position);
    this.mesh.visible = true;
    this.mesh.material.color.setHex(color);
    this.trail.material.color.setHex(color);
    this.mesh.material.opacity = 1.0;
    this.mesh.scale.set(1, 1, 1);
    
    // Different velocity patterns based on type
    if (type === 'explosion') {
      // Explosive radial pattern
      const angle = Math.random() * Math.PI * 2;
      const power = 4 + Math.random() * 3;
      this.velocity.set(
        Math.cos(angle) * power,
        Math.random() * 5 + 2,
        Math.sin(angle) * power
      );
      this.life = 0;
      this.maxLife = 0.5 + Math.random() * 0.3;
    } else if (type === 'coin') {
      // Upward arc pattern for coin particles
      this.velocity.set(
        (Math.random() - 0.5) * 2,
        4 + Math.random() * 2,
        (Math.random() - 0.5) * 2
      );
      this.life = 0;
      this.maxLife = 0.6 + Math.random() * 0.2;
    } else if (type === 'hit') {
      // Quick burst
      this.velocity.set(
        (Math.random() - 0.5) * 2,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 2
      );
      this.life = 0;
      this.maxLife = 0.2 + Math.random() * 0.15;
    } else {
      // Default pattern
      this.velocity.set(
        (Math.random() - 0.5) * 3,
        Math.random() * 3 + 1,
        (Math.random() - 0.5) * 3
      );
      this.life = 0;
      this.maxLife = 0.3 + Math.random() * 0.2;
    }
  }
  
  update(deltaTime) {
    if (!this.active) return;
    
    this.life += deltaTime;
    const lifePercent = this.life / this.maxLife;
    
    // Move with velocity
    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // Apply gravity (less for coin particles)
    const gravity = this.particleType === 'coin' ? 6.0 : 9.8;
    this.velocity.y -= gravity * deltaTime;
    
    // Rotation
    this.mesh.rotation.x += this.rotation.x * deltaTime;
    this.mesh.rotation.y += this.rotation.y * deltaTime;
    this.mesh.rotation.z += this.rotation.z * deltaTime;
    
    // Fade out
    this.mesh.material.opacity = 1.0 - lifePercent;
    
    // Scale animation based on type
    if (this.particleType === 'explosion') {
      // Grow then shrink
      const scale = Math.sin(lifePercent * Math.PI) * 1.5;
      this.mesh.scale.setScalar(scale);
    } else if (this.particleType === 'coin') {
      // Slight sparkle
      const scale = 1.0 + Math.sin(this.life * 15) * 0.3;
      this.mesh.scale.setScalar(scale * (1.0 - lifePercent * 0.3));
    } else {
      this.mesh.scale.setScalar(1.0 - lifePercent * 0.5);
    }
    
    // Trail fade
    if (this.trail) {
      this.trail.material.opacity = (1.0 - lifePercent) * 0.3;
    }
    
    if (lifePercent >= 1.0) {
      this.deactivate();
    }
  }
  
  deactivate() {
    this.active = false;
    this.mesh.visible = false;
  }
  
  destroy() {
    this.scene.remove(this.mesh);
  }
}
