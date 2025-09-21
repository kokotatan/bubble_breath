import * as THREE from "three";

// シャボン玉クラス
class Bubble {
  public mesh: THREE.Mesh;
  public velocity: THREE.Vector3;
  public life: number;
  public maxLife: number;
  public size: number;
  public opacity: number;

  constructor(position: THREE.Vector3, size: number, velocity: THREE.Vector3) {
    this.size = size;
    this.maxLife = 3.0 + Math.random() * 2.0; // 3-5秒
    this.life = this.maxLife;
    this.velocity = velocity.clone();
    this.opacity = 1.0;

    // シャボン玉のジオメトリ（球体）
    const geometry = new THREE.SphereGeometry(size, 16, 16);
    
    // シャボン玉のマテリアル（透明、屈折、反射）
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 0.8, 0.9),
      transparent: true,
      opacity: 0.7,
      roughness: 0.0,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,
      ior: 1.33, // 水の屈折率
      transmission: 0.9,
      thickness: 0.01,
      envMapIntensity: 1.0
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    
    // ランダムな回転
    this.mesh.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    );
  }

  update(deltaTime: number): boolean {
    // 位置更新
    this.mesh.position.add(this.velocity.clone().multiplyScalar(deltaTime));
    
    // 重力効果
    this.velocity.y -= 9.8 * deltaTime * 0.1; // 軽い重力
    
    // 空気抵抗
    this.velocity.multiplyScalar(0.98);
    
    // 寿命管理
    this.life -= deltaTime;
    this.opacity = this.life / this.maxLife;
    
    // マテリアルの透明度更新
    if (this.mesh.material instanceof THREE.MeshPhysicalMaterial) {
      this.mesh.material.opacity = this.opacity * 0.7;
    }
    
    // サイズの変化（膨らむ効果）
    const scale = 1.0 + (1.0 - this.opacity) * 0.2;
    this.mesh.scale.setScalar(scale);
    
    // 回転
    this.mesh.rotation.x += deltaTime * 0.5;
    this.mesh.rotation.y += deltaTime * 0.3;
    
    return this.life > 0;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    if (this.mesh.material instanceof THREE.MeshPhysicalMaterial) {
      this.mesh.material.dispose();
    }
  }
}

// シャボン玉管理システム
export class BubbleSystem {
  private scene: THREE.Scene;
  private bubbles: Bubble[] = [];
  private clock: THREE.Clock;
  private windDirection = new THREE.Vector3(0, 0, 0);
  private windStrength = 0.1;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.clock = new THREE.Clock();
  }

  // 息吹きでシャボン玉生成
  createBubblesFromBreath(position: THREE.Vector3, intensity: number, direction: THREE.Vector3): void {
    const bubbleCount = Math.floor(3 + intensity * 7); // 3-10個
    const baseSize = 0.02 + intensity * 0.03; // 0.02-0.05m
    
    for (let i = 0; i < bubbleCount; i++) {
      // ランダムな位置（息吹きの範囲内）
      const offset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.05,
        (Math.random() - 0.5) * 0.1
      );
      const bubblePos = position.clone().add(offset);
      
      // ランダムなサイズ
      const size = baseSize * (0.8 + Math.random() * 0.4);
      
      // 息吹き方向 + ランダムな方向
      const bubbleDirection = direction.clone()
        .add(new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          Math.random() * 0.3 + 0.2, // 上向きの傾向
          (Math.random() - 0.5) * 0.5
        ))
        .normalize()
        .multiplyScalar(2 + intensity * 3); // 強度に応じた速度
      
      const bubble = new Bubble(bubblePos, size, bubbleDirection);
      this.bubbles.push(bubble);
      this.scene.add(bubble.mesh);
    }
  }

  // シャボン玉を吹く棒の位置から生成
  createBubblesFromWand(wandPosition: THREE.Vector3, wandDirection: THREE.Vector3, intensity: number): void {
    // 棒の先端位置
    const tipPosition = wandPosition.clone().add(wandDirection.clone().multiplyScalar(0.1));
    
    // 棒の方向に沿ってシャボン玉を生成
    this.createBubblesFromBreath(tipPosition, intensity, wandDirection);
  }

  // 更新処理
  update(): void {
    const deltaTime = this.clock.getDelta();
    
    // 風の効果を更新
    this.windDirection.set(
      Math.sin(Date.now() * 0.001) * this.windStrength,
      0,
      Math.cos(Date.now() * 0.001) * this.windStrength
    );
    
    // 各シャボン玉を更新
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];
      
      // 風の効果を適用
      bubble.velocity.add(this.windDirection.clone().multiplyScalar(deltaTime));
      
      // 更新
      const isAlive = bubble.update(deltaTime);
      
      if (!isAlive) {
        // 削除
        this.scene.remove(bubble.mesh);
        bubble.dispose();
        this.bubbles.splice(i, 1);
      }
    }
  }

  // 全シャボン玉をクリア
  clearAll(): void {
    this.bubbles.forEach(bubble => {
      this.scene.remove(bubble.mesh);
      bubble.dispose();
    });
    this.bubbles = [];
  }

  // シャボン玉の数を取得
  getBubbleCount(): number {
    return this.bubbles.length;
  }

  // 風の設定
  setWind(strength: number, direction?: THREE.Vector3): void {
    this.windStrength = strength;
    if (direction) {
      this.windDirection.copy(direction);
    }
  }
}

