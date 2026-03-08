import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Anchor, MapPin, Settings, Clock, Download, Plus, Trash2, Upload, Play, Square, Mail, Bell } from 'lucide-react';
import Papa from 'papaparse';

const HarbourWatch = () => {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [zones, setZones] = useState([]);
  const [ships, setShips] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [watchlists, setWatchlists] = useState([]);
  const [settings, setSettings] = useState({});
  const [newZone, setNewZone] = useState({ name: '', lat: '', lng: '', radius: '' });
  const [newShip, setNewShip] = useState({ name: '', imo: '', mmsi: '' });
  const [newWatchlist, setNewWatchlist] = useState('');
  const [selectedWatchlist, setSelectedWatchlist] = useState(null);
  const [dataUsage, setDataUsage] = useState({ today: 0, week: 0 });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitored, setMonitored] = useState(0);
  const monitoringRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize defaults
  useEffect(() => {
    // Load saved data from localStorage
    const savedZones = JSON.parse(localStorage.getItem('hwZones') || '[]');
    const savedShips = JSON.parse(localStorage.getItem('hwShips') || '[]');
    const savedAlerts = JSON.parse(localStorage.getItem('hwAlerts') || '[]');
    const savedWatchlists = JSON.parse(localStorage.getItem('hwWatchlists') || '[]');
    const savedSettings = JSON.parse(localStorage.getItem('hwSettings') || '{}');

    setZones(savedZones);
    setShips(savedShips);
    setAlerts(savedAlerts);
    setWatchlists(savedWatchlists);
    setSettings(savedSettings);
  }, []);

  // Save data to localStorage
  useEffect(() => {
    localStorage.setItem('hwZones', JSON.stringify(zones));
  }, [zones]);

  useEffect(() => {
    localStorage.setItem('hwShips', JSON.stringify(ships));
  }, [ships]);

  useEffect(() => {
    localStorage.setItem('hwAlerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('hwWatchlists', JSON.stringify(watchlists));
  }, [watchlists]);

  useEffect(() => {
    localStorage.setItem('hwSettings', JSON.stringify(settings));
  }, [settings]);

  // Background monitoring
  useEffect(() => {
    if (!isMonitoring) return;

    monitoringRef.current = setInterval(() => {
      // Simulate ship position checking
      ships.forEach(ship => {
        zones.forEach(zone => {
          // Calculate distance (simplified)
          const distance = Math.sqrt(
            Math.pow(parseFloat(ship.lat || 0) - parseFloat(zone.lat), 2) +
            Math.pow(parseFloat(ship.lng || 0) - parseFloat(zone.lng), 2)
          ) * 111000; // Convert degrees to meters

          if (distance < parseFloat(zone.radius)) {
            const alertExists = alerts.some(
              a => a.shipName === ship.name && a.zoneName === zone.name &&
              new Date(a.timestamp).getTime() > Date.now() - 60000
            );

            if (!alertExists) {
              const newAlert = {
                id: Date.now(),
                shipName: ship.name,
                imo: ship.imo || 'N/A',
                mmsi: ship.mmsi || 'N/A',
                zoneName: zone.name,
                coordinates: `${zone.lat}, ${zone.lng}`,
                timestamp: new Date().toISOString(),
              };

              setAlerts(prev => [...prev, newAlert]);

              // Send email if enabled
              if (settings[zone.name]?.email) {
                sendEmailAlert(newAlert, settings[zone.name].emailAddress);
              }

              // Send push notification if enabled
              if (settings[zone.name]?.push) {
                sendPushNotification(newAlert);
              }
            }
          }
        });
      });

      setMonitored(prev => prev + 1);
      updateDataUsage();
    }, 5000);

    return () => clearInterval(monitoringRef.current);
  }, [isMonitoring, ships, zones, alerts, settings]);

  const sendEmailAlert = (alert, email) => {
    // EmailJS integration placeholder
    const templateParams = {
      to_email: email,
      ship_name: alert.shipName,
      imo: alert.imo,
      mmsi: alert.mmsi,
      zone_name: alert.zoneName,
      coordinates: alert.coordinates,
      timestamp: formatTime(alert.timestamp),
    };

    // In production, integrate with EmailJS service
    console.log('Email alert would be sent:', templateParams);
  };

  const sendPushNotification = (alert) => {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('HarbourWatch Alert', {
            body: `${alert.shipName} entered zone ${alert.zoneName}`,
            icon: '⚓',
          });
        }
      });
    }
  };

  const updateDataUsage = () => {
    const usage = Math.random() * 5; // Simulate data usage
    setDataUsage(prev => ({
      today: prev.today + usage,
      week: prev.week + usage,
    }));
  };

  const addZone = () => {
    if (newZone.name && newZone.lat && newZone.lng && newZone.radius) {
      const zone = {
        id: Date.now(),
        ...newZone,
        lat: parseFloat(newZone.lat),
        lng: parseFloat(newZone.lng),
        radius: parseFloat(newZone.radius),
      };
      setZones([...zones, zone]);
      setSettings(prev => ({
        ...prev,
        [zone.name]: { email: false, push: true, emailAddress: '' }
      }));
      setNewZone({ name: '', lat: '', lng: '', radius: '' });
    }
  };

  const deleteZone = (id) => {
    const zone = zones.find(z => z.id === id);
    setZones(zones.filter(z => z.id !== id));
    if (zone) {
      setSettings(prev => {
        const updated = { ...prev };
        delete updated[zone.name];
        return updated;
      });
    }
  };

  const addShip = () => {
    if (newShip.name) {
      setShips([...ships, { id: Date.now(), ...newShip, watchlist: selectedWatchlist }]);
      setNewShip({ name: '', imo: '', mmsi: '' });
    }
  };

  const deleteShip = (id) => {
    setShips(ships.filter(s => s.id !== id));
  };

  const handleCSVUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const newShips = results.data
            .filter(row => row.name)
            .map(row => ({
              id: Date.now() + Math.random(),
              name: row.name,
              imo: row.imo || '',
              mmsi: row.mmsi || '',
              watchlist: selectedWatchlist,
            }));
          setShips([...ships, ...newShips]);
        },
      });
    }
  };

  const addWatchlist = () => {
    if (newWatchlist) {
      setWatchlists([...watchlists, { id: Date.now(), name: newWatchlist }]);
      setNewWatchlist('');
    }
  };

  const downloadAlerts = () => {
    const headers = ['Ship Name', 'IMO', 'MMSI', 'Zone Name', 'Coordinates', 'Timestamp'];
    const rows = alerts.map(a => [
      a.shipName,
      a.imo,
      a.mmsi,
      a.zoneName,
      a.coordinates,
      formatTime(a.timestamp),
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'harbour-watch-alerts.csv';
    a.click();
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('sv-SE', { timeZone: 'UTC' });
  };

  const formatFileSize = (mb) => {
    return mb.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Anchor className="w-8 h-8 text-blue-300" />
            <h1 className="text-3xl font-bold text-white tracking-tight">HarbourWatch</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isMonitoring ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
              <div className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-sm font-medium">{isMonitoring ? 'Monitoring' : 'Idle'}</span>
            </div>
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                isMonitoring
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isMonitoring ? (
                <>
                  <Square className="w-4 h-4" />
                  Stop
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-blue-900/30 border-b border-blue-700/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 flex gap-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: AlertCircle },
            { id: 'ships', label: 'Ships', icon: Anchor },
            { id: 'zones', label: 'Zones', icon: MapPin },
            { id: 'alerts', label: 'Alerts', icon: AlertCircle },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-all ${
                  currentTab === tab.id
                    ? 'border-blue-400 text-blue-300'
                    : 'border-transparent text-blue-200 hover:text-blue-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Dashboard Tab */}
        {currentTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-lg p-6 backdrop-blur-sm">
                <div className="text-blue-300 text-sm font-semibold mb-2">Total Zones</div>
                <div className="text-4xl font-bold text-white">{zones.length}</div>
              </div>
              <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 border border-cyan-700/50 rounded-lg p-6 backdrop-blur-sm">
                <div className="text-cyan-300 text-sm font-semibold mb-2">Total Ships</div>
                <div className="text-4xl font-bold text-white">{ships.length}</div>
              </div>
              <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/30 border border-orange-700/50 rounded-lg p-6 backdrop-blur-sm">
                <div className="text-orange-300 text-sm font-semibold mb-2">Total Alerts</div>
                <div className="text-4xl font-bold text-white">{alerts.length}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-lg p-6 backdrop-blur-sm">
                <div className="text-purple-300 text-sm font-semibold mb-2">Checks Run</div>
                <div className="text-4xl font-bold text-white">{monitored}</div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white mb-4">Recent Alerts</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {alerts.slice(-5).reverse().map(alert => (
                  <div key={alert.id} className="bg-slate-800/50 border border-slate-700/50 rounded p-3 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white">{alert.shipName}</p>
                      <p className="text-sm text-slate-300">Zone: {alert.zoneName} • {alert.coordinates}</p>
                      <p className="text-xs text-slate-400">{formatTime(alert.timestamp)}</p>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-slate-400 text-sm">No alerts yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ships Tab */}
        {currentTab === 'ships' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-6">Watchlists</h2>
              <div className="flex gap-3 mb-6">
                <input
                  type="text"
                  placeholder="New watchlist name..."
                  value={newWatchlist}
                  onChange={(e) => setNewWatchlist(e.target.value)}
                  className="flex-1 bg-slate-800/50 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={addWatchlist}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                {watchlists.map(wl => (
                  <button
                    key={wl.id}
                    onClick={() => setSelectedWatchlist(selectedWatchlist === wl.name ? null : wl.name)}
                    className={`px-4 py-2 rounded font-medium transition-all ${
                      selectedWatchlist === wl.name
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {wl.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-6">Add Ships</h2>
              <div className="space-y-4 mb-6">
                <input
                  type="text"
                  placeholder="Ship Name"
                  value={newShip.name}
                  onChange={(e) => setNewShip({ ...newShip, name: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="IMO (optional)"
                    value={newShip.imo}
                    onChange={(e) => setNewShip({ ...newShip, imo: e.target.value })}
                    className="bg-slate-800/50 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="MMSI (optional)"
                    value={newShip.mmsi}
                    onChange={(e) => setNewShip({ ...newShip, mmsi: e.target.value })}
                    className="bg-slate-800/50 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={addShip}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Add Ship
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-2 rounded font-medium flex items-center justify-center gap-2 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Import CSV
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleCSVUpload}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-6">Ships</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {ships.map(ship => (
                  <div key={ship.id} className="bg-slate-800/50 border border-slate-700/50 rounded p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{ship.name}</p>
                      <p className="text-sm text-slate-400">
                        {ship.imo && `IMO: ${ship.imo}`}
                        {ship.imo && ship.mmsi && ' • '}
                        {ship.mmsi && `MMSI: ${ship.mmsi}`}
                      </p>
                      {ship.watchlist && <p className="text-xs text-blue-300">Watchlist: {ship.watchlist}</p>}
                    </div>
                    <button
                      onClick={() => deleteShip(ship.id)}
                      className="bg-red-600/20 hover:bg-red-600/40 text-red-300 p-2 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {ships.length === 0 && (
                  <p className="text-slate-400 text-sm">No ships added yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Zones Tab */}
        {currentTab === 'zones' && (
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-6">Add Zone</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Zone Name"
                  value={newZone.name}
                  onChange={(e) => setNewZone({ ...newZone, name: e.target.value })}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <div className="grid grid-cols-3 gap-4">
                  <input
                    type="number"
                    placeholder="Latitude"
                    value={newZone.lat}
                    onChange={(e) => setNewZone({ ...newZone, lat: e.target.value })}
                    className="bg-slate-800/50 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    step="0.0001"
                  />
                  <input
                    type="number"
                    placeholder="Longitude"
                    value={newZone.lng}
                    onChange={(e) => setNewZone({ ...newZone, lng: e.target.value })}
                    className="bg-slate-800/50 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                    step="0.0001"
                  />
                  <input
                    type="number"
                    placeholder="Radius (m)"
                    value={newZone.radius}
                    onChange={(e) => setNewZone({ ...newZone, radius: e.target.value })}
                    className="bg-slate-800/50 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={addZone}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  Add Zone
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
              <h2 className="text-2xl font-bold text-white mb-6">Zones</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {zones.map(zone => (
                  <div key={zone.id} className="bg-slate-800/50 border border-slate-700/50 rounded p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{zone.name}</p>
                      <p className="text-sm text-slate-400">
                        {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)} • {parseFloat(zone.radius).toLocaleString()}m radius
                      </p>
                    </div>
                    <button
                      onClick={() => deleteZone(zone.id)}
                      className="bg-red-600/20 hover:bg-red-600/40 text-red-300 p-2 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {zones.length === 0 && (
                  <p className="text-slate-400 text-sm">No zones added yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {currentTab === 'alerts' && (
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Alerts Log</h2>
              <button
                onClick={downloadAlerts}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            </div>

            <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {alerts.map(alert => (
                  <div key={alert.id} className="bg-slate-800/50 border border-slate-700/50 rounded p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white">{alert.shipName}</p>
                        <p className="text-sm text-slate-300">
                          IMO: {alert.imo} • MMSI: {alert.mmsi}
                        </p>
                        <p className="text-sm text-slate-300">
                          Zone: {alert.zoneName}
                        </p>
                        <p className="text-sm text-slate-300">
                          Coordinates: {alert.coordinates}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(alert.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-slate-400 text-sm">No alerts yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {currentTab === 'settings' && (
          <div className="space-y-8">
            <h2 className="text-2xl font-bold text-white">Notification Settings</h2>

            <div className="space-y-4">
              {zones.map(zone => (
                <div key={zone.id} className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
                  <h3 className="text-lg font-semibold text-white mb-4">{zone.name}</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings[zone.name]?.email || false}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          [zone.name]: { ...prev[zone.name], email: e.target.checked }
                        }))}
                        className="w-4 h-4"
                      />
                      <span className="text-white font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email Notifications
                      </span>
                    </label>
                    {settings[zone.name]?.email && (
                      <input
                        type="email"
                        placeholder="Email address"
                        value={settings[zone.name]?.emailAddress || ''}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          [zone.name]: { ...prev[zone.name], emailAddress: e.target.value }
                        }))}
                        className="w-full bg-slate-800/50 border border-slate-700 rounded px-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 ml-7"
                      />
                    )}

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings[zone.name]?.push || false}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          [zone.name]: { ...prev[zone.name], push: e.target.checked }
                        }))}
                        className="w-4 h-4"
                      />
                      <span className="text-white font-medium flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Push Notifications
                      </span>
                    </label>
                  </div>
                </div>
              ))}

              {zones.length === 0 && (
                <div className="bg-gradient-to-br from-slate-900/50 to-slate-800/30 border border-slate-700/50 rounded-lg p-6 backdrop-blur-sm">
                  <p className="text-slate-400">No zones configured. Create zones first to set notification preferences.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950/50 border-t border-slate-700/50 mt-12">
        <div className="max-w-7xl mx-auto px-6 py-6 text-sm text-slate-400">
          <div className="flex justify-between items-center">
            <p>© 2024 HarbourWatch Maritime Monitoring</p>
            <div className="flex gap-6">
              <div>Data Usage Today: {formatFileSize(dataUsage.today)} MB</div>
              <div>Data Usage This Week: {formatFileSize(dataUsage.week)} MB</div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HarbourWatch;
