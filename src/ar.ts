import * as THREE from "three";

// ARセッションとThree.jsの最小実装（カメラ背景をARに）
export class ARController {
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  // private xrRefSpace: any = null; // 未使用のためコメントアウト
  private onAnimationFrame?: number;
  private container?: HTMLElement;

  async supported(): Promise<boolean> {
    // HTTPS 必須、WebXRが使えるかチェック
    if (!("xr" in navigator)) return false;
    try {
      // @ts-ignore
      return await (navigator as any).xr.isSessionSupported("immersive-ar");
    } catch {
      return false;
    }
  }

  async start(): Promise<void> {
    // ラッパーを用意
    this.container = document.querySelector(".canvas-wrap") as HTMLElement;
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.className = "canvas-wrap";
      document.body.appendChild(this.container);
    }

    // Three.js 初期化
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);
    this.scene.add(this.camera);

    // 暗所でもUIが見えるように微光を置く（シーン内オブジェクト追加の足場）
    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 0.25);
    this.scene.add(light);

    window.addEventListener("resize", this.onResize);

    // WebXR AR セッション開始
    const session = await (navigator as any).xr.requestSession("immersive-ar", {
      requiredFeatures: [],        // まずはカメラ背景だけ。hit-test等は後日
      optionalFeatures: ["local-floor"] // 安定化用
    });

    this.renderer.xr.setReferenceSpaceType("local"); // or "local-floor"
    await this.renderer.xr.setSession(session);

    // this.xrRefSpace = await session.requestReferenceSpace("local");
    // レンダーループ
    const render = (_time: number, _frame?: any) => {
      this.renderer.render(this.scene, this.camera);
    };
    this.onAnimationFrame = this.renderer.setAnimationLoop(render) as unknown as number;

    // セッション終了時クリーンアップ
    session.addEventListener("end", () => this.stop());
  }

  stop(): void {
    if (this.onAnimationFrame != null) {
      this.renderer.setAnimationLoop(null as any);
      this.onAnimationFrame = undefined;
    }
    window.removeEventListener("resize", this.onResize);
    if (this.container && this.renderer?.domElement?.parentElement === this.container) {
      this.container.remove();
    }
    // XRセッションを明示的に終了（renderer側が持っている場合がある）
    const xr = (this.renderer as any)?.xr;
    if (xr && xr.getSession && xr.getSession()) {
      xr.getSession().end().catch(() => {});
    }
  }

  private onResize = () => {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };
}
