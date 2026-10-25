/**
 * Lumina Hand Gesture Recognition Engine
 * Multi-device compatible: Mobile smartphones (iOS & Android), Tablets, and Desktop PCs.
 * 
 * Uses MediaPipe Hands to detect 21 hand landmarks and classify:
 * - OPEN PALM  -> Light ON
 * - CLOSED PALM (Fist) -> Light OFF
 */
class LuminaHandDetector {
  constructor(options = {}) {
    this.videoElement = options.videoElement;
    this.canvasElement = options.canvasElement;
    this.videoContainer = document.getElementById('videoContainer');
    this.canvasCtx = this.canvasElement ? this.canvasElement.getContext('2d') : null;

    this.onGestureChange = options.onGestureChange || (() => {});
    this.onTelemetry = options.onTelemetry || (() => {});
    this.onStatusChange = options.onStatusChange || (() => {});

    this.hands = null;
    this.isDetecting = false;
    this.showOverlay = true;

    // Multi-device detection
    this.isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || 
                    ('ontouchstart' in window && window.innerWidth <= 1024);
    this.facingMode = 'user'; // 'user' (selfie) or 'environment' (back camera)
    this.isMirrored = true;
    this.currentStream = null;

    // Detection tuning
    this.sensitivity = 0.5; // 0.0 to 1.0
    this.historyBuffer = [];
    this.bufferSize = this.isMobile ? 4 : 5; // Slightly faster reaction on mobile
    this.currentGesture = null; // 'OPEN_PALM' | 'CLOSED_PALM' | null
    this.lastDetectedTime = 0;

    // Performance tracking
    this.frameCount = 0;
    this.fps = 0;
    this.lastFpsUpdate = performance.now();

    // Simulation / Demo mode
    this.isSimulation = false;
    this.simulationState = 'CLOSED_PALM';
  }

  async initialize() {
    this.onStatusChange('loading', 'Loading MediaPipe Hand AI Models...');

    if (typeof window.Hands === 'undefined') {
      console.warn('MediaPipe Hands script not loaded yet, waiting...');
      await this.waitForGlobal('Hands', 6000);
    }

    try {
      this.hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });

      // Adaptive complexity: 0 on mobile for 60fps & low battery drain, 1 on desktop
      const complexity = this.isMobile ? 0 : 1;

      this.hands.setOptions({
        maxNumHands: 1,
        modelComplexity: complexity,
        minDetectionConfidence: 0.62,
        minTrackingConfidence: 0.62
      });

