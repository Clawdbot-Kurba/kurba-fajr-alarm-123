/**
 * Alarm - Alarm management and triggering
 */

export class Alarm {
  constructor(storage) {
    this.storage = storage;
    this.isPlaying = false;
    this.audio = null;
    this.snoozeTimeout = null;
  }

  async trigger() {
    // Show alarm screen
    if (window.app?.router) {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      
      // Render alarm screen with current time
      document.getElementById('app').innerHTML = `
        <div id="alarm" class="alarm-screen active">
          <div class="icon" style="font-size: 5rem;">⏰</div>
          <h1>Time for Fajr!</h1>
          <div class="time">${timeStr}</div>
          <p class="message">Complete ${this.storage.getSettings().situps} sit-ups to dismiss the alarm</p>
          
          <button class="btn btn-accent btn-large" onclick="app.router.show('verify', {reps: 0, target: ${this.storage.getSettings().situps}})">
            Start Verification
          </button>
          
          <button class="btn btn-outline" onclick="app.snoozeAlarm()">
            Snooze ${this.storage.getSettings().snooze} minutes
          </button>
        </div>
      `;
    }
    
    // Play alarm sound
    await this.playSound();
    
    // Request fullscreen
    this.requestFullscreen();
    
    // Vibrate
    if (navigator.vibrate) {
      navigator.vibrate([500, 200, 500, 200, 500]);
    }
  }

  async playSound() {
    try {
      // Create audio context
      this.audio = new Audio();
      this.audio.loop = true;
      
      // Try to use a bundled alarm sound or generate one
      // For MVP, we'll use the Web Audio API to generate a tone
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Create oscillator for alarm sound
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
      
      // Modulate frequency for alarm effect
      oscillator.frequency.linearRampToValueAtTime(880, audioContext.currentTime + 0.5);
      oscillator.frequency.linearRampToValueAtTime(440, audioContext.currentTime + 1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      
      oscillator.start(audioContext.currentTime);
      
      // Store for stopping later
      this.oscillator = oscillator;
      this.audioContext = audioContext;
      this.gainNode = gainNode;
      this.isPlaying = true;
      
    } catch (e) {
      console.error('Failed to play alarm:', e);
    }
  }

  stopSound() {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.isPlaying = false;
  }

  snooze() {
    this.stopSound();
    this.exitFullscreen();
    
    const settings = this.storage.getSettings();
    const snoozeMs = settings.snooze * 60 * 1000;
    
    // Show snooze message briefly
    if (window.app?.router) {
      document.getElementById('app').innerHTML = `
        <div id="alarm" class="screen active">
          <div class="onboarding-slide">
            <div class="icon">💤</div>
            <h1>Snoozing</h1>
            <p>Alarm will ring again in ${settings.snooze} minutes</p>
            <button class="btn btn-outline" onclick="app.router.show('home')">
              Go to Home
            </button>
          </div>
        </div>
      `;
    }
    
    // Schedule next alarm
    this.snoozeTimeout = setTimeout(() => {
      this.trigger();
    }, snoozeMs);
  }

  dismiss() {
    this.stopSound();
    this.exitFullscreen();
    
    // Log successful wake up
    this.storage.addAlarmRecord({
      type: 'fajr',
      completed: true,
      situps: this.storage.getSettings().situps
    });
    
    // Show success screen
    if (window.app?.router) {
      window.app.router.show('success');
    }
  }

  requestFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(e => console.log('Fullscreen denied:', e));
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    }
  }

  exitFullscreen() {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(e => console.log('Exit fullscreen denied:', e));
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}
