// Arquivo de configuração exemplo
// Renomeie para config.js e ajuste conforme necessário

const CONFIG = {
    // URL do Node-RED (ajuste conforme seu ambiente)
    nodeRedUrl: 'http://localhost:1880',
    
    // Opção 1: Endpoint HTTP para polling
    apiUrl: 'http://localhost:1880/api/printers',
    
    // Opção 2: WebSocket (recomendado para atualizações em tempo real)
    wsUrl: 'ws://localhost:1880/ws/printers',
    
    // Intervalo de atualização em milissegundos (apenas para polling)
    updateInterval: 5000, // 5 segundos
    
    // Usar WebSocket se disponível, caso contrário usar polling
    useWebSocket: true,
    
    // Thresholds de distância para determinar status (ajuste conforme seu sensor)
    thresholds: {
        printing: 50,   // mm - distância abaixo disso = imprimindo
        offline: 300    // mm - distância acima disso = offline
    },
    
    // Nomes das impressoras (opcional, caso queira personalizar)
    printerNames: {
        'printer-1': 'Impressora Alpha',
        'printer-2': 'Impressora Beta',
        'printer-3': 'Impressora Gamma',
        'printer-4': 'Impressora Delta'
    },
    
    // Configurações de notificação Discord (opcional)
    discord: {
        enabled: false,
        webhookUrl: '', // URL do webhook do Discord
        notifyOnStatusChange: true, // Notificar quando status mudar
        notifyOnOffline: true // Notificar quando impressora ficar offline
    }
};

// Se estiver usando como módulo
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

