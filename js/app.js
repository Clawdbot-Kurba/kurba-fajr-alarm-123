/**
 * Fajr Alarm - Main Application Entry
 * Modular architecture for easy migration to React Native
 */

import { Router } from './router.js';
import { Storage } from './storage.js';
import { Fajr } from './fajr.js';
import { Alarm } from './alarm.js';
import { PoseDetector } from './pose.js';
import { SitUpCounter } from './situp.js';
import { UI } from './ui.js';

class FajrAlarmApp {
  constructor() {
    this.storage = new Storage();
    this.router = new Router();
    this.fajr = new Fajr(this.storage);
    this.alarm = new Alarm(this.storage);
    this.pose = null;
    this.situpCounter = null;
    this.ui = new UI();
    
    this.init();
  }

  async init() {
    // Check if first launch
    const onboardingComplete = this.storage.get('onboardingComplete');
    
    if (!onboardingComplete) {
      this.router.show('onboarding');
    } else {
      await this.fajr.init();
      this.router.show('home');
      this.checkAlarm();
    }

    // Set up navigation
    this.setupNavigation();
    
    // Register service worker
    this.registerServiceWorker();
    
    // Request notification permission on Android
    if ('Notification' in window && Notification.permission === 'default') {
      // Will be requested when user enables in settings
    }
  }

  setupNavigation() {
    document.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) {
        const screen = nav.dataset.nav;
        this.router.show(screen);
      }
    });
  }

  async checkAlarm() {
    const now = new Date();
    const fajrTime = this.fajr.getNextFajr();
    
    if (fajrTime && now >= new Date(fajrTime.getTime() - 60000) && now < new Date(fajrTime.getTime() + 60000)) {
      this.alarm.trigger();
    }
  }

  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('sw.js');
        console.log('Service Worker registered');
      } catch (e) {
        console.log('Service Worker registration failed:', e);
      }
    }
  }

  // Initialize pose detection for sit-up verification
  async initPoseDetection(videoElement, canvasElement, onResults) {
    this.pose = new PoseDetector();
    await this.pose.init(videoElement, canvasElement, onResults);
    this.situpCounter = new SitUpCounter(this.pose);
  }

  stopPoseDetection() {
    if (this.pose) {
      this.pose.stop();
      this.pose = null;
    }
    this.situpCounter = null;
  }
}

// Global app instance
window.app = new FajrAlarmApp();

// Handle back button
window.addEventListener('popstate', () => {
  // Handle navigation
});
