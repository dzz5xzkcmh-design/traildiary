// Screens
const onboardingScreen = document.getElementById('onboarding');
const dashboardScreen = document.getElementById('dashboard');
const addRideScreen = document.getElementById('add-ride');

// Karte
let map = null;

function initMap() {
  if (map) {
    map.remove();
    map = null;
  }

  map = L.map('map').setView([48.05, 8.2], 10);

  L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
    attribution: '© Stadia Maps © OpenStreetMap'
  }).addTo(map);

  const rides = loadRides();

  if (rides.length === 0) return;

  const markers = [];

  rides.forEach(r => {
    if (r.lat && r.lng) {
      const greenIcon = L.divIcon({
        className: '',
        html: `<div style="
          width: 14px;
          height: 14px;
          background: #7eb87a;
          border: 2px solid #0f1210;
          border-radius: 50%;
          box-shadow: 0 0 0 3px #7eb87a44;
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10]
      });
  
      const marker = L.marker([r.lat, r.lng], { icon: greenIcon })
        .addTo(map)
        .bindPopup(`
          <strong>${r.name}</strong><br>
          ${r.date}<br>
          ${r.distance} km · ${r.elevation} Hm · ${r.duration} min<br>
          ${r.calories} kcal
        `);
      markers.push(marker);
    }
  });

  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

// Hilfsfunktionen
function showScreen(screen) {
  [onboardingScreen, dashboardScreen, addRideScreen].forEach(s => s.classList.add('hidden'));
  screen.classList.remove('hidden');
}

// Profil laden
function loadProfile() {
  return JSON.parse(localStorage.getItem('profile'));
}

// Rides laden
function loadRides() {
  return JSON.parse(localStorage.getItem('rides')) || [];
}

// Kalorien berechnen (MET-Methode)
function calcCalories(profile, distanceKm, durationMin, elevationM) {
    const hours = durationMin / 60;
    const speed = distanceKm / hours;
  
    let met;
    if (speed < 16) met = 4.0;
    else if (speed < 19) met = 5.0;
    else if (speed < 23) met = 6.8;
    else if (speed < 28) met = 8.0;
    else met = 10.0;
  
    // MTB Geländebonus durch Höhenmeter
    const elevationBonus = (elevationM / distanceKm) * 0.5;
    met += elevationBonus;
  
    // Geschlechtskorrektur
    const genderFactor = profile.gender === 'female' ? 0.85 : 1.0;
  
    return Math.round(met * profile.weight * hours * genderFactor);
  }

// Dashboard aktualisieren
function updateDashboard() {
  const rides = loadRides();
  const profile = loadProfile();

  let totalKm = 0, totalHm = 0, totalKcal = 0;

  rides.forEach(r => {
    totalKm += r.distance;
    totalHm += r.elevation;
    totalKcal += r.calories;
  });

  document.getElementById('total-rides').textContent = rides.length;
  document.getElementById('total-km').textContent = totalKm.toFixed(1);
  document.getElementById('total-hm').textContent = totalHm;
  document.getElementById('total-kcal').textContent = totalKcal;

  const list = document.getElementById('ride-list');
  list.innerHTML = '';

  if (rides.length === 0) {
    list.innerHTML = '<p class="empty">Noch keine Rides. Leg los!</p>';
    return;
  }

  [...rides].reverse().forEach(r => {
    const card = document.createElement('div');
    card.className = 'ride-card';
    card.innerHTML = `
      <h3>${r.name}</h3>
      <p>${r.date}</p>
      <div class="ride-stats">
        <span>${r.distance} km</span>
        <span>${r.elevation} Hm</span>
        <span>${r.duration} min</span>
        <span>${r.calories} kcal</span>
      </div>
    `;
    list.appendChild(card);
  });
}

// Onboarding
document.getElementById('onboarding-form').addEventListener('submit', e => {
  e.preventDefault();
  const profile = {
    name: document.getElementById('name').value,
    weight: parseFloat(document.getElementById('weight').value),
    age: parseInt(document.getElementById('age').value),
    gender: document.getElementById('gender').value
  };
  localStorage.setItem('profile', JSON.stringify(profile));
  showScreen(dashboardScreen);
  updateDashboard();
initMap();
});

// Ride hinzufügen
document.getElementById('add-ride-btn').addEventListener('click', () => {
  showScreen(addRideScreen);
});

document.getElementById('cancel-ride').addEventListener('click', () => {
  showScreen(dashboardScreen);
});

document.getElementById('ride-form').addEventListener('submit', e => {
  e.preventDefault();
  const profile = loadProfile();
  const distance = parseFloat(document.getElementById('distance').value);
  const duration = parseInt(document.getElementById('duration').value);
  const elevation = parseInt(document.getElementById('elevation').value);

  navigator.geolocation.getCurrentPosition(
    pos => {
      const ride = {
        name: document.getElementById('trail-name').value,
        date: document.getElementById('ride-date').value,
        distance,
        duration,
        elevation,
        calories: calcCalories(profile, distance, duration, elevation),
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      };
      const rides = loadRides();
      rides.push(ride);
      localStorage.setItem('rides', JSON.stringify(rides));
      document.getElementById('ride-form').reset();
      showScreen(dashboardScreen);
      updateDashboard();
      initMap();
    },
    () => {
      // Kein GPS — ohne Koordinaten speichern
      const ride = {
        name: document.getElementById('trail-name').value,
        date: document.getElementById('ride-date').value,
        distance,
        duration,
        elevation,
        calories: calcCalories(profile, distance, duration, elevation),
        lat: null,
        lng: null
      };
      const rides = loadRides();
      rides.push(ride);
      localStorage.setItem('rides', JSON.stringify(rides));
      document.getElementById('ride-form').reset();
      showScreen(dashboardScreen);
      updateDashboard();
      initMap();
    }
  );;
  localStorage.setItem('rides', JSON.stringify(rides));

  document.getElementById('ride-form').reset();
  showScreen(dashboardScreen);
  updateDashboard();
initMap();
});

if (loadProfile()) {
    showScreen(dashboardScreen);
    updateDashboard();
    initMap();
  } else {
    showScreen(onboardingScreen);
  }