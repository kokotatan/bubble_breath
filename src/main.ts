import { ARController } from "./ar";
import { setSupportMsg, toast, toggleButtons } from "./ui";

const ar = new ARController();

(async () => {
  // サポート状況を案内
  const isHttps = location.protocol === "https:";
  const supported = isHttps ? await ar.supported() : false;

  if (!isHttps) {
    setSupportMsg("🔒 HTTPSでアクセスしてください（カメラ/ARの権限に必要です）。<br/>ローカル開発は <code>vite</code> の https オプションや、Netlify/Vercel デプロイを推奨。");
  } else if (!supported) {
    setSupportMsg("ℹ️ この端末/ブラウザは WebXR の <code>immersive-ar</code> をサポートしていません。最新の Chrome/Edge/AndroidまたはiOS Safari(17+) をお試しください。");
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
