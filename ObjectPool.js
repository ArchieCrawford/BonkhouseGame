// Generic object pool for reusing game objects
export class ObjectPool {
  constructor(scene, ObjectClass, maxSize) {
    this.scene = scene;
    this.ObjectClass = ObjectClass;
    this.maxSize = maxSize;
    this.pool = [];
    
    // Pre-create objects
    for (let i = 0; i < maxSize; i++) {
      const obj = new ObjectClass(scene, this);
      this.pool.push(obj);
    }
  }
  
  get() {
    // Find first inactive object
    for (let i = 0; i < this.pool.length; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    return null; // Pool exhausted
  }
  
  getActive() {
    return this.pool.filter(obj => obj.active);
  }
  
  deactivateAll() {
    this.pool.forEach(obj => {
      if (obj.deactivate) obj.deactivate();
    });
  }
  
  destroy() {
    this.pool.forEach(obj => obj.destroy());
    this.pool = [];
  }
}
