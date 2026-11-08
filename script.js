
const $ = s => document.querySelector(s);

const file = $('#file');
const photo = $('#photo');
const video = $('#video');
const placeholder = $('#placeholder');
const status = $('#status');
const result = $('#result');

const MODEL_URL =
  'https://teachablemachine.withgoogle.com/models/5TM52DP1z/';

let model = null;
let stream = null;
let analyzing = false;
let history = [];

const categories = {
  saludable: {
    title: 'Comida saludable',
    icon: '🥗',
    css: '',
    description: 'La IA clasificó la imagen como comida saludable.',
    advice: 'Procura mantener una alimentación variada y equilibrada.'
  },
  noSaludable: {
    title: 'Comida no saludable',
    icon: '🍟',
    css: 'orange',
    description: 'La IA clasificó la imagen como comida no saludable.',
    advice: 'Considera la frecuencia de consumo y el equilibrio de tu alimentación.'
  },
  nada: {
    title: 'Nada',
    icon: '🔎',
    css: 'gray',
    description: 'La IA clasificó la imagen como Nada.',
    advice: 'Intenta con una imagen clara y bien iluminada.'
  }
};

// Cargar el modelo real
async function getModel() {
  if (model) return model;

  status.textContent = 'Cargando inteligencia artificial...';

  model = await tmImage.load(
    MODEL_URL + 'model.json',
    MODEL_URL + 'metadata.json'
  );

  console.log('Modelo cargado:', model.getClassLabels());
  status.textContent = '¡IA lista!';
  return model;
}

// Subir imagen
file.addEventListener('change', event => {
  const selected = event.target.files[0];
  if (!selected) return;

  if (!selected.type.startsWith('image/')) {
    status.textContent = 'Selecciona una imagen válida.';
    return;
  }

  photo.src = URL.createObjectURL(selected);
  photo.hidden = false;
  video.hidden = true;
  placeholder.hidden = true;
  result.classList.add('hidden');

  status.textContent = 'Imagen cargada. Pulsa Analizar imagen.';
});

// Abrir cámara
$('#camera').addEventListener('click', async () => {
  try {
    stopCamera();

    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });

    video.srcObject = stream;
    await video.play();

    video.hidden = false;
    photo.hidden = true;
    placeholder.hidden = true;
    $('#capture').hidden = false;
    result.classList.add('hidden');

    status.textContent = 'Cámara activa.';
  } catch (error) {
    console.error(error);
    status.textContent =
      'No se pudo abrir la cámara. Usa HTTPS o localhost.';
  }
});

// Detener cámara
function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  video.srcObject = null;
}

