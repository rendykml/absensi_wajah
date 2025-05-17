const video = document.getElementById('video');
const namaInput = document.getElementById('namaInput');
const simpanWajahBtn = document.getElementById('simpanWajah');
const absenBtn = document.getElementById('absenBtn');
const absensiLog = document.getElementById('absensiLog');
const overlay = document.getElementById('overlay');
const canvasCtx = overlay.getContext('2d');

// Create a capture canvas (hidden) for saving images
const captureCanvas = document.createElement('canvas');
captureCanvas.width = 640;
captureCanvas.height = 480;
const captureCtx = captureCanvas.getContext('2d');

let labeledFaceDescriptors = [];
let faceMatcher;
let savedFaces = JSON.parse(localStorage.getItem('savedFaces') || '[]');

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

// Display saved faces when the page loads
document.addEventListener('DOMContentLoaded', () => {
  displaySavedFaces();
});

// Function to capture and save face snapshot
async function captureFaceSnapshot(nama) {
  // Draw the video frame to the capture canvas
  captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
  
  // Get face detections to draw boxes and names
  const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks().withFaceDescriptors();
  
  if (detections.length > 0) {
    const resized = faceapi.resizeResults(detections, {
      width: video.width,
      height: video.height
    });
    
    // Draw face boxes and names on the capture canvas
    resized.forEach(detection => {
      const box = detection.detection.box;
      let name = nama; // Default to the provided name
      
      // If we have a face matcher, try to get the name
      if (faceMatcher) {
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        name = bestMatch.label !== 'unknown' ? bestMatch.label : nama;
      }
      
      // Improved face box with thicker border
      captureCtx.strokeStyle = '#00ff00'; // Bright green
      captureCtx.lineWidth = 3;
      captureCtx.strokeRect(box.x, box.y, box.width, box.height);
      
      // Create a better background for name display (more visible)
      const fontSize = 18;
      captureCtx.font = `bold ${fontSize}px Arial`;
      const textMetrics = captureCtx.measureText(name);
      const textWidth = textMetrics.width;
      const padding = 8;
      
      // Draw background for name - positioned at the top of the box
      captureCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      captureCtx.fillRect(
        box.x, 
        box.y - fontSize - padding * 1.5, 
        textWidth + padding * 2, 
        fontSize + padding
      );
      
      // Draw name with shadow for better visibility
      captureCtx.shadowColor = 'black';
      captureCtx.shadowBlur = 4;
      captureCtx.fillStyle = '#ffffff'; // White text
      captureCtx.fillText(
        name, 
        box.x + padding, 
        box.y - padding
      );
      captureCtx.shadowBlur = 0; // Reset shadow
      
      // Add timestamp to the image
      const timestamp = new Date().toLocaleString();
      const timestampFontSize = 14;
      captureCtx.font = `${timestampFontSize}px Arial`;
      captureCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      captureCtx.fillRect(
        10, 
        captureCanvas.height - timestampFontSize - padding * 2, 
        captureCtx.measureText(timestamp).width + padding * 2, 
        timestampFontSize + padding
      );
      captureCtx.fillStyle = '#ffffff';
      captureCtx.fillText(
        timestamp, 
        10 + padding, 
        captureCanvas.height - padding - 2
      );
    });
  }
  
  // Convert canvas to image data URL
  return captureCanvas.toDataURL('image/png');
}

// Function to save image to local storage
function saveImageToLocalStorage(name, imageData) {
  // Create new face entry
  const faceEntry = {
    id: Date.now(),
    name: name,
    image: imageData,
    timestamp: new Date().toISOString()
  };
  
  // Add to saved faces array
  savedFaces.push(faceEntry);
  
  // Update local storage
  localStorage.setItem('savedFaces', JSON.stringify(savedFaces));
  
  // Update gallery display
  displaySavedFaces();
  
  return faceEntry;
}

// Function to display saved faces in the gallery
function displaySavedFaces() {
  const gallery = document.getElementById('faceGallery');
  
  // Clear current gallery
  gallery.innerHTML = '';
  
  // Check if we have any saved faces
  if (savedFaces.length === 0) {
    gallery.innerHTML = '<p>Tidak ada wajah tersimpan</p>';
    return;
  }
  
  // Sort by newest first
  const sortedFaces = [...savedFaces].sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });
  
  // Create face cards
  sortedFaces.forEach(face => {
    const card = document.createElement('div');
    card.className = 'face-card';
    
    // Create image element
    const img = document.createElement('img');
    img.src = face.image;
    img.alt = `Foto ${face.name}`;
    
    // Create info section
    const info = document.createElement('div');
    info.className = 'info';
    
    // Add name
    const nameEl = document.createElement('strong');
    nameEl.textContent = face.name;
    
    // Add date
    const dateEl = document.createElement('p');
    const date = new Date(face.timestamp);
    dateEl.textContent = date.toLocaleString();
    
    // Add delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Hapus';
    deleteBtn.onclick = () => deleteSavedFace(face.id);
    
    // Assemble card
    info.appendChild(nameEl);
    info.appendChild(dateEl);
    info.appendChild(deleteBtn);
    
    card.appendChild(img);
    card.appendChild(info);
    
    gallery.appendChild(card);
  });
}

