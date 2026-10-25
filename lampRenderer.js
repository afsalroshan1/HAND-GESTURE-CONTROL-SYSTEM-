/**
 * Lumina Realistic Lighting Renderer
 * Manages volumetric lighting effects, color temperature themes,
 * physical switch state, and lamp filament animation.
 */
class LuminaLampRenderer {
  constructor() {
    this.body = document.body;
    this.isOn = false;
    this.intensity = 1.0;
    this.currentTheme = 'warm';

    // UI Elements
    this.stateBadge = document.getElementById('lightStateBadge');
    this.stateLabel = document.getElementById('stateLabel');
    this.stateIcon = document.getElementById('stateIcon');
    this.stateHint = document.getElementById('stateHint');
    this.manualToggle = document.getElementById('manualToggleSwitch');
    this.brightnessRange = document.getElementById('brightnessRange');
    this.brightnessDisplay = document.getElementById('brightnessDisplay');
    this.lampGlobe = document.getElementById('lampGlobe');

    // Theme Palettes
    this.themes = {
      warm: {
        name: 'Edison Warm',
        core: '#ffffff',
        mid: '#ffe0a3',
        glow: '#ff9d2e',
        ambient: 'rgba(255, 157, 46, 0.35)',
        coneOpacity: 0.85
      },
      cyber: {
        name: 'Cyber Cyan',
        core: '#ffffff',
        mid: '#b5f5ff',
        glow: '#00f2fe',
        ambient: 'rgba(0, 242, 254, 0.32)',
        coneOpacity: 0.8
      },
      sunset: {
        name: 'Neon Sunset',
        core: '#ffffff',
        mid: '#ffb3e1',
        glow: '#ff79c6',
        ambient: 'rgba(255, 121, 198, 0.32)',
        coneOpacity: 0.85
      },
      emerald: {
        name: 'Emerald Auric',
        core: '#ffffff',
        mid: '#99ffb4',
        glow: '#50fa7b',
        ambient: 'rgba(80, 250, 123, 0.30)',
        coneOpacity: 0.8
      },
      pure: {
        name: 'Pure Studio',
        core: '#ffffff',
        mid: '#ffffff',
        glow: '#e2e8f0',
        ambient: 'rgba(226, 232, 240, 0.28)',
        coneOpacity: 0.75
      }
    };
  }

  init() {
    // Set initial theme
    this.setTheme('warm');
    this.setIntensity(1.0);
    this.setLightState(false, false); // Initial OFF state

    // Click lamp directly to toggle
    if (this.lampGlobe) {
      this.lampGlobe.addEventListener('click', () => {
        this.toggleLight('manual');
      });
    }

    // Manual rocker switch listener
    if (this.manualToggle) {
      this.manualToggle.addEventListener('change', (e) => {
        this.setLightState(e.target.checked, true, 'manual');
      });
    }

    // Brightness range listener
    if (this.brightnessRange) {
      this.brightnessRange.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.setIntensity(val / 100);
      });
    }

    // Theme chips
    const themeChips = document.querySelectorAll('.theme-chip');
    themeChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const theme = chip.dataset.temp;
        if (theme) {
          themeChips.forEach((c) => c.classList.remove('active'));
          chip.classList.add('active');
          this.setTheme(theme);
        }
      });
    });
  }

  setTheme(themeKey) {
    const theme = this.themes[themeKey];
    if (!theme) return;
    this.currentTheme = themeKey;

    const root = document.documentElement;
    root.style.setProperty('--light-color-core', theme.core);
    root.style.setProperty('--light-color-mid', theme.mid);
    root.style.setProperty('--light-color-glow', theme.glow);
    root.style.setProperty('--light-color-ambient', theme.ambient);
    root.style.setProperty('--light-cone-opacity', theme.coneOpacity);
  }

  setIntensity(factor) {
    this.intensity = Math.max(0.15, Math.min(1.0, factor));
    document.documentElement.style.setProperty('--intensity', this.intensity);
    if (this.brightnessDisplay) {
      this.brightnessDisplay.textContent = `${Math.round(this.intensity * 100)}%`;
    }
  }

  /**
   * Main light switch handler
   * @param {boolean} turnOn 
   * @param {boolean} playSound 
   * @param {string} triggerSource - 'gesture' | 'manual'
   */
  setLightState(turnOn, playSound = true, triggerSource = 'gesture') {
    if (this.isOn === turnOn && document.body.classList.contains(turnOn ? 'light-on' : 'light-off')) {
      return;
    }

    this.isOn = turnOn;

    if (this.isOn) {
      this.body.classList.remove('light-off');
      this.body.classList.add('light-on');

      if (this.stateLabel) this.stateLabel.textContent = 'LIGHT IS ON';
      if (this.stateIcon) this.stateIcon.textContent = '💡';
      if (this.stateHint) {
        this.stateHint.textContent = triggerSource === 'gesture' 
          ? 'Activated by Open Palm! Clench fist to turn OFF.'
          : 'Light active. Clench fist into a ball to turn OFF.';
      }
      if (this.manualToggle) this.manualToggle.checked = true;

      if (playSound && window.luminaAudio) {
        window.luminaAudio.playSwitchOn();
      }
    } else {
      this.body.classList.remove('light-on');
      this.body.classList.add('light-off');

      if (this.stateLabel) this.stateLabel.textContent = 'LIGHT IS OFF';
      if (this.stateIcon) this.stateIcon.textContent = '🌑';
      if (this.stateHint) {
        this.stateHint.textContent = triggerSource === 'gesture'
          ? 'Deactivated by Closed Palm! Open your hand to turn ON.'
          : 'Light standby. Show your open palm to turn ON.';
      }
      if (this.manualToggle) this.manualToggle.checked = false;

      if (playSound && window.luminaAudio) {
        window.luminaAudio.playSwitchOff();
      }
    }
  }

  toggleLight(triggerSource = 'manual') {
    this.setLightState(!this.isOn, true, triggerSource);
  }
}

window.LuminaLampRenderer = LuminaLampRenderer;
