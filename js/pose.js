/**
 * PoseDetector - MediaPipe Pose integration
 */

export class PoseDetector {
  constructor() {
    this.pose = null;
    this.camera = null;
    this.isRunning = false;
    this.onResults = null;
    this.video = null;
    this.canvas = null;
    this.canvasCtx = null;
  }

  async init(videoElement, canvasElement, onResults) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.canvasCtx = canvasElement.getContext('2d');
    this.onResults = onResults;
    
    // Initialize MediaPipe Pose
    this.pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      }
    });
    
    this.pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    
    this.pose.onResults((results) => this.handleResults(results));
    
    // Set canvas size
    this.canvas.width = 640;
    this.canvas.height = 480;
  }

  async start() {
    if (this.isRunning) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      this.video.srcObject = stream;
      await this.video.play();
      
      this.isRunning = true;
      
      // Start processing frames
      this.processFrame();
      
    } catch (e) {
      console.error('Camera error:', e);
      this.updateStatus('Camera access denied', 'error');
      throw e;
    }
  }

  async processFrame() {
    if (!this.isRunning) return;
    
    try {
      await this.pose.send({ image: this.video });
    } catch (e) {
      console.error('Pose processing error:', e);
    }
    
    // Continue processing
    if (this.isRunning) {
      requestAnimationFrame(() => this.processFrame());
    }
  }

  handleResults(results) {
    // Draw video frame
    this.canvasCtx.save();
    this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.canvasCtx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
    
    // Draw pose landmarks
    if (results.poseLandmarks) {
      this.drawPose(results.poseLandmarks);
      
      // Call the callback with landmarks
      if (this.onResults) {
        this.onResults(results.poseLandmarks);
      }
    }
    
    this.canvasCtx.restore();
  }

  drawPose(landmarks) {
    // Draw connection lines
    this.canvasCtx.strokeStyle = '#ffd700';
    this.canvasCtx.lineWidth = 3;
    
    const connections = [
      // Face
      [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
      // Body
      [9, 10], [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      // Torso
      [11, 23], [12, 24], [23, 24],
      // Arms
      [11, 15], [12, 16],
      // Legs
      [23, 25], [25, 27], [27, 29], [27, 31], [24, 26], [26, 28], [28, 30], [28, 32]
    ];
    
    connections.forEach(([i, j]) => {
      if (landmarks[i] && landmarks[j]) {
        const x1 = landmarks[i].x * this.canvas.width;
        const y1 = landmarks[i].y * this.canvas.height;
        const x2 = landmarks[j].x * this.canvas.width;
        const y2 = landmarks[j].y * this.canvas.height;
        
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(x1, y1);
        this.canvasCtx.lineTo(x2, y2);
        this.canvasCtx.stroke();
      }
    });
    
    // Draw keypoints
    this.canvasCtx.fillStyle = '#ffd700';
    landmarks.forEach((landmark, index) => {
      if (landmark && landmark.visibility > 0.5) {
        const x = landmark.x * this.canvas.width;
        const y = landmark.y * this.canvas.height;
        
        this.canvasCtx.beginPath();
        this.canvasCtx.arc(x, y, 6, 0, 2 * Math.PI);
        this.canvasCtx.fill();
      }
    });
  }

  updateStatus(message, type = 'info') {
    const statusEl = document.getElementById('camera-status');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `camera-status ${type}`;
    }
  }

  stop() {
    this.isRunning = false;
    
    // Stop camera stream
    if (this.video && this.video.srcObject) {
      const tracks = this.video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      this.video.srcObject = null;
    }
    
    // Close pose
    if (this.pose) {
      this.pose.close();
      this.pose = null;
    }
  }
}