      this.hands.onResults((results) => this.handleResults(results));
      this.onStatusChange('ready', `AI Loaded (${this.isMobile ? 'Mobile Optimized' : 'Desktop HD'})`);
      return true;
    } catch (err) {
      console.error('Failed to initialize MediaPipe Hands:', err);
      this.onStatusChange('error', 'Failed to load AI model');
      return false;
    }
  }

  waitForGlobal(key, timeoutMs) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (window[key]) {
          clearInterval(interval);
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          reject(new Error(`Timed out waiting for global ${key}`));
        }
      }, 100);
    });
  }

  async startCamera() {
    try {
      this.onStatusChange('loading', 'Requesting Camera Access...');

      // Stop previous tracks if switching
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
      }

      // Adaptive resolution for device
      const idealWidth = this.isMobile ? 480 : 640;
      const idealHeight = this.isMobile ? 360 : 480;

      const constraints = {
        video: {
          facingMode: this.facingMode,
          width: { ideal: idealWidth },
          height: { ideal: idealHeight }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.currentStream = stream;
      this.videoElement.srcObject = stream;

      // iOS Safari requires attributes
      this.videoElement.setAttribute('playsinline', '');
      this.videoElement.setAttribute('webkit-playsinline', '');
      this.videoElement.muted = true;

      await this.videoElement.play();

      // Set mirror mode based on camera facing
      this.setMirror(this.facingMode === 'user');

      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());

      this.isDetecting = true;
      this.isSimulation = false;
      this.onStatusChange('ready', `Camera Active (${this.facingMode === 'user' ? 'Front' : 'Rear'})`);

      this.processVideoFrame();
      return true;
    } catch (err) {
      console.error('Camera access error:', err);
      let errorMsg = 'Camera access denied or unavailable';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera permission blocked. Click camera icon in address bar to allow.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found on this device.';
      } else if (!window.isSecureContext) {
        errorMsg = 'Camera requires HTTPS on remote devices. Open https:// instead.';
      }
      this.onStatusChange('error', errorMsg);
      throw err;
    }
  }

  /**
   * Flip between Front (Selfie) and Rear (Environment) camera on mobile/tablets
   */
  async flipCamera() {
    this.facingMode = this.facingMode === 'user' ? 'environment' : 'user';
    return await this.startCamera();
  }

  /**
   * Toggle video mirroring
   */
  toggleMirror() {
    this.setMirror(!this.isMirrored);
    return this.isMirrored;
  }

  setMirror(mirror) {
    this.isMirrored = mirror;
    if (this.videoContainer) {
      if (this.isMirrored) {
        this.videoContainer.classList.remove('unmirrored');
      } else {
        this.videoContainer.classList.add('unmirrored');
      }
    }
  }

  resizeCanvas() {
    if (!this.canvasElement || !this.videoElement) return;
    this.canvasElement.width = this.videoElement.videoWidth || (this.isMobile ? 480 : 640);
    this.canvasElement.height = this.videoElement.videoHeight || (this.isMobile ? 360 : 480);
  }

  async processVideoFrame() {
    if (!this.isDetecting) return;

    // Track FPS
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }

    if (this.hands && this.videoElement.readyState >= 2) {
      try {
        await this.hands.send({ image: this.videoElement });
      } catch (e) {
        // Skip frame if detector is busy
      }
    }

    if ('requestVideoFrameCallback' in this.videoElement) {
      this.videoElement.requestVideoFrameCallback(() => this.processVideoFrame());
    } else {
      requestAnimationFrame(() => this.processVideoFrame());
    }
  }

  handleResults(results) {
    if (!this.canvasCtx) return;

    // Clear canvas
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      this.lastDetectedTime = performance.now();

      // Render hand skeleton overlay if enabled
      if (this.showOverlay) {
        this.drawHandOverlay(landmarks);
      }

      // Analyze finger states & gesture
      const analysis = this.analyzeHandPose(landmarks);
      this.processGesture(analysis);
    } else {
      // No hand detected
      if (performance.now() - this.lastDetectedTime > 800) {
        this.onTelemetry({
          detected: false,
          state: 'NO_HAND',
          openness: 0,
          fingers: { thumb: false, index: false, middle: false, ring: false, pinky: false },
          fps: this.fps
        });
      }
    }

    this.canvasCtx.restore();
  }

  /**
   * Evaluates hand landmarks geometry to determine finger extension and openness
   */
  analyzeHandPose(landmarks) {
    const wrist = landmarks[0];
    const palmCenter = {
      x: (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3,
      y: (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3,
      z: ((landmarks[0].z || 0) + (landmarks[5].z || 0) + (landmarks[17].z || 0)) / 3
    };

    // Euclidean distance
    const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);

    // Palm scale factor for normalization
    const palmScale = Math.max(dist(wrist, landmarks[9]), 0.05);

    // Evaluate 4 long fingers
    const checkFinger = (tipIdx, pipIdx, mcpIdx) => {
      const tipDist = dist(landmarks[tipIdx], wrist);
      const pipDist = dist(landmarks[pipIdx], wrist);
      const tipToMcp = dist(landmarks[tipIdx], landmarks[mcpIdx]);

      const extensionRatio = Math.min(Math.max((tipDist - pipDist) / (palmScale * 0.7), 0), 1);
      const isExtended = tipDist > pipDist * 1.12 && tipToMcp > palmScale * 0.6;
      return { isExtended, ratio: extensionRatio };
    };

    const indexState = checkFinger(8, 6, 5);
    const middleState = checkFinger(12, 10, 9);
    const ringState = checkFinger(16, 14, 13);
    const pinkyState = checkFinger(20, 18, 17);

    // Thumb check
    const thumbTip = landmarks[4];
    const thumbMcp = landmarks[2];
    const thumbDistToPinky = dist(thumbTip, landmarks[17]);
    const thumbMcpToPinky = dist(thumbMcp, landmarks[17]);
    const thumbDistToWrist = dist(thumbTip, wrist);
    const thumbRatio = Math.min(Math.max((thumbDistToPinky - thumbMcpToPinky * 0.8) / palmScale, 0), 1);
    const isThumbExtended = thumbDistToPinky > thumbMcpToPinky * 1.15 && thumbDistToWrist > palmScale * 0.75;

    const fingers = {
      thumb: isThumbExtended,
      index: indexState.isExtended,
      middle: middleState.isExtended,
      ring: ringState.isExtended,
      pinky: pinkyState.isExtended
    };

    const extendedCount = (isThumbExtended ? 1 : 0) +
                          (indexState.isExtended ? 1 : 0) +
                          (middleState.isExtended ? 1 : 0) +
                          (ringState.isExtended ? 1 : 0) +
                          (pinkyState.isExtended ? 1 : 0);

    const continuousOpenness = (
      thumbRatio * 0.15 +
      indexState.ratio * 0.25 +
      middleState.ratio * 0.25 +
      ringState.ratio * 0.2 +
      pinkyState.ratio * 0.15
    );

    return {
      detected: true,
      palmCenter,
      fingers,
      extendedCount,
      openness: Math.round(continuousOpenness * 100),
      rawOpenness: continuousOpenness
    };
  }

  /**
   * Applies debouncing/hysteresis filter to eliminate erratic flickering.
   * Also triggers mobile haptic vibration!
   */
  processGesture(analysis) {
    this.historyBuffer.push(analysis.extendedCount);
    if (this.historyBuffer.length > this.bufferSize) {
      this.historyBuffer.shift();
    }

    const avgCount = this.historyBuffer.reduce((a, b) => a + b, 0) / this.historyBuffer.length;

    const openThreshold = 3.6 - (this.sensitivity - 0.5) * 1.2;
    const closeThreshold = 1.6 + (this.sensitivity - 0.5) * 1.0;

    let detectedGesture = this.currentGesture;

    if (avgCount >= openThreshold && analysis.extendedCount >= 3) {
      detectedGesture = 'OPEN_PALM';
    } else if (avgCount <= closeThreshold && analysis.extendedCount <= 1) {
      detectedGesture = 'CLOSED_PALM';
    }

    // Fire state change event and vibrate mobile device
    if (detectedGesture && detectedGesture !== this.currentGesture) {
      this.currentGesture = detectedGesture;

      // Mobile Haptic Vibration Pulse
      if (typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(40);
        } catch (e) {}
      }

      this.onGestureChange(this.currentGesture);
    }

    // Emit live telemetry
    this.onTelemetry({
      detected: true,
      state: this.currentGesture || (analysis.extendedCount >= 3 ? 'OPEN_PALM' : 'CLOSED_PALM'),
      openness: analysis.openness,
      extendedCount: analysis.extendedCount,
      fingers: analysis.fingers,
      fps: this.fps,
      palmCenter: analysis.palmCenter
    });
  }

  /**
   * Futuristic cyber hand skeleton visualizer
   */
  drawHandOverlay(landmarks) {
    const ctx = this.canvasCtx;
    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    const CONNECTIONS = [
      [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8],       // Index
      [5, 9], [9, 10], [10, 11], [11, 12],   // Middle
      [9, 13], [13, 14], [14, 15], [15, 16],// Ring
      [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
      [0, 17]                               // Palm base
    ];

    const isPalmOpen = this.currentGesture === 'OPEN_PALM';
    const strokeColor = isPalmOpen ? '#10b981' : '#f43f5e';
    const jointColor = isPalmOpen ? '#6ee7b7' : '#fda4af';

    // 1. Draw glowing bones
    ctx.lineWidth = 3;
    ctx.strokeStyle = strokeColor;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 10;
    ctx.lineCap = 'round';

    CONNECTIONS.forEach(([startIdx, endIdx]) => {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];
      ctx.beginPath();
      ctx.moveTo(p1.x * w, p1.y * h);
      ctx.lineTo(p2.x * w, p2.y * h);
      ctx.stroke();
    });

    // 2. Draw glowing joints
    landmarks.forEach((p, idx) => {
      const isTip = [4, 8, 12, 16, 20].includes(idx);
      const radius = isTip ? 6 : 3.5;

      ctx.beginPath();
      ctx.arc(p.x * w, p.y * h, radius, 0, 2 * Math.PI);
      ctx.fillStyle = isTip ? '#ffffff' : jointColor;
      ctx.shadowColor = isTip ? '#00f2fe' : strokeColor;
      ctx.shadowBlur = isTip ? 14 : 6;
      ctx.fill();
    });

    ctx.shadowBlur = 0;
  }

  setSensitivity(val) {
    this.sensitivity = Math.min(Math.max(val / 100, 0.1), 0.9);
  }

  toggleOverlay() {
    this.showOverlay = !this.showOverlay;
    return this.showOverlay;
  }

  simulateToggle() {
    this.isSimulation = true;
    this.simulationState = this.simulationState === 'OPEN_PALM' ? 'CLOSED_PALM' : 'OPEN_PALM';
    this.currentGesture = this.simulationState;

    const isOpen = this.simulationState === 'OPEN_PALM';
    
    // Haptic vibration in simulation too
    if (typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(35); } catch (e) {}
    }

    this.onGestureChange(this.currentGesture);

    this.onTelemetry({
      detected: true,
      state: this.currentGesture,
      openness: isOpen ? 95 : 12,
      extendedCount: isOpen ? 5 : 0,
      fingers: {
        thumb: isOpen,
        index: isOpen,
        middle: isOpen,
        ring: isOpen,
        pinky: isOpen
      },
      fps: 60,
      isSimulated: true
    });

    return this.simulationState;
  }
}

window.LuminaHandDetector = LuminaHandDetector;
