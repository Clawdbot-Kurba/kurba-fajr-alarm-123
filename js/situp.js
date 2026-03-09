/**
 * SitUpCounter - Sit-up detection and counting logic
 */

export class SitUpCounter {
  constructor(poseDetector) {
    this.pose = poseDetector;
    this.reps = 0;
    this.target = 10;
    this.state = 'waiting'; // waiting, lying, sitting, counting
    this.lastStateChange = Date.now();
    this.minRepDuration = 800; // ms - minimum time for a rep
    this.maxRepDuration = 10000; // ms - maximum time for a rep
    this.angleThreshold = 30; // degrees tolerance
    this.shoulderY = null;
    this.hipY = null;
    this.onRepCount = null;
    this.onComplete = null;
    this.calibrationData = null;
    
    // Load calibration if available
    this.loadCalibration();
  }

  loadCalibration() {
    try {
      const stored = localStorage.getItem('fajr_alarm_calibration');
      if (stored) {
        this.calibrationData = JSON.parse(stored);
      }
    } catch (e) {
      console.log('No calibration data');
    }
  }

  setTarget(target) {
    this.target = target;
  }

  setCallbacks(onRepCount, onComplete) {
    this.onRepCount = onRepCount;
    this.onComplete = onComplete;
  }

  // Keypoint indices from MediaPipe Pose
  // 11: left_shoulder, 12: right_shoulder
  // 23: left_hip, 24: right_hip
  // 0: nose
  
  processLandmarks(landmarks) {
    if (!landmarks || landmarks.length < 33) return;
    
    // Get relevant keypoints
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    const nose = landmarks[0];
    
    // Check visibility
    if (!this.isVisible(leftShoulder, rightShoulder, leftHip, rightHip)) {
      this.pose.updateStatus('Position yourself in camera view', 'warning');
      return;
    }
    
    // Calculate angles
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipY = (leftHip.y + rightHip.y) / 2;
    const noseY = nose.y;
    
    // Calculate torso angle (relative to vertical)
    const shoulderX = (leftShoulder.x + rightShoulder.x) / 2;
    const hipX = (leftHip.x + rightHip.x) / 2;
    const angle = this.calculateAngle(shoulderX, shoulderY, hipX, hipY);
    
    // Detect state based on shoulder-hip relationship
    const prevState = this.state;
    const now = Date.now();
    const timeInState = now - this.lastStateChange;
    
    // Determine current state
    if (shoulderY > hipY + 0.05) {
      // Lying down (shoulders lower than hips in image coords)
      this.state = 'lying';
    } else if (shoulderY < hipY - 0.1) {
      // Sitting up (shoulders higher than hips)
      this.state = 'sitting';
    } else {
      // Transitioning
      this.state = 'transitioning';
    }
    
    // Count rep: lying -> sitting -> lying
    if (prevState === 'lying' && this.state === 'sitting') {
      this.state = 'sitting';
      this.lastStateChange = now;
      this.pose.updateStatus('Sit up fully!', 'warning');
    } else if (prevState === 'sitting' && this.state === 'lying') {
      // Completed a rep!
      if (timeInState >= this.minRepDuration && timeInState <= this.maxRepDuration) {
        this.reps++;
        this.onRepCount?.(this.reps);
        this.pose.updateStatus(`Great! ${this.reps}/${this.target}`, 'success');
        
        // Check if complete
        if (this.reps >= this.target) {
          this.complete();
          return;
        }
      } else if (timeInState < this.minRepDuration) {
        this.pose.updateStatus('Too fast! Slow down.', 'warning');
      }
      this.lastStateChange = now;
    } else if (this.state !== prevState) {
      this.lastStateChange = now;
    }
    
    // Visual feedback based on state
    if (this.state === 'lying') {
      this.pose.updateStatus('Lie on your back, then sit up', 'info');
    } else if (this.state === 'sitting') {
      this.pose.updateStatus('Good! Now lie back down', 'success');
    }
    
    // Store for calibration
    this.shoulderY = shoulderY;
    this.hipY = hipY;
  }

  isVisible(...points) {
    return points.every(p => p && p.visibility > 0.5);
  }

  calculateAngle(x1, y1, x2, y2) {
    // Calculate angle from vertical (pointing up)
    const dx = x2 - x1;
    const dy = y1 - y2; // Invert because Y increases downward
    
    let angle = Math.atan2(dx, dy) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    
    return angle;
  }

  // Get angle at hip (torso angle)
  getTorsoAngle(landmarks) {
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    const shoulderX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipX = (leftHip.x + rightHip.x) / 2;
    const hipY = (leftHip.y + rightHip.y) / 2;
    
    return this.calculateAngle(shoulderX, shoulderY, hipX, hipY);
  }

  // Check if it's a valid sit-up (using torso angle)
  isValidSitUp(landmarks) {
    const angle = this.getTorsoAngle(landmarks);
    
    // Lying down: angle near 0 (torso parallel to ground)
    // Sitting up: angle near 90 (torso vertical)
    
    return angle;
  }

  calibrate() {
    // Store current position as baseline
    if (this.shoulderY !== null && this.hipY !== null) {
      this.calibrationData = {
        shoulderY: this.shoulderY,
        hipY: this.hipY,
        timestamp: Date.now()
      };
      
      try {
        localStorage.setItem('fajr_alarm_calibration', JSON.stringify(this.calibrationData));
        this.pose.updateStatus('Calibration saved!', 'success');
      } catch (e) {
        console.error('Failed to save calibration:', e);
      }
    }
  }

  complete() {
    this.pose.updateStatus('🎉 Complete!', 'success');
    this.onComplete?.();
  }

  reset() {
    this.reps = 0;
    this.state = 'waiting';
    this.lastStateChange = Date.now();
  }
}
