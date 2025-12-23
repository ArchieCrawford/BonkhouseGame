import * as THREE from 'three';
import { CONFIG } from './config.js';

export class Lane {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.time = 0;
    
    // BRIDGE DECK - Premium asphalt with texture detail
    this.createBridgeDeck();
    
    // BRIDGE RAILS - Repeating posts and horizontal rails
    this.createBridgeRails();
    
    // WATER - Animated water on both sides
    this.createWater();
    
    scene.add(this.group);
  }
  
  createBridgeDeck() {
    // Main bridge surface with realistic asphalt look
    const deckGeometry = new THREE.BoxGeometry(CONFIG.LANE_WIDTH, 0.4, CONFIG.LANE_LENGTH);
    
    // Create procedural asphalt texture
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Base concrete color - lighter for better enemy visibility
    ctx.fillStyle = '#8a9299';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add noise/texture for realism
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 2;
      const brightness = Math.random() * 40 + 120;
      ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
      ctx.fillRect(x, y, size, size);
    }
    
    // Add wear marks and cracks
    ctx.strokeStyle = 'rgba(60, 60, 60, 0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.lineTo(Math.random() * 512, Math.random() * 512);
      ctx.stroke();
    }
    
    const deckTexture = new THREE.CanvasTexture(canvas);
    deckTexture.wrapS = THREE.RepeatWrapping;
    deckTexture.wrapT = THREE.RepeatWrapping;
    deckTexture.repeat.set(2, 15);
    
    const deckMaterial = new THREE.MeshStandardMaterial({ 
      map: deckTexture,
      color: 0xa0adb5,
      metalness: 0.05,
      roughness: 0.95
    });
    
    const deck = new THREE.Mesh(deckGeometry, deckMaterial);
    deck.position.set(0, -0.2, CONFIG.LANE_POSITION_Z);
    deck.receiveShadow = true;
    deck.castShadow = true;
    this.group.add(deck);
    
    // Center lane markings - yellow dashed lines
    const stripeGeometry = new THREE.BoxGeometry(0.25, 0.05, 2.5);
    const stripeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700,
      emissive: 0xFFAA00,
      emissiveIntensity: 0.4
    });
    
    for (let i = 0; i < 15; i++) {
      const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
      stripe.position.set(0, 0.15, -60 + i * 4);
      this.group.add(stripe);
    }
    
    // Edge lane markings - white solid lines
    const edgeStripeGeometry = new THREE.BoxGeometry(0.15, 0.05, CONFIG.LANE_LENGTH);
    const edgeStripeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xeeeeee,
      emissive: 0xaaaaaa,
      emissiveIntensity: 0.2
    });
    
    // Left edge line
    const leftEdge = new THREE.Mesh(edgeStripeGeometry, edgeStripeMaterial);
    leftEdge.position.set(-CONFIG.LANE_WIDTH / 2 + 0.3, 0.15, CONFIG.LANE_POSITION_Z);
    this.group.add(leftEdge);
    
    // Right edge line
    const rightEdge = new THREE.Mesh(edgeStripeGeometry, edgeStripeMaterial);
    rightEdge.position.set(CONFIG.LANE_WIDTH / 2 - 0.3, 0.15, CONFIG.LANE_POSITION_Z);
    this.group.add(rightEdge);
    
    // Bridge support beams underneath
    const beamGeometry = new THREE.BoxGeometry(CONFIG.LANE_WIDTH + 1, 0.3, 0.4);
    const beamMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a5568,
      metalness: 0.3,
      roughness: 0.7
    });
    
    for (let i = 0; i < 8; i++) {
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      beam.position.set(0, -0.5, -55 + i * 15);
      beam.castShadow = true;
      this.group.add(beam);
    }
  }
  
  createBridgeRails() {
    // Create detailed bridge rail system with posts and horizontal bars
    const postGeometry = new THREE.BoxGeometry(0.2, 1.2, 0.2);
    const postMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x606c7a,
      metalness: 0.5,
      roughness: 0.4
    });
    
    const railGeometry = new THREE.BoxGeometry(0.08, 0.08, CONFIG.LANE_LENGTH);
    const railMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x7a8694,
      metalness: 0.7,
      roughness: 0.2
    });
    
    // Create rail posts with slight variations
    for (let i = 0; i < 12; i++) {
      const z = -58 + i * 10;
      const offsetVariation = (Math.sin(i * 0.5) * 0.05); // Slight organic variation
      
      // Left side posts
      const leftPost = new THREE.Mesh(postGeometry, postMaterial);
      leftPost.position.set(-CONFIG.LANE_WIDTH / 2 - 0.5 + offsetVariation, 0.6, z);
      leftPost.castShadow = true;
      this.group.add(leftPost);
      
      // Right side posts
      const rightPost = new THREE.Mesh(postGeometry, postMaterial);
      rightPost.position.set(CONFIG.LANE_WIDTH / 2 + 0.5 - offsetVariation, 0.6, z);
      rightPost.castShadow = true;
      this.group.add(rightPost);
    }
    
    // Horizontal rails (top and middle)
    for (let railHeight of [0.9, 0.5]) {
      // Left rails
      const leftTopRail = new THREE.Mesh(railGeometry, railMaterial);
      leftTopRail.rotation.x = Math.PI / 2;
      leftTopRail.position.set(-CONFIG.LANE_WIDTH / 2 - 0.5, railHeight, CONFIG.LANE_POSITION_Z);
      leftTopRail.castShadow = true;
      this.group.add(leftTopRail);
      
      // Right rails
      const rightTopRail = new THREE.Mesh(railGeometry, railMaterial);
      rightTopRail.rotation.x = Math.PI / 2;
      rightTopRail.position.set(CONFIG.LANE_WIDTH / 2 + 0.5, railHeight, CONFIG.LANE_POSITION_Z);
      rightTopRail.castShadow = true;
      this.group.add(rightTopRail);
    }
    
    // Decorative cross-bracing between posts (every other post)
    const braceGeometry = new THREE.BoxGeometry(0.06, 0.06, 1);
    const braceMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x505c6a,
      metalness: 0.6,
      roughness: 0.3
    });
    
    for (let i = 0; i < 6; i++) {
      const z = -58 + i * 20;
      
      // Left side X-brace
      const leftBrace1 = new THREE.Mesh(braceGeometry, braceMaterial);
      leftBrace1.position.set(-CONFIG.LANE_WIDTH / 2 - 0.5, 0.6, z);
      leftBrace1.rotation.set(0, 0, Math.PI / 4);
      this.group.add(leftBrace1);
      
      const leftBrace2 = new THREE.Mesh(braceGeometry, braceMaterial);
      leftBrace2.position.set(-CONFIG.LANE_WIDTH / 2 - 0.5, 0.6, z);
      leftBrace2.rotation.set(0, 0, -Math.PI / 4);
      this.group.add(leftBrace2);
      
      // Right side X-brace
      const rightBrace1 = new THREE.Mesh(braceGeometry, braceMaterial);
      rightBrace1.position.set(CONFIG.LANE_WIDTH / 2 + 0.5, 0.6, z);
      rightBrace1.rotation.set(0, 0, Math.PI / 4);
      this.group.add(rightBrace1);
      
      const rightBrace2 = new THREE.Mesh(braceGeometry, braceMaterial);
      rightBrace2.position.set(CONFIG.LANE_WIDTH / 2 + 0.5, 0.6, z);
      rightBrace2.rotation.set(0, 0, -Math.PI / 4);
      this.group.add(rightBrace2);
    }
  }
  
  createWater() {
    // Create animated water plane on both sides of the bridge
    const waterWidth = 60;
    const waterLength = CONFIG.LANE_LENGTH + 40;
    
    // Left water plane
    const leftWaterGeometry = new THREE.PlaneGeometry(waterWidth, waterLength, 32, 32);
    const rightWaterGeometry = new THREE.PlaneGeometry(waterWidth, waterLength, 32, 32);
    
    // Water shader material with animated waves
    const waterMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a6f9e,
      metalness: 0.8,
      roughness: 0.2,
      transparent: true,
      opacity: 0.85
    });
    
    // Left water
    this.leftWater = new THREE.Mesh(leftWaterGeometry, waterMaterial);
    this.leftWater.rotation.x = -Math.PI / 2;
    this.leftWater.position.set(-CONFIG.LANE_WIDTH / 2 - waterWidth / 2 - 0.5, -1.5, CONFIG.LANE_POSITION_Z);
    this.leftWater.receiveShadow = true;
    this.group.add(this.leftWater);
    
    // Right water
    this.rightWater = new THREE.Mesh(rightWaterGeometry, waterMaterial);
    this.rightWater.rotation.x = -Math.PI / 2;
    this.rightWater.position.set(CONFIG.LANE_WIDTH / 2 + waterWidth / 2 + 0.5, -1.5, CONFIG.LANE_POSITION_Z);
    this.rightWater.receiveShadow = true;
    this.group.add(this.rightWater);
    
    // Store geometries for animation
    this.leftWaterGeometry = leftWaterGeometry;
    this.rightWaterGeometry = rightWaterGeometry;
    
    // Add foam/wave caps along bridge edges
    const foamGeometry = new THREE.PlaneGeometry(1, CONFIG.LANE_LENGTH, 1, 20);
    const foamMaterial = new THREE.MeshBasicMaterial({
      color: 0xb8d4e8,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    
    // Left foam
    this.leftFoam = new THREE.Mesh(foamGeometry, foamMaterial);
    this.leftFoam.rotation.x = -Math.PI / 2;
    this.leftFoam.position.set(-CONFIG.LANE_WIDTH / 2 - 1, -1.3, CONFIG.LANE_POSITION_Z);
    this.group.add(this.leftFoam);
    
    // Right foam
    this.rightFoam = new THREE.Mesh(foamGeometry, foamMaterial);
    this.rightFoam.rotation.x = -Math.PI / 2;
    this.rightFoam.position.set(CONFIG.LANE_WIDTH / 2 + 1, -1.3, CONFIG.LANE_POSITION_Z);
    this.group.add(this.rightFoam);
    
    // Distant water plane for horizon
    const distantWaterGeometry = new THREE.PlaneGeometry(200, 100);
    const distantWaterMaterial = new THREE.MeshStandardMaterial({
      color: 0x1a4d6f,
      metalness: 0.5,
      roughness: 0.6,
      transparent: true,
      opacity: 0.7
    });
    
    this.distantWater = new THREE.Mesh(distantWaterGeometry, distantWaterMaterial);
    this.distantWater.rotation.x = -Math.PI / 2;
    this.distantWater.position.set(0, -2, -100);
    this.distantWater.receiveShadow = true;
    this.group.add(this.distantWater);
  }
  
  update(deltaTime) {
    this.time += deltaTime;
    
    // Animate water waves
    if (this.leftWaterGeometry && this.rightWaterGeometry) {
      const positions = this.leftWaterGeometry.attributes.position;
      const positions2 = this.rightWaterGeometry.attributes.position;
      
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const z = positions.getZ(i);
        
        // Multiple sine waves for realistic water motion
        const wave1 = Math.sin(x * 0.5 + this.time * 1.5) * 0.15;
        const wave2 = Math.sin(z * 0.3 + this.time * 1.0) * 0.1;
        const wave3 = Math.sin((x + z) * 0.2 + this.time * 2.0) * 0.08;
        
        const y = wave1 + wave2 + wave3;
        
        positions.setY(i, y);
        positions2.setY(i, y);
      }
      
      positions.needsUpdate = true;
      positions2.needsUpdate = true;
    }
    
    // Animate foam with offset wave pattern
    if (this.leftFoam && this.rightFoam) {
      const foamPositions = this.leftFoam.geometry.attributes.position;
      
      for (let i = 0; i < foamPositions.count; i++) {
        const z = foamPositions.getZ(i);
        const y = Math.sin(z * 0.5 + this.time * 3) * 0.1;
        foamPositions.setY(i, y);
      }
      
      foamPositions.needsUpdate = true;
    }
  }
  
  destroy() {
    this.scene.remove(this.group);
  }
}
