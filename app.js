// Configuração da API/WebSocket do Node-RED
const CONFIG = {
    // URL base do Node-RED
    nodeRedUrl: 'http://127.0.0.1:1880',
    // Opção 1: Endpoint HTTP do Node-RED (polling)
    apiUrl: 'http://127.0.0.1:1880/api/printers',
    // Opção 2: WebSockets individuais para cada impressora
    wsBaseUrl: 'ws://127.0.0.1:1880/ws',
    // Intervalo de atualização em milissegundos (para polling)
    updateInterval: 5000,
    // Usar WebSocket se disponível
    useWebSocket: true
};

// Estado das impressoras
let printers = [
    { id: 'printer-1', name: 'Impressora 1', status: 'offline', distance: null, lastUpdate: null },
    { id: 'printer-2', name: 'Impressora 2', status: 'offline', distance: null, lastUpdate: null },
    { id: 'printer-3', name: 'Impressora 3', status: 'offline', distance: null, lastUpdate: null },
    { id: 'printer-4', name: 'Impressora 4', status: 'offline', distance: null, lastUpdate: null }
];

// Mapeamento de impressoras para endpoints WebSocket
const printerWsMap = {
    'printer-1': 'impressora1',
    'printer-2': 'impressora2',
    'printer-3': 'impressora3',
    'printer-4': 'impressora4'
};

let wsConnections = {}; // Objeto para armazenar todas as conexões WebSocket
let updateTimer = null;
let connectedCount = 0; // Contador de conexões ativas

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    renderPrinters();
    updateStatusOverview();
    
    if (CONFIG.useWebSocket) {
        connectWebSocket();
    } else {
        startPolling();
    }
});

// Conectar via WebSocket para cada impressora
function connectWebSocket() {
    // Conectar a cada impressora individualmente
    printers.forEach(printer => {
        connectPrinterWebSocket(printer.id);
    });
}

