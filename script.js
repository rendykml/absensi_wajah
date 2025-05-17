const video = document.getElementById('video');
const namaInput = document.getElementById('namaInput');
const simpanWajahBtn = document.getElementById('simpanWajah');
const absenBtn = document.getElementById('absenBtn');
const absensiLog = document.getElementById('absensiLog');

let labeledFaceDescriptors = [];
let faceMatcher;

// Mulai kamera
async function startVideo() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
    video.srcObject = stream;
  } catch (error) {
    console.error("Tidak bisa mengakses kamera", error);
  }
}

// Load model
async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('models/tiny_face_detector');
  await faceapi.nets.faceRecognitionNet.loadFromUri('models/face_recognition');
  await faceapi.nets.faceLandmark68Net.loadFromUri('models/face_landmark_68');
  startVideo();
}

loadModels();

// Simpan wajah
simpanWajahBtn.addEventListener('click', async () => {
  const nama = namaInput.value.trim();
  if (!nama) return alert("Masukkan nama terlebih dahulu");

  const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks().withFaceDescriptor();

  if (!detection) {
    alert("Wajah tidak terdeteksi");
    return;
  }

  const descriptor = detection.descriptor;
  labeledFaceDescriptors.push(new faceapi.LabeledFaceDescriptors(nama, [descriptor]));
  faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors);
  alert(`Wajah untuk ${nama} berhasil disimpan`);
});

// Absensi
absenBtn.addEventListener('click', async () => {
  const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks().withFaceDescriptor();

  if (!detection) {
    alert("Wajah tidak terdeteksi");
    return;
  }

  const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
  const nama = bestMatch.label;

  if (nama === 'unknown') {
    alert("Wajah tidak dikenali");
  } else {
    const waktu = new Date().toLocaleTimeString();
    const item = document.createElement("li");
    item.textContent = `${nama} absen pada ${waktu}`;
    absensiLog.appendChild(item);
  }
});
