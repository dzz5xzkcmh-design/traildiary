// ── SCREENS ──
const onboardingScreen = document.getElementById('onboarding');
const dashboardScreen = document.getElementById('dashboard');
const addRideScreen = document.getElementById('add-ride');
const settingsScreen = document.getElementById('settings');
const detailModal = document.getElementById('detail-modal');

// ── PINNWAND ZOOM/PAN ──
const wrapper = document.getElementById('pinboard-wrapper');
const canvas = document.getElementById('pinboard-canvas');

let scale = 0.5;
let panX = 0;
let panY = 0;
let isPanning = false;
let startX, startY;

function applyTransform() {
  canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
}

// Zoom und Pan mit Trackpad
wrapper.addEventListener('wheel', e => {
  e.preventDefault();
  e.stopPropagation();

  // Pinch erkennen: kleine deltaY Werte mit ctrlKey = Pinch
  const isPinch = e.ctrlKey;

  if (isPinch) {
    const oldScale = scale;
    const delta = e.deltaY > 0 ? -0.03 : 0.03;
    scale = Math.min(Math.max(scale + delta, 0.2), 2);

    const rect = wrapper.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    panX = mouseX - (mouseX - panX) * (scale / oldScale);
    panY = mouseY - (mouseY - panY) * (scale / oldScale);
  } else {
    panX -= e.deltaX;
    panY -= e.deltaY;
  }

  applyTransform();
}, { passive: false });
// Pan mit Maus (Click & Drag)
wrapper.addEventListener('mousedown', e => {
  if (e.target.closest('.polaroid')) return;
  isPanning = true;
  startX = e.clientX - panX;
  startY = e.clientY - panY;
  wrapper.style.cursor = 'grabbing';
});

window.addEventListener('mousemove', e => {
  if (!isPanning) return;
  panX = e.clientX - startX;
  panY = e.clientY - startY;
  applyTransform();
});

window.addEventListener('mouseup', () => {
  isPanning = false;
  wrapper.style.cursor = 'grab';
});

// ── HILFSFUNKTIONEN ──
function showScreen(screen) {
  [onboardingScreen, dashboardScreen, addRideScreen, settingsScreen].forEach(s => s.classList.add('hidden'));
  screen.classList.remove('hidden');
}

function loadProfile() {
  return JSON.parse(localStorage.getItem('profile'));
}

function loadRides() {
  return JSON.parse(localStorage.getItem('rides')) || [];
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });
}

function calcCalories(profile, distanceKm, durationMin, elevationM) {
  const hours = durationMin / 60;
  const speed = distanceKm / hours;

  let met;
  if (speed < 16) met = 4.0;
  else if (speed < 19) met = 5.0;
  else if (speed < 23) met = 6.8;
  else if (speed < 28) met = 8.0;
  else met = 10.0;

  const elevationBonus = (elevationM / distanceKm) * 0.2;
  met += elevationBonus;

  const genderFactor = profile.gender === 'female' ? 0.85 : 1.0;
  return Math.round(met * profile.weight * hours * genderFactor);
}

// ── STATS AKTUALISIEREN ──
function updateStats() {
  const rides = loadRides();
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
}

// ── PINNWAND RENDERN ──
function renderPinboard() {
  const rides = loadRides();
  canvas.innerHTML = '';


  rides.forEach((ride, index) => {
    const polaroid = document.createElement('div');
    polaroid.className = 'polaroid';
    polaroid.style.left = ride.x + 'px';
    polaroid.style.top = ride.y + 'px';
    polaroid.style.transform = `rotate(${ride.rotation}deg)`;

    polaroid.innerHTML = `
      <div class="polaroid-pin"></div>
      <img class="polaroid-img" src="${ride.images[0]}" alt="${ride.name}" />
      <div class="polaroid-label">${ride.name}</div>
    `;

    polaroid.addEventListener('click', () => openModal(index));
    canvas.appendChild(polaroid);
  });
}

// ── DETAIL MODAL ──
let currentModalIndex = null;