// Conectar WebSocket para uma impressora específica
function connectPrinterWebSocket(printerId) {
    const wsEndpoint = printerWsMap[printerId];
    if (!wsEndpoint) {
        console.error(`Endpoint WebSocket não encontrado para ${printerId}`);
        return;
    }
    
    const wsUrl = `${CONFIG.wsBaseUrl}/${wsEndpoint}`;
    
    try {
        const ws = new WebSocket(wsUrl);
        let wasConnected = false; // Flag para rastrear se estava conectado
        
        wsConnections[printerId] = ws; // Armazenar referência imediatamente
        
        ws.onopen = () => {
            console.log(`WebSocket conectado: ${printerId} (${wsEndpoint})`);
            wasConnected = true;
            connectedCount++;
            updateConnectionStatus(connectedCount > 0);
        };
        
        ws.onmessage = (event) => {
            try {
                // Processar dados recebidos do WebSocket
                let rawData = event.data;
                let distance = null;
                let status = null;
                let timestamp = new Date().toISOString();
                
                // Debug: ver o que está chegando
                console.log(`Dados recebidos de ${printerId}:`, rawData, `(tipo: ${typeof rawData})`);
                
                // Caso 1: Se vier como número
                if (typeof rawData === 'number') {
                    distance = rawData;
                }
                // Caso 2: Se vier como string
                else if (typeof rawData === 'string') {
                    // Tentar parsear como JSON primeiro
                    try {
                        const parsed = JSON.parse(rawData);
                        // Se parseou com sucesso e é um objeto
                        if (typeof parsed === 'object' && parsed !== null) {
                            // Verificar se tem payload (formato Node-RED com payload aninhado)
                            let dataToProcess = parsed;
                            if (parsed.payload) {
                                // Se payload é string, fazer parse novamente
                                if (typeof parsed.payload === 'string') {
                                    try {
                                        dataToProcess = JSON.parse(parsed.payload);
                                    } catch (e) {
                                        console.warn(`Erro ao parsear payload de ${printerId}:`, e);
                                        dataToProcess = parsed;
                                    }
                                } else {
                                    // Se payload já é objeto, usar diretamente
                                    dataToProcess = parsed.payload;
                                }
                            }
                            
                            // Aceitar tanto "distance" (inglês) quanto "distancia" (português)
                            distance = (dataToProcess.distance !== undefined) ? parseFloat(dataToProcess.distance) : 
                                      (dataToProcess.distancia !== undefined) ? parseFloat(dataToProcess.distancia) : null;
                            status = dataToProcess.status || null;
                            timestamp = dataToProcess.timestamp || timestamp;
                        } 
                        // Se parseou mas não é objeto (pouco provável, mas possível)
                        else if (typeof parsed === 'number') {
                            distance = parsed;
                        }
                    } catch (e) {
                        // Se não for JSON válido, tentar como número simples
                        const parsedNumber = parseFloat(rawData);
                        if (!isNaN(parsedNumber)) {
                            distance = parsedNumber;
                        }
                    }
                }
                // Caso 3: Se vier como objeto (Blob ou Object)
                else if (typeof rawData === 'object' && rawData !== null) {
                    // Se for Blob/ArrayBuffer, não tratamos aqui
                    if (rawData instanceof Blob || rawData instanceof ArrayBuffer) {
                        console.warn(`Tipo de dado não suportado: Blob/ArrayBuffer de ${printerId}`);
                        return;
                    }
                    // Verificar se tem payload (formato Node-RED com payload aninhado)
                    let dataToProcess = rawData;
                    if (rawData.payload) {
                        // Se payload é string, fazer parse
                        if (typeof rawData.payload === 'string') {
                            try {
                                dataToProcess = JSON.parse(rawData.payload);
                            } catch (e) {
                                console.warn(`Erro ao parsear payload de ${printerId}:`, e);
                                dataToProcess = rawData;
                            }
                        } else {
                            // Se payload já é objeto, usar diretamente
                            dataToProcess = rawData.payload;
                        }
                    }
                    // Se for objeto normal
                    // Aceitar tanto "distance" (inglês) quanto "distancia" (português)
                    distance = (dataToProcess.distance !== undefined) ? parseFloat(dataToProcess.distance) : 
                              (dataToProcess.distancia !== undefined) ? parseFloat(dataToProcess.distancia) : null;
                    status = dataToProcess.status || null;
                    timestamp = dataToProcess.timestamp || timestamp;
                }
                
                // Validar se a distância é um número válido
                if (distance !== null && (isNaN(distance) || !isFinite(distance))) {
                    console.warn(`Distância inválida recebida de ${printerId}:`, distance);
                    distance = null;
                }
                
                // Processar dados recebidos
                const printerData = {
                    id: printerId,
                    distance: distance,
                    status: status,
                    timestamp: timestamp
                };
                
                console.log(`Dados processados para ${printerId}:`, printerData);
                
                // Atualizar impressora
                updatePrinter(printerId, printerData);
                renderPrinters();
                updateStatusOverview();
                
            } catch (error) {
                console.error(`Erro ao processar dados do WebSocket (${printerId}):`, error);
                console.error('Dados originais:', event.data);
            }
        };
        
        ws.onerror = (error) => {
            console.error(`Erro no WebSocket (${printerId}):`, error);
            // Não decrementar aqui, pois o erro pode acontecer antes de onopen
        };
        
        ws.onclose = () => {
            console.log(`WebSocket desconectado: ${printerId}`);
            
            // Só decrementar se realmente estava conectado
            if (wasConnected) {
                connectedCount = Math.max(0, connectedCount - 1);
                wasConnected = false;
            }
            
            delete wsConnections[printerId];
            updateConnectionStatus(connectedCount > 0);
            
            // Se nenhuma conexão estiver ativa, tentar polling
            if (connectedCount === 0 && !updateTimer) {
                startPolling();
            }
            
            // Tentar reconectar após 5 segundos
            setTimeout(() => {
                if (!wsConnections[printerId] || (wsConnections[printerId] && wsConnections[printerId].readyState === WebSocket.CLOSED)) {
                    connectPrinterWebSocket(printerId);
                }
            }, 5000);
        };
        
    } catch (error) {
        console.error(`Erro ao conectar WebSocket (${printerId}):`, error);
    }
}

// Polling via HTTP
function startPolling() {
    fetchPrinterData();
    updateTimer = setInterval(fetchPrinterData, CONFIG.updateInterval);
}

