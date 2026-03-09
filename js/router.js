/**
 * Router - Screen navigation management
 */

import { UI } from './ui.js';

export class Router {
  constructor() {
    this.currentScreen = null;
    this.screens = {};
    this.init();
  }

  init() {
    // Register all screens
    document.querySelectorAll('.screen').forEach(screen => {
      this.screens[screen.id] = screen;
    });
  }

  show(screenId, params = {}) {
    // Hide current screen
    if (this.currentScreen) {
      this.screens[this.currentScreen]?.classList.remove('active');
    }

    // Show new screen
    this.currentScreen = screenId;
    
    if (this.screens[screenId]) {
      this.screens[screenId].classList.add('active');
    } else {
      // Screen not found, render it
      this.renderScreen(screenId, params);
    }

    // Update URL
    const url = new URL(window.location);
    url.searchParams.set('screen', screenId);
    window.history.pushState({}, '', url);

    // Emit screen change event
    window.dispatchEvent(new CustomEvent('screenchange', { detail: { screen: screenId, params } }));
  }

  renderScreen(screenId, params = {}) {
    const app = document.getElementById('app');
    
    switch (screenId) {
      case 'onboarding':
        app.innerHTML = this.renderOnboarding();
        break;
      case 'home':
        app.innerHTML = this.renderHome();
        break;
      case 'alarm':
        app.innerHTML = this.renderAlarm();
        break;
      case 'verify':
        app.innerHTML = this.renderVerify(params);
        break;
      case 'calibration':
        app.innerHTML = this.renderCalibration();
        break;
      case 'settings':
        app.innerHTML = this.renderSettings();
        break;
      case 'success':
        app.innerHTML = this.renderSuccess();
        break;
      default:
        app.innerHTML = '<div class="screen"><p>Screen not found</p></div>';
    }

    const screen = document.getElementById(screenId);
    if (screen) {
      this.screens[screenId] = screen;
      screen.classList.add('active');
    }
  }

  renderOnboarding() {
    return `
      <div id="onboarding" class="screen active">
        <div class="onboarding-slide">
          <div class="icon">⏰</div>
          <h2>Wake Up for Fajr</h2>
          <p>Fajr Alarm helps you wake up for Fajr prayer with a gentle reminder and mandatory exercise to ensure you're fully awake.</p>
        </div>
        
        <div class="onboarding-dots">
          <div class="dot active"></div>
          <div class="dot"></div>
          <div class="dot"></div>
        </div>

        <div class="permission-card" id="location-permission">
          <div class="icon">📍</div>
          <h3>Location Access</h3>
          <p>We need your location to calculate accurate Fajr prayer times for your area.</p>
          <button class="btn btn-primary" onclick="app.requestLocation()">Enable Location</button>
        </div>

        <div class="permission-card hidden" id="notification-permission">
          <div class="icon">🔔</div>
          <h3>Notifications</h3>
          <p>Get notified when it's time for Fajr, even if the app is closed.</p>
          <button class="btn btn-primary" onclick="app.requestNotification()">Enable Notifications</button>
        </div>

        <div class="permission-card hidden" id="camera-permission">
          <div class="icon">📷</div>
          <h3>Camera Access</h3>
          <p>Camera is used to verify your sit-ups. All processing happens on-device.</p>
          <button class="btn btn-accent" onclick="app.requestCamera()">Enable Camera</button>
        </div>

        <button class="btn btn-primary hidden" id="complete-onboarding" onclick="app.completeOnboarding()">
          Get Started
        </button>
      </div>
    `;
  }

  renderHome() {
    return `
      <div id="home" class="screen active">
        <div class="header">
          <div class="logo">🕌</div>
          <h1>Fajr Alarm</h1>
          <p class="text-muted" id="location-display">Loading location...</p>
        </div>

        <div class="card">
          <div class="time-display">
            <div class="label">Next Fajr</div>
            <div class="time" id="fajr-time">--:--</div>
            <div class="countdown" id="countdown">--:--:--</div>
          </div>
        </div>

        <div class="card">
          <div class="text-center">
            <p class="text-muted mb-1">Today's Date</p>
            <h3 id="current-date">Loading...</h3>
          </div>
        </div>

        <div class="card card-elevated">
          <h3>Quick Actions</h3>
          <button class="btn btn-outline" data-nav="calibration">📷 Recalibrate Pose</button>
          <button class="btn btn-outline" data-nav="settings">⚙️ Settings</button>
        </div>

        <nav class="nav-bar">
          <button class="active" data-nav="home">
            <span class="icon">🏠</span>
            Home
          </button>
          <button data-nav="settings">
            <span class="icon">⚙️</span>
            Settings
          </button>
        </nav>
      </div>
    `;
  }

  renderAlarm() {
    return `
      <div id="alarm" class="alarm-screen active">
        <div class="icon" style="font-size: 5rem;">⏰</div>
        <h1>Time for Fajr!</h1>
        <div class="time" id="alarm-time">--:--</div>
        <p class="message">Complete 10 sit-ups to dismiss the alarm</p>
        
        <button class="btn btn-accent btn-large" onclick="app.router.show('verify')">
          Start Verification
        </button>
        
        <button class="btn btn-outline" onclick="app.snoozeAlarm()">
          Snooze 5 minutes
        </button>
      </div>
    `;
  }

