/**
 * Lumina Master Application Controller
 * Multi-device compatible: Mobile smartphones, Tablets, and Desktop PCs.
 * Connects Camera Vision, AI Hand Detection, Lighting Renderer, and Audio Feedback.
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Instantiate core components
  const lamp = new LuminaLampRenderer();
  lamp.init();

  // Elements
  const videoElement = document.getElementById('webcamVideo');
  const canvasElement = document.getElementById('handCanvas');
  const startCameraBtn = document.getElementById('startCameraBtn');
  const demoModeBtn = document.getElementById('demoModeBtn');
  const cameraPromptOverlay = document.getElementById('cameraPromptOverlay');
  const cameraPromptMsg = document.getElementById('cameraPromptMsg');
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const fpsBadge = document.getElementById('fpsBadge');
  const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');
  const flipCameraBtn = document.getElementById('flipCameraBtn');
  const toggleMirrorBtn = document.getElementById('toggleMirrorBtn');
  const soundToggleBtn = document.getElementById('soundToggleBtn');
  const soundIconOn = document.getElementById('soundIconOn');
  const soundIconOff = document.getElementById('soundIconOff');
  const helpModalBtn = document.getElementById('helpModalBtn');
  const helpModal = document.getElementById('helpModal');
  const closeHelpModalBtn = document.getElementById('closeHelpModalBtn');
  const gotItBtn = document.getElementById('gotItBtn');
  const connectModalBtn = document.getElementById('connectModalBtn');
  const connectModal = document.getElementById('connectModal');
  const closeConnectModalBtn = document.getElementById('closeConnectModalBtn');
  const closeConnectDoneBtn = document.getElementById('closeConnectDoneBtn');
  const sensitivityRange = document.getElementById('sensitivityRange');
  const sensitivityDisplay = document.getElementById('sensitivityDisplay');
  const toastContainer = document.getElementById('toastContainer');
  const qrCodeImg = document.getElementById('qrCodeImg');
  const httpsNetworkUrl = document.getElementById('httpsNetworkUrl');
  const httpNetworkUrl = document.getElementById('httpNetworkUrl');
  const insecureBanner = document.getElementById('insecureBanner');
  const insecureSwitchHttpsLink = document.getElementById('insecureSwitchHttpsLink');
  const closeInsecureBannerBtn = document.getElementById('closeInsecureBannerBtn');

  // Mobile Floating Status
  const mobileStateText = document.getElementById('mobileStateText');
  const mobileGesturePill = document.getElementById('mobileGesturePill');

  // Telemetry elements
  const handStateValue = document.getElementById('handStateValue');
  const opennessValue = document.getElementById('opennessValue');
  const opennessMeterFill = document.getElementById('opennessMeterFill');
  const gestureReticle = document.getElementById('gestureReticle');
  const reticleLabel = document.getElementById('reticleLabel');

  const fingerElements = {
    thumb: document.getElementById('fingerThumb'),
    index: document.getElementById('fingerIndex'),
    middle: document.getElementById('fingerMiddle'),
    ring: document.getElementById('fingerRing'),
    pinky: document.getElementById('fingerPinky')
  };

  // Toast Notification Helper
  function showToast(message, emoji = '✨') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${emoji}</span> <span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px) scale(0.95)';
      setTimeout(() => toast.remove(), 400);
    }, 2400);
  }

  // System Status Pill updater
  function updateSystemStatus(type, message) {
    if (!statusIndicator || !statusText) return;
    statusIndicator.className = 'status-indicator';
    if (type === 'ready') statusIndicator.classList.add('ready');
    else if (type === 'error') statusIndicator.classList.add('error');
    statusText.textContent = message;
  }

  // Insecure context detection (mobile device over non-localhost HTTP)
  if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    if (insecureBanner) {
      insecureBanner.classList.remove('hidden');
      const targetHttps = `https://${location.hostname}:8443`;
      if (insecureSwitchHttpsLink) {
        insecureSwitchHttpsLink.href = targetHttps;
      }
    }
  }

  if (closeInsecureBannerBtn) {
    closeInsecureBannerBtn.addEventListener('click', () => {
      insecureBanner.classList.add('hidden');
    });
  }

  // Multi-Device Network URLs setup for Connect Modal
  const globalUrlStr = 'https://des-templates-labour-sally.trycloudflare.com';
  const httpUrlStr = `http://${location.hostname === 'localhost' ? '10.150.195.54' : location.hostname}:8080`;
  const globalNetworkUrl = document.getElementById('globalNetworkUrl');

  if (globalNetworkUrl) globalNetworkUrl.textContent = globalUrlStr;
  if (httpNetworkUrl) httpNetworkUrl.textContent = httpUrlStr;

  // Generate dynamic QR code targeting the universal global link
  if (qrCodeImg) {
    qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(globalUrlStr)}`;
  }

  // Copy Link Buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        navigator.clipboard.writeText(targetEl.textContent).then(() => {
          const originalText = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = originalText; }, 1800);
          showToast('Link copied to clipboard', '📋');
        });
      }
    });
  });

  // Mobile View Nav Segmented Control (Dual View / Lamp / Camera)
  const segmentBtns = document.querySelectorAll('.segment-btn');
  segmentBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const viewMode = btn.dataset.view;
      segmentBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.body.classList.remove('view-split', 'view-lamp', 'view-vision');
      document.body.classList.add(`view-${viewMode}`);
      showToast(`Switched to ${btn.textContent.trim()}`, '📱');
    });
  });

  // Initialize Hand Detector
  const detector = new LuminaHandDetector({
    videoElement,
    canvasElement,
    onStatusChange: (type, msg) => {
      updateSystemStatus(type, msg);
    },
    onGestureChange: (gesture) => {
      if (gesture === 'OPEN_PALM') {
        lamp.setLightState(true, true, 'gesture');
        showToast('Open Palm: Light ON', '💡');
        if (mobileStateText) mobileStateText.textContent = 'Light: ON 💡';
        if (mobileGesturePill) {
          mobileGesturePill.textContent = 'Open Palm 🖐️';
          mobileGesturePill.style.color = '#10b981';
        }
      } else if (gesture === 'CLOSED_PALM') {
        lamp.setLightState(false, true, 'gesture');
        showToast('Fist / Closed Palm: Light OFF', '🌑');
        if (mobileStateText) mobileStateText.textContent = 'Light: OFF 🌑';
        if (mobileGesturePill) {
          mobileGesturePill.textContent = 'Fist ✊';
          mobileGesturePill.style.color = '#f43f5e';
        }
      }
    },
    onTelemetry: (data) => {
      // 1. Update FPS
      if (fpsBadge) {
        fpsBadge.textContent = `${data.fps || 0} FPS`;
      }

      // 2. Update Finger indicators
      if (data.fingers) {
        Object.keys(fingerElements).forEach((key) => {
          const el = fingerElements[key];
          if (el) {
            if (data.fingers[key]) {
              el.classList.add('extended');
            } else {
              el.classList.remove('extended');
            }
          }
        });
      }

      // 3. Update Openness Meter
      const openness = data.detected ? data.openness : 0;
      if (opennessValue) opennessValue.textContent = `${openness}%`;
      if (opennessMeterFill) opennessMeterFill.style.width = `${openness}%`;

      // 4. Update Reticle & Hand State Label
      if (data.detected) {
        gestureReticle.classList.add('active');
        if (data.state === 'OPEN_PALM') {
          gestureReticle.classList.add('open');
          gestureReticle.classList.remove('closed');
          if (reticleLabel) reticleLabel.textContent = 'OPEN PALM (ON)';
          if (handStateValue) {
            handStateValue.textContent = 'Open Palm 🖐️';
            handStateValue.style.color = '#10b981';
          }
          if (mobileGesturePill) {
            mobileGesturePill.textContent = 'Open Palm 🖐️';
            mobileGesturePill.style.color = '#10b981';
          }
        } else if (data.state === 'CLOSED_PALM') {
          gestureReticle.classList.add('closed');
          gestureReticle.classList.remove('open');
          if (reticleLabel) reticleLabel.textContent = 'CLOSED FIST (OFF)';
          if (handStateValue) {
            handStateValue.textContent = 'Closed Fist ✊';
            handStateValue.style.color = '#f43f5e';
          }
          if (mobileGesturePill) {
            mobileGesturePill.textContent = 'Fist ✊';
            mobileGesturePill.style.color = '#f43f5e';
          }
        }
      } else {
        gestureReticle.classList.remove('active', 'open', 'closed');
        if (reticleLabel) reticleLabel.textContent = 'NO HAND';
        if (handStateValue) {
          handStateValue.textContent = 'Searching Hand...';
          handStateValue.style.color = '#8b9bb4';
        }
        if (mobileGesturePill) {
          mobileGesturePill.textContent = 'Waiting Hand';
          mobileGesturePill.style.color = '#8b9bb4';
        }
      }
    }
  });

  // Attempt to start camera
  async function activateCamera() {
    try {
      startCameraBtn.disabled = true;
      startCameraBtn.textContent = 'Starting Camera...';

      if (!detector.hands) {
        await detector.initialize();
      }

      await detector.startCamera();
      cameraPromptOverlay.style.opacity = '0';
      setTimeout(() => {
        cameraPromptOverlay.style.display = 'none';
      }, 350);

      showToast('Vision Active: Show palm to control light', '🖐️');
    } catch (err) {
      console.warn('Auto camera start prevented or failed:', err);
      startCameraBtn.disabled = false;
      startCameraBtn.innerHTML = '<span class="btn-icon">⚡</span> Allow Camera Access';
      
      if (!window.isSecureContext && location.hostname !== 'localhost') {
        cameraPromptMsg.innerHTML = '🔒 Mobile camera requires <strong>HTTPS</strong>. Please open <a href="' + httpsUrlStr + '" style="color:#00f2fe; text-decoration:underline;">' + httpsUrlStr + '</a>.';
      } else {
        cameraPromptMsg.textContent = 'Camera permission required. Please click below and allow camera in your browser.';
      }
    }
  }

  // Flip Camera Button (Front vs Rear for mobile)
  if (flipCameraBtn) {
    flipCameraBtn.addEventListener('click', async () => {
      try {
        await detector.flipCamera();
        const mode = detector.facingMode === 'user' ? 'Front Camera' : 'Rear Camera';
        showToast(`Switched to ${mode}`, '🔄');
      } catch (e) {
        showToast('Camera switch failed or single camera device', '⚠️');
      }
    });
  }

  // Toggle Mirror Button
  if (toggleMirrorBtn) {
    toggleMirrorBtn.addEventListener('click', () => {
      const isMirrored = detector.toggleMirror();
      toggleMirrorBtn.classList.toggle('active', isMirrored);
      showToast(isMirrored ? 'Video: Mirrored' : 'Video: Natural View', '🪞');
    });
  }

  // Camera start button click
  startCameraBtn.addEventListener('click', () => {
    if (window.luminaAudio) window.luminaAudio.init();
    activateCamera();
  });

  // Demo Simulation mode button click
  demoModeBtn.addEventListener('click', () => {
    if (window.luminaAudio) window.luminaAudio.init();
    cameraPromptOverlay.style.display = 'none';
    const newState = detector.simulateToggle();
    showToast(`Simulated: ${newState === 'OPEN_PALM' ? 'Open Palm (ON)' : 'Fist (OFF)'}`, '⚡');
  });

  // Skeleton overlay toggle button
  toggleOverlayBtn.addEventListener('click', () => {
    const isShowing = detector.toggleOverlay();
    toggleOverlayBtn.classList.toggle('active', isShowing);
    showToast(isShowing ? 'Skeleton: Visible' : 'Skeleton: Hidden', '👁️');
  });

  // Sensitivity Slider
  sensitivityRange.addEventListener('input', (e) => {
    const val = parseInt(e.target.value, 10);
    detector.setSensitivity(val);
    let label = 'Balanced';
    if (val < 40) label = 'Relaxed (Easy)';
    else if (val > 60) label = 'Strict (High Precision)';
    sensitivityDisplay.textContent = label;
  });

  // Sound Mute Toggle
  soundToggleBtn.addEventListener('click', () => {
    if (window.luminaAudio) {
      const isMuted = window.luminaAudio.toggleMute();
      soundIconOn.classList.toggle('hidden', isMuted);
      soundIconOff.classList.toggle('hidden', !isMuted);
      showToast(isMuted ? 'Sound Muted' : 'Sound Enabled', isMuted ? '🔇' : '🔊');
    }
  });

  // Connect Phone Modal Dialog
  connectModalBtn.addEventListener('click', () => {
    connectModal.showModal();
  });
  closeConnectModalBtn.addEventListener('click', () => {
    connectModal.close();
  });
  closeConnectDoneBtn.addEventListener('click', () => {
    connectModal.close();
  });
  connectModal.addEventListener('click', (e) => {
    if (e.target === connectModal) connectModal.close();
  });

  // Help Modal Dialog
  helpModalBtn.addEventListener('click', () => {
    helpModal.showModal();
  });
  closeHelpModalBtn.addEventListener('click', () => {
    helpModal.close();
  });
  gotItBtn.addEventListener('click', () => {
    helpModal.close();
  });
  helpModal.addEventListener('click', (e) => {
    if (e.target === helpModal) helpModal.close();
  });

  // Keyboard Shortcuts (Space to toggle demo, S for sound)
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && e.target === document.body) {
      e.preventDefault();
      detector.simulateToggle();
    }
  });

  // Auto-launch camera
  try {
    await detector.initialize();
    await activateCamera();
  } catch (e) {
    console.log('User gesture may be required by browser for camera startup');
  }
});
