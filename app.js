// Screens
const onboardingScreen = document.getElementById('onboarding');
const dashboardScreen = document.getElementById('dashboard');
const addRideScreen = document.getElementById('add-ride');

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
  const met = 8 + (elevationM / durationMin) * 2;
  const hours = durationMin / 60;
  return Math.round((met * profile.weight * hours));
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

  const ride = {
    name: document.getElementById('trail-name').value,
    date: document.getElementById('ride-date').value,
    distance,
    duration,
    elevation,
    calories: calcCalories(profile, distance, duration, elevation)
  };

  const rides = loadRides();
  rides.push(ride);
  localStorage.setItem('rides', JSON.stringify(rides));

  document.getElementById('ride-form').reset();
  showScreen(dashboardScreen);
  updateDashboard();
});

// App starten
if (loadProfile()) {
  showScreen(dashboardScreen);
  updateDashboard();
} else {
  showScreen(onboardingScreen);
}