// Capturar foto
$('#capture').addEventListener('click', () => {
  if (!video.videoWidth) {
    status.textContent = 'Espera a que la cámara esté lista.';
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  canvas.getContext('2d').drawImage(
    video, 0, 0, canvas.width, canvas.height
  );

  photo.src = canvas.toDataURL('image/jpeg');
  photo.hidden = false;
  video.hidden = true;
  $('#capture').hidden = true;

  stopCamera();
  status.textContent = 'Foto capturada. Pulsa Analizar imagen.';
});

// Analizar con IA
$('#analyze').addEventListener('click', async () => {
  if (analyzing) return;

  let image = null;

  if (!photo.hidden && photo.src) {
    image = photo;
  } else if (!video.hidden && video.videoWidth > 0) {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    canvas.getContext('2d').drawImage(
      video, 0, 0, canvas.width, canvas.height
    );

    photo.src = canvas.toDataURL('image/jpeg');
    photo.hidden = false;
    video.hidden = true;
    $('#capture').hidden = true;

    stopCamera();
    image = photo;
  } else {
    status.textContent = 'Primero sube una foto o abre la cámara.';
    return;
  }

  analyzing = true;
  $('#analyze').disabled = true;

  try {
    status.textContent = 'Analizando imagen...';

    const ai = await getModel();
    const predictions = await ai.predict(image);
    

    if (!predictions.length) {
      throw new Error('El modelo no devolvió predicciones.');
    }

    const best = predictions.reduce((a, b) =>
      b.probability > a.probability ? b : a
    );

    const label = best.className.trim().toLowerCase()
      .replace(/[_-]+/g, ' ');

    let key;

    if (label.includes('no saludable')) {
      key = 'noSaludable';
    } else if (label.includes('saludable')) {
      key = 'saludable';
    } else if (label === 'nada') {
      key = 'nada';
    } else {
      throw new Error('Clase no reconocida: ' + best.className);
    }

    showResult(key, best.className, best.probability, photo.src);

    history.unshift({
      name: categories[key].title,
      confidence: best.probability * 100
    });

    history = history.slice(0, 10);
    renderHistory();

  } catch (error) {
    console.error(error);
    status.textContent =
      'Error al analizar. Comprueba que el modelo esté publicado y vuelve a intentarlo.';
  } finally {
    analyzing = false;
    $('#analyze').disabled = false;
  }
});

// Mostrar resultado
function showResult(key, originalLabel, probability, imageUrl) {
  const item = categories[key];

  result.className = 'result ' + item.css;
  result.replaceChildren();

  const main = document.createElement('div');
  main.className = 'result-main';

  const picture = document.createElement('div');
  picture.className = 'result-photo';

  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = 'Imagen analizada';
  picture.appendChild(img);

  const details = document.createElement('div');

  const heading = document.createElement('b');
  heading.style.color = '#078653';
  heading.textContent = 'Resultado de la IA';

  const title = document.createElement('h3');
  title.textContent = item.title;

  const description = document.createElement('p');
  description.textContent = item.description;

  const className = document.createElement('p');
  className.textContent = 'Clase detectada: ' + originalLabel;

  const confidence = document.createElement('p');
  confidence.textContent =
    'Confianza: ' + (probability * 100).toFixed(1) + '%';

  details.append(heading, title, description, className, confidence);
  main.append(picture, details);

  const infos = document.createElement('div');
  infos.className = 'infos';

  [
    ['👥 Grupo', item.title],
    ['🛡️ Clasificación', 'Resultado del modelo entrenado'],
    ['💡 Recomendación', item.advice]
  ].forEach(([headingText, valueText]) => {
    const box = document.createElement('div');
    box.className = 'info';

    const bold = document.createElement('b');
    bold.textContent = headingText;

    const span = document.createElement('span');
    span.textContent = valueText;

    box.append(bold, span);
    infos.appendChild(box);
  });

  result.append(main, infos);
  result.classList.remove('hidden');
  result.scrollIntoView({ behavior: 'smooth' });

  status.textContent = 'Análisis completado.';
}

// Historial de análisis reales de la sesión
function renderHistory() {
  const list = $('#history-list');
  if (!list) return;

  list.replaceChildren();

  if (!history.length) {
    const empty = document.createElement('p');
    empty.textContent = 'Todavía no has analizado alimentos.';
    list.appendChild(empty);
    return;
  }

  history.forEach(item => {
    const row = document.createElement('div');
    row.className = 'row';

    const icon = document.createElement('span');
    icon.textContent = '🔎';

    const name = document.createElement('b');
    name.textContent = item.name;

    const badge = document.createElement('span');
    badge.className = 'pill pgreen';
    badge.textContent = item.confidence.toFixed(1) + '%';

    row.append(icon, name, badge);
    list.appendChild(row);
  });
}

renderHistory();

// Menú móvil
$('.menu').addEventListener('click', () => {
  const nav = document.querySelector('.nav nav');
  const open = nav.style.display === 'flex';

  nav.style.display = open ? 'none' : 'flex';
  nav.style.flexDirection = 'column';
  nav.style.position = 'absolute';
  nav.style.top = '72px';
  nav.style.right = '0';
  nav.style.background = '#fff';
  nav.style.padding = '18px 25px';
});

// Cargar el modelo al abrir la página
getModel().catch(error => {
  console.error('No se pudo iniciar la IA:', error);
  status.textContent =
    'No se pudo cargar la IA. Verifica la conexión y la URL del modelo.';
});

