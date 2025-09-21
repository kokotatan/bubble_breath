import { ARController } from "./ar";
import { setSupportMsg, toast, toggleButtons } from "./ui";
import * as THREE from "three";
import { BreathDetector } from "./breath";
import { BubbleSystem } from "./bubbles";

const ar = new ARController();

// デモモード用の変数
let demoRenderer: THREE.WebGLRenderer | null = null;
let demoScene: THREE.Scene | null = null;
let demoCamera: THREE.PerspectiveCamera | null = null;
let demoBubbleSystem: BubbleSystem | null = null;
let demoBreathDetector: BreathDetector | null = null;
let demoAnimationId: number | null = null;

(async () => {
  // サポート状況を案内
  const isHttps = location.protocol === "https:";
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  
  const supported = isHttps ? await ar.supported() : false;

  if (!isHttps) {
    setSupportMsg("⚠️ HTTP環境です。WebARは利用できませんが、カメラを使ったデモモードでシャボン玉を体験できます。<br/>完全なAR体験にはHTTPS環境をご利用ください。");
  } else if (!supported) {
    let deviceInfo = "";
    if (isIOS) {
      deviceInfo = "iOS Safari 17+ が必要です。現在のiOSバージョンを確認してください。";
    } else if (isAndroid) {
      deviceInfo = "Android Chrome 81+ が必要です。Chromeを最新版に更新してください。";
    } else {
      deviceInfo = "デスクトップブラウザではWebARは動作しません。モバイル端末でアクセスしてください。";
    }
    
    setSupportMsg(`ℹ️ WebAR非対応: ${deviceInfo}<br/>対応ブラウザ: iOS Safari 17+, Android Chrome 81+<br/><br/>デモモード: カメラアクセスを試してみてください`);
  } else {
    setSupportMsg("✅ WebXR対応端末です。Start AR を押してカメラ背景のARを開始できます。");
  }

  const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
  const endBtn = document.getElementById("endBtn") as HTMLButtonElement;
  const breathControls = document.getElementById("breathControls") as HTMLElement;
  const breathToggle = document.getElementById("breathToggle") as HTMLButtonElement;
  const sensitivitySlider = document.getElementById("sensitivitySlider") as HTMLInputElement;
  const sensitivityValue = document.getElementById("sensitivityValue") as HTMLElement;
  const bubbleCount = document.getElementById("bubbleCount") as HTMLElement;

  startBtn.onclick = async () => {
    if (!isHttps) {
      // HTTP環境でもデモモードでカメラアクセスを試す
      toast("デモモードでカメラアクセスを開始します");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        toast("カメラアクセス成功！デモモードでシャボン玉を体験できます");
        
        // デモモード用のシンプルな3Dシーンを開始
        await startDemoMode();
        toggleButtons(true);
        breathControls.hidden = false;
        
        // カメラストリームを停止（デモモードでは不要）
        stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        toast("カメラアクセスが拒否されました");
      }
      return;
    }
    
    if (!supported) {
      toast("WebAR非対応ですが、デモモードでカメラアクセスを試します");
      // デモモードでカメラアクセスを試す
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        toast("カメラアクセス成功！WebAR非対応のため、通常のカメラ表示になります");
        // カメラストリームを停止
        stream.getTracks().forEach(track => track.stop());
      } catch (e) {
        toast("カメラアクセスが拒否されました");
      }
      return;
    }
    
    try {
      await ar.start();
      toggleButtons(true);
      breathControls.hidden = false;
      toast("ARセッションを開始しました");
    } catch (e) {
      console.error(e);
      toast("ARを開始できませんでした");
      toggleButtons(false);
    }
  };

  endBtn.onclick = () => {
    ar.stop();
    stopDemoMode(); // デモモードも停止
    toggleButtons(false);
    breathControls.hidden = true;
    toast("セッションを終了しました");
  };

  // 息吹き検出トグル
  breathToggle.onclick = () => {
    let isEnabled = false;
    
    if (demoBreathDetector) {
      // デモモードの場合
      if (demoBreathDetector.isListening) {
        demoBreathDetector.stop();
        isEnabled = false;
      } else {
        demoBreathDetector.start();
        isEnabled = true;
      }
    } else {
      // ARモードの場合
      isEnabled = ar.toggleBreathDetection();
    }
    
    breathToggle.textContent = isEnabled ? "ON" : "OFF";
    breathToggle.disabled = !isEnabled;
    toast(isEnabled ? "息吹き検出を開始しました" : "息吹き検出を停止しました");
  };

  // 感度スライダー
  sensitivitySlider.oninput = () => {
    const value = parseFloat(sensitivitySlider.value);
    
    if (demoBreathDetector) {
      // デモモードの場合
      demoBreathDetector.setSensitivity(value);
    } else {
      // ARモードの場合
      ar.setBreathSensitivity(value);
    }
    
    sensitivityValue.textContent = value.toFixed(1);
  };

  // シャボン玉数の更新（定期的に）
  setInterval(() => {
    if (bubbleCount) {
      const count = demoBubbleSystem ? demoBubbleSystem.getBubbleCount() : ar.getBubbleCount();
      bubbleCount.textContent = count.toString();
    }
  }, 1000);
})();

