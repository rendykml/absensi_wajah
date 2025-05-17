const video = document.getElementById("video");
const namaInput = document.getElementById("namaInput");
const simpanBtn = document.getElementById("simpanWajah");
const absenBtn = document.getElementById("absenBtn");
const logList = document.getElementById("absensiLog");

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("models")
]).then(startVideo);

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => (video.srcObject = stream))
    .catch(err => console.error("Gagal akses webcam:", err));
}

simpanBtn.addEventListener("click", async () => {
  const nama = namaInput.value.trim();
  if (!nama) return alert("Masukkan nama terlebih dahulu!");

  const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

  if (!detection) {
    alert("Wajah tidak terdeteksi!");
    return;
  }

  const descriptor = Array.from(detection.descriptor);
  const dataWajah = JSON.parse(localStorage.getItem("dataWajah")) || [];

  dataWajah.push({ nama, descriptor });
  localStorage.setItem("dataWajah", JSON.stringify(dataWajah));
  alert(`Wajah ${nama} berhasil disimpan!`);
});

absenBtn.addEventListener("click", async () => {
  const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

  if (!detection) {
    alert("Wajah tidak terdeteksi!");
    return;
  }

  const descriptorBaru = detection.descriptor;
  const dataWajah = JSON.parse(localStorage.getItem("dataWajah")) || [];

  let match = null;
  for (const data of dataWajah) {
    const jarak = faceapi.euclideanDistance(descriptorBaru, new Float32Array(data.descriptor));
    if (jarak < 0.5) {
      match = data.nama;
      break;
    }
  }

  if (match) {
    const waktu = new Date().toLocaleString();
    const log = { nama: match, waktu };
    simpanAbsensi(log);
    tampilkanLog();
    alert(`Absensi berhasil untuk ${match} pada ${waktu}`);
  } else {
    alert("Wajah tidak dikenali!");
  }
});

function simpanAbsensi(log) {
  const data = JSON.parse(localStorage.getItem("absensi")) || [];
  data.push(log);
  localStorage.setItem("absensi", JSON.stringify(data));
}

function tampilkanLog() {
  logList.innerHTML = "";
  const data = JSON.parse(localStorage.getItem("absensi")) || [];
  data.forEach((log, i) => {
    const item = document.createElement("li");
    item.textContent = `#${i + 1} - ${log.nama} pada ${log.waktu}`;
    logList.appendChild(item);
  });
}

window.onload = tampilkanLog;