function openModal(index) {
  const rides = loadRides();
  const ride = rides[index];
  currentModalIndex = index;

  document.getElementById('modal-title').textContent = ride.name;
  document.getElementById('modal-date').textContent = formatDate(ride.date);
  document.getElementById('modal-description').textContent = ride.description;
  document.getElementById('modal-km').textContent = ride.distance;
  document.getElementById('modal-hm').textContent = ride.elevation;
  document.getElementById('modal-duration').textContent = ride.duration;
  document.getElementById('modal-kcal').textContent = ride.calories;

  // Hauptbild
  const mainImg = document.getElementById('modal-main-img');
  mainImg.src = ride.images[0];

  // Thumbnails
  const thumbs = document.getElementById('modal-thumbs');
  thumbs.innerHTML = '';
  ride.images.forEach((img, i) => {
    const thumb = document.createElement('img');
    thumb.src = img;
    if (i === 0) thumb.classList.add('active');
    thumb.addEventListener('click', () => {
      mainImg.src = img;
      thumbs.querySelectorAll('img').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
    thumbs.appendChild(thumb);
  });

  detailModal.classList.remove('hidden');
}

function closeModal() {
  detailModal.classList.add('hidden');
  currentModalIndex = null;
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-backdrop').addEventListener('click', closeModal);

document.getElementById('modal-delete').addEventListener('click', () => {
  if (currentModalIndex === null) return;
  if (!confirm('Ride wirklich löschen?')) return;
  const rides = loadRides();
  rides.splice(currentModalIndex, 1);
  localStorage.setItem('rides', JSON.stringify(rides));
  closeModal();
  updateStats();
  renderPinboard();
});

// ── BILDKOMPRIMIERUNG ──
function compressImage(dataUrl, maxWidth = 800) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = dataUrl;
  });
}

// ── BILD UPLOAD ──
let uploadedImages = [];

document.getElementById('image-upload').addEventListener('change', e => {
  const files = Array.from(e.target.files).slice(0, 3);
  uploadedImages = [];
  const previews = document.getElementById('image-previews');
  previews.innerHTML = '';

  files.forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = async ev => {
      const compressed = await compressImage(ev.target.result);
      uploadedImages.push(compressed);
      const img = document.createElement('img');
      img.src = compressed;
      if (i === 0) img.classList.add('active');
      previews.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
});

// ── ONBOARDING ──
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
  updateStats();
  renderPinboard();
  applyTransform();
});

// ── RIDE HINZUFÜGEN ──
document.getElementById('add-ride-btn').addEventListener('click', () => {
  uploadedImages = [];
  document.getElementById('image-previews').innerHTML = '';
  document.getElementById('ride-form').reset();
  showScreen(addRideScreen);
});

document.getElementById('cancel-ride').addEventListener('click', () => {
  showScreen(dashboardScreen);
});

document.getElementById('ride-form').addEventListener('submit', e => {
  e.preventDefault();

  if (uploadedImages.length === 0) {
    alert('Bitte mindestens 1 Foto hinzufügen.');
    return;
  }

  const profile = loadProfile();
  const distance = parseFloat(document.getElementById('distance').value);
  const duration = parseInt(document.getElementById('duration').value);
  const elevation = parseInt(document.getElementById('elevation').value);

  // Zufällige Position und Rotation auf der Pinnwand
  const x = 100 + Math.random() * 2400;
  const y = 100 + Math.random() * 1600;
  const rotation = (Math.random() - 0.5) * 12;

  const ride = {
    name: document.getElementById('trail-name').value,
    date: document.getElementById('ride-date').value,
    distance,
    duration,
    elevation,
    description: document.getElementById('description').value,
    calories: calcCalories(profile, distance, duration, elevation),
    images: uploadedImages,
    x: Math.round(x),
    y: Math.round(y),
    rotation: parseFloat(rotation.toFixed(2))
  };

  const rides = loadRides();
  rides.push(ride);
  localStorage.setItem('rides', JSON.stringify(rides));

  document.getElementById('ride-form').reset();
  uploadedImages = [];
  document.getElementById('image-previews').innerHTML = '';

  showScreen(dashboardScreen);
  updateStats();
  renderPinboard();

  // Zum neuen Polaroid zoomen
  panX = -ride.x * scale + window.innerWidth / 2;
  panY = -ride.y * scale + window.innerHeight / 2;
  applyTransform();
});

// ── EINSTELLUNGEN ──
document.getElementById('settings-btn').addEventListener('click', () => {
  const profile = loadProfile();
  document.getElementById('settings-name').value = profile.name;
  document.getElementById('settings-weight').value = profile.weight;
  document.getElementById('settings-age').value = profile.age;
  document.getElementById('settings-gender').value = profile.gender;
  showScreen(settingsScreen);
});

document.getElementById('cancel-settings').addEventListener('click', () => {
  showScreen(dashboardScreen);
});

document.getElementById('settings-form').addEventListener('submit', e => {
  e.preventDefault();
  const profile = {
    name: document.getElementById('settings-name').value,
    weight: parseFloat(document.getElementById('settings-weight').value),
    age: parseInt(document.getElementById('settings-age').value),
    gender: document.getElementById('settings-gender').value
  };
  localStorage.setItem('profile', JSON.stringify(profile));
  showScreen(dashboardScreen);
});

// ── INIT ──
if (loadProfile()) {
  showScreen(dashboardScreen);
  updateStats();
  renderPinboard();
  applyTransform();
} else {
  showScreen(onboardingScreen);
}