// デモモード開始関数
async function startDemoMode(): Promise<void> {
  // コンテナ作成
  const container = document.createElement("div");
  container.className = "canvas-wrap";
  document.body.appendChild(container);

  // Three.js初期化
  demoRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  demoRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  demoRenderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(demoRenderer.domElement);

  demoScene = new THREE.Scene();
  demoCamera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 50);
  demoCamera.position.set(0, 0, 5);
  demoScene.add(demoCamera);

  // ライティング
  const light = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
  demoScene.add(light);

  // シャボン玉システム初期化
  demoBubbleSystem = new BubbleSystem(demoScene);

  // 息吹き検出初期化
  demoBreathDetector = new BreathDetector();
  try {
    await demoBreathDetector.start();
    
    // 息吹き検出時のコールバック
    demoBreathDetector.onBreath((intensity: number) => {
      if (demoBubbleSystem && demoCamera) {
        // カメラの前方にシャボン玉を生成
        const cameraPosition = demoCamera.position.clone();
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(demoCamera.quaternion);
        
        demoBubbleSystem.createBubblesFromBreath(
          cameraPosition,
          intensity,
          cameraDirection
        );
      }
    });
    
    console.log('デモモード: 息吹き検出が開始されました');
  } catch (error) {
    console.error('デモモード: 息吹き検出の開始に失敗:', error);
  }

  // レンダーループ
  const render = () => {
    if (demoRenderer && demoScene && demoCamera) {
      // シャボン玉システム更新
      if (demoBubbleSystem) {
        demoBubbleSystem.update();
      }
      
      demoRenderer.render(demoScene, demoCamera);
    }
    demoAnimationId = requestAnimationFrame(render);
  };
  render();

  // リサイズイベント
  const onResize = () => {
    if (demoRenderer && demoCamera) {
      demoCamera.aspect = window.innerWidth / window.innerHeight;
      demoCamera.updateProjectionMatrix();
      demoRenderer.setSize(window.innerWidth, window.innerHeight);
    }
  };
  window.addEventListener("resize", onResize);
}

// デモモード停止関数
function stopDemoMode(): void {
  if (demoAnimationId) {
    cancelAnimationFrame(demoAnimationId);
    demoAnimationId = null;
  }
  
  if (demoBreathDetector) {
    demoBreathDetector.stop();
    demoBreathDetector = null;
  }
  
  if (demoBubbleSystem) {
    demoBubbleSystem.clearAll();
    demoBubbleSystem = null;
  }
  
  if (demoRenderer) {
    const container = demoRenderer.domElement.parentElement;
    if (container) {
      container.remove();
    }
    demoRenderer.dispose();
    demoRenderer = null;
  }
  
  demoScene = null;
  demoCamera = null;
}
