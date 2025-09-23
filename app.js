const STORAGE_KEY = 'incidentes_sjl_v1'

/* Inicializa la app: eventos, mapa y render */
function initApp() {
    setupNavigation()
    bindFormEvents()
    renderTimestamp()
    displayIncidents()
    initMap()  
    initMapPreview();
}

/* Navegación entre vistas */
function setupNavigation() {
    const btns = document.querySelectorAll('.nav-btn')
    btns.forEach(b => b.addEventListener('click', () => {
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'))
        document.getElementById(b.dataset.view).classList.remove('hidden')
        btns.forEach(x => x.classList.remove('active'))
        b.classList.add('active')
    }));

    // shortcuts desde sección "Incidencias"
    document.getElementById('irRegistrar').addEventListener('click', () => document.querySelector('[data-view="registrar"]').click())
    document.getElementById('irLista').addEventListener('click', () => document.querySelector('[data-view="lista"]').click())
    document.getElementById('cerrarSesion').addEventListener('click', () => {
        if (confirm('¿Cerrar vista de incidencias?')) document.querySelector('[data-view="inicio"]').click()
    })
}

/* Generador de códigos numéricos únicos (6 dígitos) */
function generateUniqueCode() {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    let code;
    do {
        code = Math.floor(100000 + Math.random() * 900000).toString()
    } while (items.some(i => i.code === code))
    return code;
}

/* Valida campos básicos antes de guardar */
function validateForm({name, type, location, reportedBy}) {
    const textRegex = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9\s\-\.,]{3,120}$/
    if (!textRegex.test(name)) return 'Nombre de incidencia inválido (usa texto, mínimo 3 caracteres).'
    if (!type || type.length < 1) return 'Selecciona la tipología.'
    if (!textRegex.test(location)) return 'Ubicación inválida.'
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]{3,80}$/.test(reportedBy)) return 'Nombre de quien registra inválido.'
    return null;
}

/* Comprueba duplicados: misma descripción + ubicación en el mismo día */
function isDuplicate({name, location, timestamp}) {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    const today = new Date(timestamp).toDateString()
    return items.some(i => i.name === name && i.location === location && new Date(i.timestamp).toDateString() === today)
}

/* Registro de incidencia */
function registerIncident(event, forcedStatus = null) {
    if (event) event.preventDefault()

    const name = document.getElementById('incidentName').value.trim()
    const type = document.getElementById('incidentType').value
    const status = forcedStatus || document.getElementById('incidentStatus').value
    const location = document.getElementById('incidentLocation').value.trim()
    const timestamp = new Date().toISOString()
    const lat = document.getElementById('incidentLat').value || null
    const lng = document.getElementById('incidentLng').value || null
    const reportedBy = document.getElementById('reportedBy').value.trim()

    const validationError = validateForm({name,type,location,reportedBy})
    if (validationError) {
        alert(validationError)
        return
    }

    if (isDuplicate({name, location, timestamp})) {
        alert('Ya existe una incidencia similar registrada hoy. Evita duplicados.')
        return
    }

    const code = generateUniqueCode();
    const incident = { code, name, type, status, location, timestamp, lat, lng, reportedBy }

    const items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    items.push(incident);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (e) {
        alert('Error guardando incidencia. Espacio de almacenamiento insuficiente.')
        return
    }

    displayIncidents();
    document.getElementById('incidentForm').reset()
    renderTimestamp();
    document.getElementById('incidentCode').value = generateUniqueCode()
    alert('Incidencia registrada correctamente. Código: ' + code)
}

/* Mostrar lista de incidencias en tabla */
function displayIncidents() {
    const incidents = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
    const tbody = document.getElementById('incidentList')
    tbody.innerHTML = ''

    incidents.forEach((inc, idx) => {
        const tr = document.createElement('tr')

        const tdCode = document.createElement('td'); tdCode.textContent = inc.code; tr.appendChild(tdCode)
        const tdName = document.createElement('td'); tdName.textContent = inc.name; tr.appendChild(tdName)
        const tdType = document.createElement('td'); tdType.textContent = inc.type; tr.appendChild(tdType)

        const tdStatus = document.createElement('td')
        const span = document.createElement('span')
        span.className = `status-chip status-${inc.status.replace(/\s/g,'\\ ')}`
        span.textContent = inc.status
        tdStatus.appendChild(span)
        tr.appendChild(tdStatus)

        const tdLoc = document.createElement('td'); tdLoc.textContent = inc.location; tr.appendChild(tdLoc);
        const tdTime = document.createElement('td'); tdTime.textContent = new Date(inc.timestamp).toLocaleString(); tr.appendChild(tdTime);
        const tdReporter = document.createElement('td'); tdReporter.textContent = inc.reportedBy; tr.appendChild(tdReporter);

        const tdActions = document.createElement('td')
        const btnEdit = document.createElement('button'); btnEdit.textContent = 'Editar'; btnEdit.className='action-btn action-edit';
        btnEdit.addEventListener('click', () => editIncident(idx))
        tdActions.appendChild(btnEdit)

        const btnFinalize = document.createElement('button'); btnFinalize.textContent = 'Finalizar'; btnFinalize.className='action-btn';
        btnFinalize.style.background='#0aa66f'; btnFinalize.style.color='#fff';
        btnFinalize.addEventListener('click', () => finalizeIncident(idx))
        tdActions.appendChild(btnFinalize)

        const btnDelete = document.createElement('button'); btnDelete.textContent = 'Eliminar'; btnDelete.className='action-btn action-delete';
        btnDelete.addEventListener('click', () => deleteIncident(idx))
        tdActions.appendChild(btnDelete)

        tr.appendChild(tdActions)
        tbody.appendChild(tr)
    });
}

