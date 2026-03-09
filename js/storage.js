/**
 * Storage - LocalStorage wrapper with type safety
 */

export class Storage {
  constructor() {
    this.prefix = 'fajr_alarm_';
  }

  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(this.prefix + key);
      if (value === null) return defaultValue;
      return JSON.parse(value);
    } catch (e) {
      console.error('Storage get error:', e);
      return defaultValue;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  }

  remove(key) {
    try {
      localStorage.removeItem(this.prefix + key);
      return true;
    } catch (e) {
      return false;
    }
  }

  clear() {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith(this.prefix));
      keys.forEach(k => localStorage.removeItem(k));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Convenience methods
  getLocation() {
    return this.get('location', { lat: 55.7558, lng: 37.6173, city: 'Moscow' }); // Default to Moscow
  }

  setLocation(location) {
    return this.set('location', location);
  }

  getSettings() {
    return this.get('settings', {
      method: 2, // ISNA
      sound: 'default',
      snooze: 5,
      situps: 10
    });
  }

  setSettings(settings) {
    return this.set('settings', settings);
  }

  updateSetting(key, value) {
    const settings = this.getSettings();
    settings[key] = value;
    return this.setSettings(settings);
  }

  getPermissions() {
    return this.get('permissions', {
      location: false,
      notification: false,
      camera: false
    });
  }

  setPermissions(permissions) {
    return this.set('permissions', permissions);
  }

  getCalibration() {
    return this.get('calibration', null);
  }

  setCalibration(calibration) {
    return this.set('calibration', calibration);
  }

  getAlarmHistory() {
    return this.get('alarm_history', []);
  }

  addAlarmRecord(record) {
    const history = this.getAlarmHistory();
    history.unshift({
      ...record,
      timestamp: new Date().toISOString()
    });
    // Keep only last 30 records
    return this.set('alarm_history', history.slice(0, 30));
  }
}
