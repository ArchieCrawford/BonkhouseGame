import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CONFIG } from './config.js';

const POWERUP_MODELS = {
  shotgun: { url: '/public/shotgun.glb', scale: 0.7 },
  laser: { url: '/public/lazer.glb', scale: 0.7 }
};

export class PowerUp {
  constructor(scene, pool) {
    this.scene = scene;
    this.pool = pool;
    this.active = false;
    
    // Group to hold the power-up
    this.group = new THREE.Group();
    this.group.visible = false;
    scene.add(this.group);

    this.loader = new GLTFLoader();
    this.modelGroup = new THREE.Group();
    this.modelGroup.visible = false;
    this.group.add(this.modelGroup);
    this.typeModels = {};
    this.typeLoading = {};
    
    // Base shape - floating box
    const geometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    this.material = new THREE.MeshStandardMaterial({ 
      color: 0xFFD700,
      emissive: 0xFFAA00,
      emissiveIntensity: 0.6,
      metalness: 0.8,
      roughness: 0.2
    });
    
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.group.add(this.mesh);
    
    // Add icon mesh for visual identification
    const iconGeometry = new THREE.PlaneGeometry(0.6, 0.6);
    this.iconMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 1.0
    });
    this.iconMesh = new THREE.Mesh(iconGeometry, this.iconMaterial);
    this.iconMesh.position.z = 0.41;
    this.group.add(this.iconMesh);
    
    // Add glow ring
    const ringGeometry = new THREE.TorusGeometry(0.6, 0.08, 8, 16);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.6
    });
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = -0.6;
    this.group.add(this.ring);
    
    this.powerUpType = 'machinegun';
    this.speed = 3;
    this.rotationSpeed = 2;
    this.bobSpeed = 3;
    this.bobAmount = 0.3;
    this.time = 0;
  }
  
  spawn(x, z, type) {
    this.active = true;
    this.powerUpType = type;
    this.time = 0;
    
    this.group.position.set(x, 1.0, z);
    this.group.visible = true;
    this.group.scale.set(1, 1, 1);
    
    // Set visual appearance based on type
    switch(type) {
      case 'machinegun':
        this.material.color.setHex(0xFF6B00); // Orange
        this.material.emissive.setHex(0xFF4400);
        this.ring.material.color.setHex(0xFF6B00);
        break;
      case 'laser':
        this.material.color.setHex(0x00FFFF); // Cyan
        this.material.emissive.setHex(0x0088FF);
        this.ring.material.color.setHex(0x00FFFF);
        break;
      case 'shotgun':
        this.material.color.setHex(0xFF0000); // Red
        this.material.emissive.setHex(0xAA0000);
        this.ring.material.color.setHex(0xFF0000);
        break;
    }

    this.loadModelForType(type);
    this.setActiveModel(type);
  }

  loadModelForType(type) {
    const config = POWERUP_MODELS[type];
    if (!config || this.typeModels[type] || this.typeLoading[type]) return;
    
    this.typeLoading[type] = true;
    this.loader.load(
      config.url,
      (gltf) => {
        const model = gltf.scene;
        model.scale.setScalar(config.scale);
        model.position.set(0, 0, 0);
        model.visible = false;
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        this.modelGroup.add(model);
        this.typeModels[type] = model;
        this.typeLoading[type] = false;
        
        if (this.active && this.powerUpType === type) {
          this.setActiveModel(type);
        }
      },
      undefined,
      (error) => {
        console.error(`Error loading ${type} power-up model:`, error);
        this.typeLoading[type] = false;
      }
    );
  }

  setActiveModel(type) {
    let hasModel = false;
    Object.entries(this.typeModels).forEach(([key, model]) => {
      const isActive = key === type;
      model.visible = isActive;
      if (isActive) hasModel = true;
    });
    
    if (hasModel) {
      this.modelGroup.visible = true;
      this.mesh.visible = false;
      this.iconMesh.visible = false;
    } else {
      this.modelGroup.visible = false;
      this.mesh.visible = true;
      this.iconMesh.visible = true;
    }
  }
  
  update(deltaTime) {
    if (!this.active) return;
    
    this.time += deltaTime;
    
    // Move forward toward player
    this.group.position.z += this.speed * deltaTime;
    
    // Rotate the power-up
    this.mesh.rotation.y += this.rotationSpeed * deltaTime;
    this.mesh.rotation.x = Math.sin(this.time * 2) * 0.2;
    this.modelGroup.rotation.y += this.rotationSpeed * deltaTime;
    this.modelGroup.rotation.x = Math.sin(this.time * 2) * 0.2;
    
    // Bob up and down
    const bobOffset = Math.sin(this.time * this.bobSpeed) * this.bobAmount;
    this.mesh.position.y = bobOffset;
    this.modelGroup.position.y = bobOffset;
    
    // Pulse the ring
    const scale = 1 + Math.sin(this.time * 4) * 0.2;
    this.ring.scale.set(scale, scale, scale);
    this.ring.rotation.z += deltaTime;
    
    // Deactivate if it goes past the player
    if (this.group.position.z > 10) {
      this.deactivate();
    }
  }
  
  getPosition() {
    return this.group.position.clone();
  }
  
  deactivate() {
    this.active = false;
    this.group.visible = false;
    this.group.position.set(0, -100, 0);
  }
  
  destroy() {
    this.scene.remove(this.group);
  }
}