/* Editar incidencia  */
function editIncident(index) {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    const inc = items[index]
    if (!inc) return

    const newName = prompt('Editar nombre de incidencia:', inc.name) || inc.name;
    const newType = prompt('Editar tipología:', inc.type) || inc.type;
    const newLocation = prompt('Editar ubicación:', inc.location) || inc.location;
    const newReportedBy = prompt('Editar nombre de quien registra:', inc.reportedBy) || inc.reportedBy;

    const validationError = validateForm({name:newName,type:newType,location:newLocation,reportedBy:newReportedBy});
    if (validationError) { alert(validationError); return; }

    inc.name = newName.trim()
    inc.type = newType.trim()
    inc.location = newLocation.trim()
    inc.reportedBy = newReportedBy.trim()
    items[index] = inc
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    displayIncidents()
}

/* Finalizar incidencia */
function finalizeIncident(index) {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    if (!items[index]) return;
    if (!confirm('Marcar como RESUELTA esta incidencia?')) return;
    items[index].status = 'Resuelta';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    displayIncidents()
}

/* Eliminar incidencia */
function deleteIncident(index) {
    const items = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    if (!items[index]) return;
    if (!confirm('Eliminar incidencia permanentemente?')) return;
    items.splice(index,1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    displayIncidents();
}

/* Render timestamp y código al abrir el formulario */
function renderTimestamp() {
    const ts = new Date()
    document.getElementById('incidentTimestamp').value = ts.toLocaleString();
    document.getElementById('incidentCode').value = generateUniqueCode();
}

/* Bind de eventos del formulario y botones */
function bindFormEvents() {
    document.getElementById('incidentForm').addEventListener('submit', (e) => registerIncident(e, null));
    document.getElementById('btnFinalize').addEventListener('click', () => registerIncident(null, 'Resuelta'));
    document.getElementById('btnCloseForm').addEventListener('click', () => {
        if (confirm('Cerrar y limpiar formulario?')) {
            document.getElementById('incidentForm').reset()
            renderTimestamp()
            // limpiar lat/lng
            document.getElementById('incidentLat').value = ''
            document.getElementById('incidentLng').value = ''
        }
    })
}

/* --MAPA PRINCIPAL- */
let mainMap
function initMap() {
    try {
        mainMap = L.map('map').setView([-12.02, -76.98], 13); // San Juan de Lurigancho aprox.
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(mainMap)

        // Zonas 
        const zones = {
            'Norte': { coords: [[-11.98,-76.99],[-11.98,-76.96],[-12.01,-76.96],[-12.01,-76.99]], color:'#2ecc71' },
            'Centro': { coords: [[-12.01,-76.99],[-12.01,-76.96],[-12.04,-76.96],[-12.04,-76.99]], color:'#f1c40f' },
            'Sur': { coords: [[-12.04,-76.99],[-12.04,-76.96],[-12.07,-76.96],[-12.07,-76.99]], color:'#3498db' }
        }

        Object.keys(zones).forEach(z => {
            const poly = L.polygon(zones[z].coords, {color: zones[z].color, weight:1, fillOpacity:0.12}).addTo(mainMap);
            poly.bindPopup(`<strong>Zona ${z}</strong>`)
        })

        // Ejemplo de cámaras
        const cameras = [
            {lat:-12.02, lng:-76.98, name:'Cámara 001 - Av. Próceres', zone:'Centro'},
            {lat:-11.99, lng:-76.975, name:'Cámara 023 - Alameda', zone:'Norte'},
            {lat:-12.05, lng:-76.98, name:'Cámara 110 - Col. Los Jardines', zone:'Sur'}
        ];
        cameras.forEach(c => {
            L.marker([c.lat, c.lng]).addTo(mainMap).bindPopup(`<strong>${c.name}</strong><br/>Zona: ${c.zone}`)
        })

    } catch (e) {
        console.error('Error inicializando mapa principal', e);
        document.getElementById('map').textContent = 'No se pudo cargar el mapa. Verifica la conexión.';
    }
}

/* --- MAPA PREVIEW para seleccionar lat/lng en el formulario --- */
let previewMap, previewMarker

/* Reverse geocoding usando Nominatim (OpenStreetMap) */
async function reverseGeocode(lat, lng) {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=es`
        const res = await fetch(url)
        if (!res.ok) throw new Error('Respuesta no válida del servicio de geocodificación')
        const data = await res.json()
        return data.display_name || null;
    } catch (e) {
        console.warn('Error reverseGeocode:', e)
        return null
    }
}

function initMapPreview() {
    try {
        previewMap = L.map('mapPreview').setView([-12.02, -76.98], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(previewMap);

        previewMap.on('click', async (e) => {
            const { lat, lng } = e.latlng
            if (previewMarker) previewMap.removeLayer(previewMarker)
            previewMarker = L.marker([lat, lng]).addTo(previewMap)

            // guardar coordenadas
            document.getElementById('incidentLat').value = lat.toFixed(6)
            document.getElementById('incidentLng').value = lng.toFixed(6)
            // mostrar "buscando..." mientras hace reverse geocode
            previewMarker.bindPopup('Buscando dirección...').openPopup()

            const address = await reverseGeocode(lat, lng)
            const locationInput = document.getElementById('incidentLocation')
            if (address) {
                locationInput.value = address;
                previewMarker.setPopupContent(address).openPopup()
            } else {
                const coordsText = `Coordenadas: ${lat.toFixed(6)}, ${lng.toFixed(6)}`
                locationInput.value = coordsText;
                previewMarker.setPopupContent(coordsText).openPopup()
            }
        });
    } catch(e) {
        console.error('Error inicializando mapa preview', e)
        document.getElementById('mapPreview').textContent = 'Mapa no disponible.'
    }
}

window.addEventListener('load', initApp)
