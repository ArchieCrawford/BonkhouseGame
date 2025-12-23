import * as THREE from 'three';

export class AtmosphericEffects {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;
    this.birds = [];
    
    // Create distant birds for life and scale
    this.createBirds();
  }
  
  createBirds() {
    // Simple bird sprites using triangles
    const birdGeometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      0, 0, 0,
      -0.3, 0, -0.2,
      0.3, 0, -0.2
    ]);
    birdGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    
    const birdMaterial = new THREE.MeshBasicMaterial({
      color: 0x2a2a2a,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6
    });
    
    // Create 8 birds flying in the distance
    for (let i = 0; i < 8; i++) {
      const bird = new THREE.Mesh(birdGeometry, birdMaterial);
      
      // Position birds far away and high
      bird.position.set(
        (Math.random() - 0.5) * 100,
        20 + Math.random() * 20,
        -80 - Math.random() * 60
      );
      
      // Random starting phase for wing flap
      bird.userData.phase = Math.random() * Math.PI * 2;
      bird.userData.speed = 3 + Math.random() * 2;
      bird.userData.amplitude = 2 + Math.random() * 2;
      
      this.birds.push(bird);
      this.scene.add(bird);
    }
  }
  
  update(deltaTime) {
    this.time += deltaTime;
    
    // Animate birds
    this.birds.forEach((bird, i) => {
      // Wing flap animation (rotate around X)
      bird.rotation.x = Math.sin(this.time * 4 + bird.userData.phase) * 0.3;
      
      // Circular flight path
      const radius = 60;
      const angle = (this.time * 0.1 + i * (Math.PI * 2 / this.birds.length)) % (Math.PI * 2);
      
      bird.position.x = Math.cos(angle) * radius;
      bird.position.z = -100 + Math.sin(angle) * 40;
      bird.position.y = 25 + Math.sin(this.time * 0.5 + bird.userData.phase) * bird.userData.amplitude;
      
      // Face direction of travel
      bird.rotation.y = angle + Math.PI / 2;
    });
  }
  
  destroy() {
    this.birds.forEach(bird => {
      this.scene.remove(bird);
      bird.geometry.dispose();
      bird.material.dispose();
    });
    this.birds = [];
  }
}
