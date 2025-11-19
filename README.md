# MetaBee Dashboard - Monitoramento de Impressoras 3D

Dashboard web para monitoramento em tempo real de 4 impressoras 3D usando sensores de distância ESP32 e Node-RED.

## 🎨 Cores MetaBee
- **Amarelo** (#FFC107): Destaques e branding
- **Cinza** (#757575): Textos secundários
- **Branco** (#FFFFFF): Fundo dos cards
- **Preto** (#212121): Textos principais

## 🚀 Como Usar

### 1. Servidor Local Simples

Para testar localmente, você pode usar um servidor HTTP simples:

**Python:**
```bash
python -m http.server 8000
```

**Node.js:**
```bash
npx http-server -p 8000
```

Acesse: `http://localhost:8000`

### 2. Integração com Node-RED

#### Opção A: HTTP Endpoint (Polling)

No Node-RED, crie um endpoint HTTP que retorne os dados das impressoras:

**Fluxo Node-RED:**
```
[HTTP In] -> [Function] -> [HTTP Response]
```

**Endpoint:** `GET /api/printers`

**Formato de Resposta:**
```json
{
  "printer-1": {
    "status": "printing",
    "distance": 45.2,
    "timestamp": "2024-01-15T10:30:00Z"
  },
  "printer-2": {
    "status": "online",
    "distance": 120.5,
    "timestamp": "2024-01-15T10:29:55Z"
  },
  "printer-3": {
    "status": "offline",
    "distance": null,
    "timestamp": "2024-01-15T10:25:00Z"
  },
  "printer-4": {
    "status": "printing",
    "distance": 38.7,
    "timestamp": "2024-01-15T10:30:01Z"
  }
}
```

**Ou como Array:**
```json
[
  {
    "id": "printer-1",
    "status": "printing",
    "distance": 45.2,
    "timestamp": "2024-01-15T10:30:00Z"
  },
  {
    "id": "printer-2",
    "status": "online",
    "distance": 120.5,
    "timestamp": "2024-01-15T10:29:55Z"
  }
]
```

#### Opção B: WebSocket (Recomendado) ⭐

O dashboard conecta-se automaticamente a **4 WebSockets separados** no Node-RED:

**Endpoints WebSocket:**
- `ws://127.0.0.1:1880/ws/impressora1` → Impressora 1
- `ws://127.0.0.1:1880/ws/impressora2` → Impressora 2
- `ws://127.0.0.1:1880/ws/impressora3` → Impressora 3
- `ws://127.0.0.1:1880/ws/impressora4` → Impressora 4

**No Node-RED, configure um WebSocket Out para cada impressora:**

**Fluxo Node-RED (para cada impressora):**
```
[ESP32 Sensor Data] -> [Function] -> [WebSocket Out: ws/impressora1]
```

**Configuração WebSocket Out:**
- Path: `/ws/impressora1` (ou impressora2, impressora3, impressora4)
- Type: Broadcast to all

**Formato de Mensagem (pode ser):**

**Número simples (distância em mm):**
```
45.2
```

**Objeto JSON:**
```json
{
  "distance": 45.2,
  "status": "printing",
  "timestamp": "2024-01-15T10:30:00Z"
}
```


### 3. Configuração do Dashboard

O dashboard está configurado para conectar ao Node-RED em `http://127.0.0.1:1880`.

**Configuração padrão no `app.js`:**
```javascript
const CONFIG = {
    nodeRedUrl: 'http://127.0.0.1:1880',
    apiUrl: 'http://127.0.0.1:1880/api/printers',
    wsBaseUrl: 'ws://127.0.0.1:1880/ws',
    updateInterval: 5000, // 5 segundos
    useWebSocket: true // ou false para polling
};
```

**Mapeamento das Impressoras:**
- `printer-1` → `ws/impressora1`
- `printer-2` → `ws/impressora2`
- `printer-3` → `ws/impressora3`
- `printer-4` → `ws/impressora4`

Se seu Node-RED estiver em outro endereço, edite o arquivo `app.js` e altere o `nodeRedUrl` e `wsBaseUrl`.

## 📊 Status das Impressoras

O dashboard reconhece três status:

1. **Online** (Verde): Impressora livre, aguardando trabalho
2. **Printing** (Amarelo): Impressora em uso/imprimindo
3. **Offline** (Vermelho): Impressora sem comunicação

### Determinação de Status

O status é determinado pela distância medida pelo sensor:

- **Distância < 50mm**: Status "printing" (imprimindo)
- **Distância 50-300mm**: Status "online" (livre)
- **Distância > 300mm ou null**: Status "offline" (sem sinal)

*Nota: Ajuste os valores no arquivo `app.js` na função `determineStatus()` conforme seu sensor ESP32.*

## 🔧 Exemplo de Node-RED Flow

**Exemplo básico para cada impressora:**

Para cada uma das 4 impressoras, configure um WebSocket Out separado:

1. **Impressora 1:** Path: `/ws/impressora1`
2. **Impressora 2:** Path: `/ws/impressora2`
3. **Impressora 3:** Path: `/ws/impressora3`
4. **Impressora 4:** Path: `/ws/impressora4`

**Estrutura do flow (para cada impressora):**

```
[ESP32 Sensor] → [Function (opcional)] → [WebSocket Out: ws/impressoraX]
```

**O dashboard aceita os seguintes formatos de mensagem:**

- **Número simples:** `45.2` (distância em mm)
- **JSON com distância:** `{"distance": 45.2}`
- **JSON completo:** `{"distance": 45.2, "status": "printing", "timestamp": "2024-01-15T10:30:00Z"}`

O dashboard determinará automaticamente o status baseado na distância se o campo `status` não for fornecido.

## 📱 Funcionalidades

- ✅ 4 cards individuais para cada impressora
- ✅ Indicadores de status em tempo real
- ✅ Overview com contadores (em funcionamento, paradas, total)
- ✅ Barra visual de distância do sensor
- ✅ Atualização automática via WebSocket ou polling
- ✅ Design responsivo para mobile e desktop
- ✅ Indicador de conexão com Node-RED

## 🎯 Próximos Passos

1. Configure o CORS no Node-RED se necessário
2. Ajuste os thresholds de distância conforme seu sensor
3. Configure autenticação se necessário
4. Personalize nomes das impressoras no código

## 📞 Suporte

Para problemas ou dúvidas sobre integração com Node-RED ou ESP32, consulte a documentação do projeto.