function fetchPrinterData() {
    fetch(CONFIG.apiUrl)
        .then(response => {
            if (!response.ok) throw new Error('Erro na resposta da API');
            updateConnectionStatus(true);
            return response.json();
        })
        .then(data => {
            handlePrinterData(data);
        })
        .catch(error => {
            console.error('Erro ao buscar dados:', error);
            updateConnectionStatus(false);
        });
}

// Processar dados recebidos
function handlePrinterData(data) {
    // Formato esperado: { printerId: { status, distance, timestamp }, ... }
    // ou array: [{ id, status, distance, timestamp }, ...]
    
    if (Array.isArray(data)) {
        data.forEach(printer => {
            updatePrinter(printer.id || printer.printerId, printer);
        });
    } else {
        Object.keys(data).forEach(printerId => {
            updatePrinter(printerId, data[printerId]);
        });
    }
    
    renderPrinters();
    updateStatusOverview();
}

// Atualizar dados de uma impressora
function updatePrinter(printerId, data) {
    const printer = printers.find(p => p.id === printerId);
    if (printer) {
        // Normalizar status: primeiro tenta normalizar o status recebido,
        // se não conseguir, determina baseado na distância
        const normalizedStatus = normalizeStatus(data.status);
        printer.status = normalizedStatus || determineStatus(data.distance);
        
        // Tratar corretamente: usar !== undefined para permitir 0 como valor válido
        printer.distance = (data.distance !== undefined && data.distance !== null) ? data.distance : null;
        printer.lastUpdate = data.timestamp || new Date().toISOString();
        
        // Campos opcionais
        if (data.name) printer.name = data.name;
        if (data.progress !== undefined) printer.progress = data.progress;
    }
}

// Normalizar status (mapear português para inglês)
function normalizeStatus(status) {
    if (!status || typeof status !== 'string') {
        return null;
    }
    
    const statusLower = status.toLowerCase().trim();
    
    // Mapeamento de status em português para inglês
    const statusMap = {
        'impressora funcionando': 'online',
        'funcionando': 'online',
        'online': 'online',
        'imprimindo': 'printing',
        'printing': 'printing',
        'em uso': 'printing',
        'ocupada': 'printing',
        'offline': 'offline',
        'desligada': 'offline',
        'parada': 'offline',
        'sem sinal': 'offline'
    };
    
    // Verificar mapeamento direto
    if (statusMap[statusLower]) {
        return statusMap[statusLower];
    }
    
    // Verificar se contém palavras-chave
    if (statusLower.includes('imprimindo') || statusLower.includes('printing') || statusLower.includes('em uso')) {
        return 'printing';
    }
    if (statusLower.includes('funcionando') || statusLower.includes('online') || statusLower.includes('livre')) {
        return 'online';
    }
    if (statusLower.includes('offline') || statusLower.includes('desligada') || statusLower.includes('parada')) {
        return 'offline';
    }
    
    // Se não encontrar correspondência, retorna null para usar determinação por distância
    return null;
}

// Determinar status baseado na distância
function determineStatus(distance) {
    if (distance === null || distance === undefined) {
        return 'offline';
    }
    
    // Valores de referência (ajustar conforme necessidade)
    // Distância pequena = impressora ocupada/imprimindo
    // Distância grande = impressora livre
    const PRINTING_DISTANCE_THRESHOLD = 50; // mm (ajustar conforme sensor)
    const OFFLINE_THRESHOLD = 500; // mm (ajustar conforme sensor)
    
    if (distance > OFFLINE_THRESHOLD) {
        return 'offline';
    } else if (distance < PRINTING_DISTANCE_THRESHOLD) {
        return 'printing';
    } else {
        return 'online';
    }
}

// Renderizar cards das impressoras
function renderPrinters() {
    const grid = document.getElementById('printers-grid');
    grid.innerHTML = printers.map(printer => createPrinterCard(printer)).join('');
}