  renderVerify(params = {}) {
    const reps = params.reps || 0;
    const target = params.target || 10;
    const progress = (reps / target) * 100;
    const circumference = 2 * Math.PI * 90;
    
    return `
      <div id="verify" class="screen active">
        <div class="header">
          <h1>Verify Sit-ups</h1>
          <p class="text-muted">Complete ${target} sit-ups to dismiss the alarm</p>
        </div>

        <div class="progress-ring">
          <svg width="200" height="200">
            <circle class="bg" cx="100" cy="100" r="90"></circle>
            <circle class="progress" cx="100" cy="100" r="90" 
              stroke-dasharray="${circumference}" 
              stroke-dashoffset="${circumference - (progress / 100) * circumference}">
            </circle>
          </svg>
          <div class="text">${reps}/${target}</div>
        </div>

        <div class="camera-container" id="camera-container">
          <video id="pose-video" playsinline autoplay muted></video>
          <canvas id="pose-canvas"></canvas>
          <div class="camera-overlay">
            <span class="rep-count" id="rep-display">${reps}</span>
            <span class="text-sm text-muted">sit-ups</span>
          </div>
          <div class="camera-status" id="camera-status">Initializing camera...</div>
        </div>

        <div class="text-center mt-auto">
          <p class="text-muted text-sm">
            📷 Position your camera to see your upper body<br>
            Lie on your back and perform sit-ups
          </p>
        </div>

        <button class="btn btn-danger" onclick="app.cancelVerification()">
          Cancel
        </button>
      </div>
    `;
  }

  renderCalibration() {
    return `
      <div id="calibration" class="screen active">
        <div class="header">
          <h1>Calibrate Camera</h1>
          <p class="text-muted">Set up your camera for sit-up detection</p>
        </div>

        <div class="camera-container" id="calib-camera">
          <video id="calib-video" playsinline autoplay muted></video>
          <canvas id="calib-canvas"></canvas>
        </div>

        <div class="card">
          <h3>Instructions</h3>
          <ol style="padding-left: 20px; color: var(--text-dim);">
            <li class="mb-1">Lie on your back in your usual sleeping position</li>
            <li class="mb-1">Hold your phone so the camera sees your upper body</li>
            <li class="mb-1">Make sure your shoulders and hips are visible</li>
            <li>Stay still for 3 seconds to calibrate</li>
          </ol>
        </div>

        <button class="btn btn-accent" onclick="app.startCalibration()">
          Start Calibration
        </button>

        <button class="btn btn-outline" data-nav="home">
          Skip
        </button>
      </div>
    `;
  }

  renderSettings() {
    return `
      <div id="settings" class="screen active">
        <div class="header">
          <h1>Settings</h1>
        </div>

        <div class="card">
          <ul class="settings-list">
            <li>
              <span class="label">Location</span>
              <span class="value" id="setting-location">Auto (Moscow)</span>
            </li>
            <li>
              <span class="label">Calculation Method</span>
              <select id="calc-method" onchange="app.updateSetting('method', this.value)">
                <option value="2">ISNA (North America)</option>
                <option value="1">Muslim World League</option>
                <option value="4">Umm Al-Qura</option>
                <option value="5">Egyptian General Authority</option>
              </select>
            </li>
            <li>
              <span class="label">Alarm Sound</span>
              <select id="alarm-sound" onchange="app.updateSetting('sound', this.value)">
                <option value="default">Default</option>
                <option value="gentle">Gentle</option>
                <option value="adhān">Adhan</option>
              </select>
            </li>
            <li>
              <span class="label">Snooze Duration</span>
              <select id="snooze-duration" onchange="app.updateSetting('snooze', this.value)">
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
              </select>
            </li>
            <li>
              <span class="label">Required Sit-ups</span>
              <select id="situp-count" onchange="app.updateSetting('situps', this.value)">
                <option value="5">5</option>
                <option value="10">10</option>
                <option value="15">15</option>
                <option value="20">20</option>
              </select>
            </li>
          </ul>
        </div>

        <div class="card">
          <h3>Permissions</h3>
          <ul class="settings-list">
            <li>
              <span class="label">📍 Location</span>
              <span class="value" id="perm-location">Checking...</span>
            </li>
            <li>
              <span class="label">🔔 Notifications</span>
              <span class="value" id="perm-notification">Checking...</span>
            </li>
            <li>
              <span class="label">📷 Camera</span>
              <span class="value" id="perm-camera">Checking...</span>
            </li>
          </ul>
        </div>

        <div class="card">
          <h3>About</h3>
          <p class="text-muted">Fajr Alarm v1.0.0</p>
          <p class="text-muted text-sm">Built with MediaPipe Pose Detection</p>
        </div>

        <button class="btn btn-outline" data-nav="home">
          Back to Home
        </button>
      </div>
    `;
  }

  renderSuccess() {
    return `
      <div id="success" class="screen active">
        <div class="onboarding-slide">
          <div class="success-checkmark">
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="25" stroke-width="2"/>
              <path d="M14 27 l8 8 l16 -16" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <h1>SubhanAllah!</h1>
          <p>You completed your sit-ups and woke up for Fajr! May Allah accept your effort.</p>
          
          <div class="card">
            <p class="text-center text-accent">🌙 Fajr prayer is now</p>
          </div>

          <button class="btn btn-primary" data-nav="home">
            Done
          </button>
        </div>
      </div>
    `;
  }
}
