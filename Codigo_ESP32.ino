#include <WiFi.h>
#include <PubSubClient.h>

// ======== CONFIG Wi-Fi ========
const char* ssid = "Daniel";
const char* password = "!Fusca1975";
const char* mqtt_server = "172.20.10.3";

WiFiClient espClient;
PubSubClient client(espClient);

// ======== CONFIG SENSOR HC-SR04 ========
#define TRIG_PIN 14
#define ECHO_PIN 13

// ======== VARIÁVEIS GLOBAIS ========
unsigned long lastReconnectAttempt = 0;
const long reconnectInterval = 5000;

void setup_wifi() {
  delay(10);
  Serial.begin(115200);
  Serial.println();
  Serial.print("Conectando a ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("WiFi conectado");
  Serial.print("IP do ESP32: ");
  Serial.println(WiFi.localIP());
}

boolean reconnect() {
  if (client.connect("ESP32_HCSR04")) {
    Serial.println("Conectado ao broker MQTT!");
    client.subscribe("comando/esp32");
    // Publica status online
    client.publish("sensor/status", "online");
    return true;
  }
  return false;
}

float medirDistancia() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000); // timeout 30ms
  if (duration == 0) {
    Serial.println("Erro na leitura do sensor");
    return -1;
  }
  
  return (duration * 0.0343) / 2;
}

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  setup_wifi();
  client.setServer(mqtt_server, 1883);
}

void loop() {
  if (!client.connected()) {
    if (millis() - lastReconnectAttempt > reconnectInterval) {
      lastReconnectAttempt = millis();
      if (reconnect()) {
        lastReconnectAttempt = 0;
      }
    }
  } else {
    client.loop();
  }

  static unsigned long lastMsg = 0;
  if (millis() - lastMsg > 2000) { // Aumentei para 2 segundos
    lastMsg = millis();

    float distancia = medirDistancia();
    if (distancia > 0) {
      Serial.print("Distância: ");
      Serial.print(distancia);
      Serial.println(" cm");

      String msg = String(distancia, 2);
      client.publish("sensor/hcsr04", msg.c_str());
      
      // Publica status também
      String status = distancia < 10 ? "proximo" : "normal";
      client.publish("sensor/status", status.c_str());
    }
  }
}