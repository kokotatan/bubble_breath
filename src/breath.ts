// マイク音圧検出による息吹き検出
export class BreathDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private microphone: MediaStreamAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private _isListening = false;
  
  // 外部からアクセス可能なプロパティ
  get isListening(): boolean {
    return this._isListening;
  }
  private animationId: number | null = null;
  
  // 設定（スマホ向けに調整）
  private sensitivity = 0.5; // 感度 (0-1) - スマホでは少し高めに
  private threshold = 0.15; // しきい値 - ノイズを避けるため少し高めに
  private smoothing = 0.7; // スムージング係数 - 反応性を上げる
  private smoothedVolume = 0;
  
  // イベント
  private onBreathDetected: ((intensity: number) => void) | null = null;
  private onVolumeChange: ((volume: number) => void) | null = null;

  async start(): Promise<void> {
    if (this._isListening) return;

    try {
      // マイクアクセス
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });

      // AudioContext初期化
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.microphone = this.audioContext.createMediaStreamSource(stream);
      
      // アナライザー設定
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.3;
      this.microphone.connect(this.analyser);
      
      // データ配列初期化
      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(bufferLength) as any;
      
      this._isListening = true;
      this.startAnalysis();
      
    } catch (error) {
      console.error('マイクアクセスエラー:', error);
      throw new Error('マイクアクセスが拒否されました');
    }
  }

  stop(): void {
    if (!this._isListening) return;

    this._isListening = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    if (this.microphone) {
      this.microphone.disconnect();
      this.microphone = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.dataArray = null;
  }

  private startAnalysis(): void {
    if (!this.analyser || !this.dataArray || !this._isListening) return;

    const analyze = () => {
      if (!this.analyser || !this.dataArray || !this._isListening) return;

      this.analyser.getByteFrequencyData(this.dataArray as any);
      
      // 音量計算（低周波数帯域を重視）
      let sum = 0;
      const lowFreqCount = Math.floor(this.dataArray.length * 0.3); // 低周波数のみ
      for (let i = 0; i < lowFreqCount; i++) {
        sum += this.dataArray[i];
      }
      const volume = sum / (lowFreqCount * 255);
      
      // スムージング
      this.smoothedVolume = this.smoothedVolume * this.smoothing + volume * (1 - this.smoothing);
      
      // ボリューム変化イベント
      if (this.onVolumeChange) {
        this.onVolumeChange(this.smoothedVolume);
      }
      
      // 息吹き検出
      if (this.smoothedVolume > this.threshold) {
        const intensity = Math.min(this.smoothedVolume * this.sensitivity, 1);
        if (this.onBreathDetected) {
          this.onBreathDetected(intensity);
        }
      }
      
      this.animationId = requestAnimationFrame(analyze);
    };
    
    analyze();
  }

  // イベントリスナー設定
  onBreath(callback: (intensity: number) => void): void {
    this.onBreathDetected = callback;
  }

  onVolume(callback: (volume: number) => void): void {
    this.onVolumeChange = callback;
  }

  // 設定変更
  setSensitivity(value: number): void {
    this.sensitivity = Math.max(0, Math.min(1, value));
  }

  setThreshold(value: number): void {
    this.threshold = Math.max(0, Math.min(1, value));
  }

  getSensitivity(): number {
    return this.sensitivity;
  }

  getThreshold(): number {
    return this.threshold;
  }
}
