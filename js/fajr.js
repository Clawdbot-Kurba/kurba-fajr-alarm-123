/**
 * Fajr - Prayer time calculation and management
 */

export class Fajr {
  constructor(storage) {
    this.storage = storage;
    this.cachedTimes = null;
    this.cachedDate = null;
  }

  async init() {
    await this.updateTimes();
    this.startCountdown();
    
    // Update times at midnight
    setInterval(() => this.updateTimes(), 60000);
  }

  async updateTimes() {
    const location = this.storage.getLocation();
    const settings = this.storage.getSettings();
    
    try {
      const times = await this.fetchPrayerTimes(location, settings.method);
      this.cachedTimes = times;
      this.cachedDate = new Date();
      
      // Update UI
      this.updateUI();
    } catch (e) {
      console.error('Failed to fetch prayer times:', e);
      // Try to use cached times
      if (this.cachedTimes) {
        this.updateUI();
      }
    }
  }

  async fetchPrayerTimes(location, method = 2) {
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    
    const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${location.lat}&longitude=${location.lng}&method=${method}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 200) {
      return {
        fajr: data.data.timings.Fajr,
        sunrise: data.data.timings.Sunrise,
        dhuhr: data.data.timings.Dhuhr,
        asr: data.data.timings.Asr,
        maghrib: data.data.timings.Maghrib,
        isha: data.data.timings.Isha,
        date: data.data.date.readable
      };
    }
    
    throw new Error('Failed to fetch prayer times');
  }

  getNextFajr() {
    if (!this.cachedTimes) return null;
    
    const now = new Date();
    const today = now.toDateString();
    
    // Parse Fajr time
    const [fajrHours, fajrMinutes] = this.cachedTimes.fajr.split(':').map(Number);
    let fajrTime = new Date(today);
    fajrTime.setHours(fajrHours, fajrMinutes, 0, 0);
    
    // If Fajr has passed, get tomorrow's Fajr
    if (now > fajrTime) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      fajrTime = new Date(tomorrow.toDateString());
      fajrTime.setHours(fajrHours, fajrMinutes, 0, 0);
    }
    
    return fajrTime;
  }

  getTimeUntilFajr() {
    const fajr = this.getNextFajr();
    if (!fajr) return null;
    
    const now = new Date();
    const diff = fajr - now;
    
    if (diff <= 0) return '00:00:00';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  updateUI() {
    const fajrTimeEl = document.getElementById('fajr-time');
    const countdownEl = document.getElementById('countdown');
    const locationEl = document.getElementById('location-display');
    const dateEl = document.getElementById('current-date');
    
    if (fajrTimeEl && this.cachedTimes) {
      fajrTimeEl.textContent = this.cachedTimes.fajr;
    }
    
    if (dateEl && this.cachedTimes) {
      dateEl.textContent = this.cachedTimes.date;
    }
    
    if (locationEl) {
      const location = this.storage.getLocation();
      locationEl.textContent = location.city || 'Unknown location';
    }
  }

  startCountdown() {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return;
    
    const update = () => {
      const time = this.getTimeUntilFajr();
      if (time) {
        countdownEl.textContent = `in ${time}`;
      }
    };
    
    update();
    setInterval(update, 1000);
  }

  // Geolocation
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          // Reverse geocode to get city name
          try {
            const city = await this.reverseGeocode(latitude, longitude);
            resolve({
              lat: latitude,
              lng: longitude,
              city: city
            });
          } catch (e) {
            resolve({
              lat: latitude,
              lng: longitude,
              city: 'Your Location'
            });
          }
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  }

  async reverseGeocode(lat, lng) {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await response.json();
      return data.address.city || data.address.town || data.address.village || 'Unknown';
    } catch (e) {
      return 'Unknown';
    }
  }
}