// Criar HTML do card de impressora
function createPrinterCard(printer) {
    const statusText = {
        'online': 'Online',
        'offline': 'Offline',
        'printing': 'Imprimindo'
    };
    
    const distanceDisplay = (printer.distance !== null && printer.distance !== undefined && !isNaN(printer.distance))
        ? `${printer.distance.toFixed(1)} mm`
        : 'N/A';
    
    const lastUpdate = printer.lastUpdate 
        ? formatTime(printer.lastUpdate)
        : 'Nunca';
    
    const distanceBar = (printer.distance !== null && printer.distance !== undefined && !isNaN(printer.distance))
        ? createDistanceBar(printer.distance)
        : '<span>Sem dados</span>';
    
    // Imagem da impressora baseada no ID
    let printerImage;
    const printerNum = printer.id.replace('printer-', '');
    if (printerNum === '1' || printerNum === '2') {
        printerImage = '/img/creality.jpg';
    } else if (printerNum === '3') {
        printerImage = '/img/bambu.jpg';
    } else if (printerNum === '4') {
        printerImage = '/img/bambu2.jpg';
    } else {
        printerImage = '/img/creality.jpg'; // fallback
    }
    
    return `
        <div class="printer-card status-${printer.status}">
            <div class="printer-header">
                <div class="printer-header-content">
                    <img src="/img/icon.png" alt="Impressora Icon" class="printer-icon">
                    <div class="printer-header-info">
                        <div class="printer-name">${printer.name}</div>
                        <div class="printer-id">${printer.id}</div>
                    </div>
                </div>
                <div class="status-badge ${printer.status}">${statusText[printer.status]}</div>
            </div>
            <div class="printer-image-container">
                <img src="${printerImage}" alt="${printer.name}" class="printer-image" onerror="this.parentElement.innerHTML='<div class=\\'printer-image-placeholder\\'>🖨️ Impressora 3D</div>'">
            </div>
            <div class="printer-card-content">
                <div class="printer-info">
                    <div class="info-row">
                        <span class="info-label">Status:</span>
                        <span class="info-value">${statusText[printer.status]}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Distância:</span>
                        <span class="info-value">${distanceDisplay}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Sensor:</span>
                        <div class="info-value distance-indicator">
                            ${distanceBar}
                        </div>
                    </div>
                </div>
                <div class="last-update">
                    Última atualização: ${lastUpdate}
                </div>
            </div>
        </div>
    `;
}

// Criar barra de distância visual
function createDistanceBar(distance) {
    // Normalizar distância para porcentagem (0-100mm = 0-100%)
    // Ajustar conforme a faixa de medição do seu sensor
    const maxDistance = 300; // mm
    const percentage = Math.min((distance / maxDistance) * 100, 100);
    
    let fillClass = 'distance-fill';
    if (percentage < 20) {
        fillClass += ' danger'; // Muito perto = possível problema
    } else if (percentage < 50) {
        fillClass += ' warning'; // Atenção
    }
    
    return `
        <div class="distance-bar">
            <div class="${fillClass}" style="width: ${percentage}%"></div>
        </div>
        <span>${distance.toFixed(1)}mm</span>
    `;
}

// Atualizar overview de status
function updateStatusOverview() {
    const active = printers.filter(p => p.status === 'printing' || p.status === 'online').length;
    const stopped = printers.filter(p => p.status === 'offline').length;
    
    document.getElementById('active-count').textContent = active;
    document.getElementById('stopped-count').textContent = stopped;
}

// Atualizar status de conexão
function updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connection-status');
    const dotEl = statusEl.querySelector('.status-dot');
    const textEl = document.getElementById('status-text');
    
    if (connected) {
        dotEl.classList.add('connected');
        textEl.textContent = `Conectado (${connectedCount}/4)`;
    } else {
        dotEl.classList.remove('connected');
        textEl.textContent = `Desconectado (${connectedCount}/4)`;
    }
}

// Formatar tempo
function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (seconds < 60) {
        return `há ${seconds}s`;
    } else if (minutes < 60) {
        return `há ${minutes}min`;
    } else if (hours < 24) {
        return `há ${hours}h`;
    } else {
        return date.toLocaleDateString('pt-BR');
    }
}

// Expor função global para atualização manual via console
window.updatePrinterStatus = function(printerId, status, distance) {
    updatePrinter(printerId, {
        status: status,
        distance: distance,
        timestamp: new Date().toISOString()
    });
    renderPrinters();
    updateStatusOverview();
};

// Expor função para receber dados do Node-RED via HTTP POST
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'printer-update') {
        handlePrinterData(event.data.data);
    }
});