// Function to delete a saved face
function deleteSavedFace(id) {
  // Filter out the face with the given id
  savedFaces = savedFaces.filter(face => face.id !== id);
  
  // Update localStorage
  localStorage.setItem('savedFaces', JSON.stringify(savedFaces));
  
  // Update gallery display
  displaySavedFaces();
}

// Function to download the image
function downloadImage(imageData, fileName) {
  const link = document.createElement('a');
  link.href = imageData;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

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
  
  try {
    // Capture face snapshot
    const imageData = await captureFaceSnapshot(nama);
    
    // Save to local storage
    const savedFace = saveImageToLocalStorage(nama, imageData);
    
    // Download the image
    const fileName = `${nama}_${new Date().toISOString().replace(/:/g, '-')}.png`;
    downloadImage(imageData, fileName);
    
    alert(`Wajah untuk ${nama} berhasil disimpan dan diunduh`);
  } catch (error) {
    console.error('Error saving face snapshot:', error);
    alert(`Wajah untuk ${nama} berhasil disimpan, tetapi gagal menyimpan gambar`);
  }
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

// Gambar nama di atas wajah
video.addEventListener('play', () => {
  const drawLoop = async () => {
    canvasCtx.clearRect(0, 0, overlay.width, overlay.height);

    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks().withFaceDescriptors();

    if (detections.length > 0) {
      const resized = faceapi.resizeResults(detections, {
        width: video.width,
        height: video.height
      });

      resized.forEach(detection => {
        const box = detection.detection.box;
        let name = "Unknown";
        
        // If we have a face matcher, try to get the name
        if (faceMatcher) {
          const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
          name = bestMatch.label !== 'unknown' ? bestMatch.label : 'Unknown';
        }
        
        // Improved face box with thicker border
        canvasCtx.strokeStyle = '#00ff00'; // Bright green
        canvasCtx.lineWidth = 3;
        canvasCtx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Create a better background for name display (more visible)
        const fontSize = 18;
        canvasCtx.font = `bold ${fontSize}px Arial`;
        const textMetrics = canvasCtx.measureText(name);
        const textWidth = textMetrics.width;
        const padding = 8;
        
        // Draw background for name - positioned at the top of the box
        canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        canvasCtx.fillRect(
          box.x, 
          box.y - fontSize - padding * 1.5, 
          textWidth + padding * 2, 
          fontSize + padding
        );
        
        // Draw name with shadow for better visibility
        canvasCtx.shadowColor = 'black';
        canvasCtx.shadowBlur = 4;
        canvasCtx.fillStyle = '#ffffff'; // White text
        canvasCtx.fillText(
          name, 
          box.x + padding, 
          box.y - padding
        );
        canvasCtx.shadowBlur = 0; // Reset shadow
        
        // Add a small badge indicating confidence if appropriate
        if (faceMatcher) {
          const confidence = Math.round(faceMatcher.findBestMatch(detection.descriptor).distance * 100);
          const confidenceText = `${100 - confidence}%`;
          
          // Only show confidence if we have a match better than 'unknown'
          if (name !== 'Unknown') {
            const smallFontSize = 12;
            canvasCtx.font = `${smallFontSize}px Arial`;
            const smallTextWidth = canvasCtx.measureText(confidenceText).width;
            
            // Background for confidence display
            canvasCtx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            canvasCtx.fillRect(
              box.x + box.width - smallTextWidth - padding * 2, 
              box.y + box.height, 
              smallTextWidth + padding * 2, 
              smallFontSize + padding
            );
            
            // Draw confidence text
            canvasCtx.fillStyle = '#ffffff';
            canvasCtx.fillText(
              confidenceText, 
              box.x + box.width - smallTextWidth - padding, 
              box.y + box.height + smallFontSize
            );
          }
        }
      });
    }

    requestAnimationFrame(drawLoop);
  };

  drawLoop();
});
