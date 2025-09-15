import { ARController } from "./ar";
import { setSupportMsg, toast, toggleButtons } from "./ui";

const ar = new ARController();

(async () => {
  // サポート状況を案内
  const isHttps = location.protocol === "https:";
  const userAgent = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isChrome = /Chrome/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  
  const supported = isHttps ? await ar.supported() : false;

  if (!isHttps) {
    setSupportMsg("🔒 HTTPSでアクセスしてください（カメラ/ARの権限に必要です）。<br/>ローカル開発は <code>vite</code> の https オプションや、Netlify/Vercel デプロイを推奨。");
  } else if (!supported) {
    let deviceInfo = "";
    if (isIOS) {
      deviceInfo = "iOS Safari 17+ が必要です。現在のiOSバージョンを確認してください。";
    } else if (isAndroid) {
      deviceInfo = "Android Chrome 81+ が必要です。Chromeを最新版に更新してください。";
    } else {
      deviceInfo = "デスクトップブラウザではWebARは動作しません。モバイル端末でアクセスしてください。";
    }
    
    setSupportMsg(`ℹ️ WebAR非対応: ${deviceInfo}<br/>対応ブラウザ: iOS Safari 17+, Android Chrome 81+`);
  } else {
    setSupportMsg("✅ WebXR対応端末です。Start AR を押してカメラ背景のARを開始できます。");
  }

  const startBtn = document.getElementById("startBtn") as HTMLButtonElement;
  const endBtn = document.getElementById("endBtn") as HTMLButtonElement;

  startBtn.onclick = async () => {
    if (!isHttps) {
      toast("HTTPSでのアクセスが必要です");
      return;
    }
    
    if (!supported) {
      toast("この端末ではWebARは利用できません");
      return;
    }
    
    try {
      await ar.start();
      toggleButtons(true);
      toast("ARセッションを開始しました");
    } catch (e) {
      console.error(e);
      toast("ARを開始できませんでした");
      toggleButtons(false);
    }
  };

  endBtn.onclick = () => {
    ar.stop();
    toggleButtons(false);
    toast("ARセッションを終了しました");
  };
})();
