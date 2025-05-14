#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>
#include <base64.h>
#include <ArduinoJson.h>
#include <WiFiManager.h>

const char* serverUrl = "http://64.235.45.24:4999/process";

#define BUZZER_PIN 2

#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

unsigned long previousMillis = 0;
const long frameInterval = 500;
boolean readyForNextFrame = true;

unsigned long fpsCounterTime = 0;
unsigned int frameCount = 0;
float fps = 0;

unsigned long buzzerStartTime = 0;
boolean buzzerActive = false;
int buzzerType = 0;
const long yawnBuzzerDuration = 500;
boolean isSleepy = false;

int wifiReconnectAttempts = 0;
const int maxReconnectAttempts = 3;
bool configPortalActive = false;
WiFiManager wifiManager;

void setup() {
  Serial.begin(115200);
  
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sccb_sda = SIOD_GPIO_NUM;
  config.pin_sccb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA;
    config.jpeg_quality = 20;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 25;
    config.fb_count = 1;
  }
  
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
  sensor_t * s = esp_camera_sensor_get();

  s->set_framesize(s, psramFound() ? FRAMESIZE_VGA : FRAMESIZE_QVGA);
  s->set_vflip(s, 1);
  s->set_quality(s, 20);
  s->set_brightness(s, 1);
  s->set_contrast(s, 1);

  setupWiFi();
  
  previousMillis = millis();
  fpsCounterTime = millis();
  
  testBuzzer();
}

void setupWiFi() {

 const char* customHeader = R"rawliteral(
  <style>
  body{background:#121212;color:#fff;font-family:Arial,sans-serif;margin:0;padding:0}
  .header{background:#1e1e1e;color:#03DAC6;text-align:center;padding:15px;border-bottom:2px solid #03DAC6}
  .header h1{margin:0;font-size:28px}
  .header p{margin:5px 0 0;font-size:14px}
  input{background:#2d2d2d;color:#fff;border:1px solid #444;border-radius:4px;padding:8px;width:100%;margin:8px 0}
  input[type=submit]{background:#03DAC6;color:#000;font-weight:bold;cursor:pointer}
  input[type=submit]:hover{background:#BB86FC}
  </style>
  <div class="header">
    <h1>SECURIN</h1>
    <p>Connect your device to WiFi</p>
  </div>
  )rawliteral";

  wifiManager.setCustomHeadElement(customHeader);

  wifiManager.setConfigPortalTimeout(180);

  if (!wifiManager.autoConnect("Securin-CAM", "securin123")) {
    Serial.println("Failed to connect and hit timeout");
    ESP.restart();
  }
  
  Serial.print("Connected to WiFi, IP address: ");
  Serial.println(WiFi.localIP());
  
  wifiReconnectAttempts = 0;
  configPortalActive = false;
}

bool checkWiFiConnection() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiReconnectAttempts = 0;
    return true;
  }
  
  if (configPortalActive) return false;
  
  Serial.println("WiFi connection lost. Attempting to reconnect...");
  
  if (wifiReconnectAttempts < maxReconnectAttempts) {
    wifiReconnectAttempts++;
    Serial.printf("Reconnection attempt %d of %d\n", wifiReconnectAttempts, maxReconnectAttempts);
    
    WiFi.reconnect();
    
    unsigned long reconnectStart = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - reconnectStart < 10000) {
      delay(500);
      Serial.print(".");
    }
    Serial.println();
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("Successfully reconnected to WiFi");
      Serial.print("IP address: ");
      Serial.println(WiFi.localIP());
      return true;
    } else {
      Serial.println("Failed to reconnect");
      return false;
    }
  } else {
    Serial.println("Maximum reconnection attempts reached. Starting WiFi Manager...");
    configPortalActive = true;
    
    wifiManager.resetSettings();
    
    if (!wifiManager.startConfigPortal("ESP32CAM-Setup", "password123")) {
      Serial.println("Failed to connect and hit timeout");
      ESP.restart();
    }
    
    Serial.print("Connected to new WiFi, IP address: ");
    Serial.println(WiFi.localIP());
    
    wifiReconnectAttempts = 0;
    configPortalActive = false;
    return true;
  }
}

void testBuzzer() {
  Serial.println("Testing buzzer...");
  digitalWrite(BUZZER_PIN, HIGH);
  delay(500);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.println("Buzzer test complete");
}

void setBuzzerAlert(int type) {
  buzzerType = type;
  buzzerActive = true;
  buzzerStartTime = millis();
  
  digitalWrite(BUZZER_PIN, HIGH);
  
  switch (type) {
    case 1:
      isSleepy = true;
      Serial.println("BUZZER ON - Drowsiness Alert!");
      break;
    case 2:
      Serial.println("BUZZER ON - Yawn Alert (500ms)!");
      break;
    default:
      digitalWrite(BUZZER_PIN, LOW);
      buzzerActive = false;
      isSleepy = false;
      break;
  }
}

void updateBuzzerStatus() {
  if (!buzzerActive) return;
  
  unsigned long currentTime = millis();
  
  if (buzzerType == 2 && currentTime - buzzerStartTime >= yawnBuzzerDuration) {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerActive = false;
    buzzerType = 0;
    Serial.println("BUZZER OFF - Yawn alert completed");
  }
  
  if (buzzerType == 1 && currentTime - buzzerStartTime >= 30000) {
    Serial.println("SAFETY: Turning off continuous buzzer after 30 seconds");
    digitalWrite(BUZZER_PIN, LOW);
    delay(200);
    digitalWrite(BUZZER_PIN, HIGH);
    buzzerStartTime = currentTime;
  }
}

void sendImageToServer(camera_fb_t *fb) {
  if (!checkWiFiConnection()) {
    readyForNextFrame = true;
    return;
  }
  
  String base64Image = base64::encode(fb->buf, fb->len);
  
  HTTPClient http;
  
  http.begin(serverUrl);
  http.setTimeout(20000);
  
  http.addHeader("Content-Type", "application/json");
  
  DynamicJsonDocument jsonDoc(20000);
  jsonDoc["image"] = base64Image;
  
  String payload;
  serializeJson(jsonDoc, payload);
  
  Serial.printf("Image size: %d bytes, Base64 size: %d bytes\n", fb->len, base64Image.length());
  
  int httpResponseCode = http.POST(payload);
  
  if (httpResponseCode > 0) {
    String response = http.getString();
    Serial.printf("HTTP Response code: %d\n", httpResponseCode);
    
    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error) {
      Serial.println("Server response: {");
      if (doc.containsKey("drowsiness_detection")) {
        Serial.println("  \"drowsiness_detection\": {");
        if (doc["drowsiness_detection"].containsKey("ear")) {
          float ear = doc["drowsiness_detection"]["ear"];
          Serial.printf("    \"ear\": %.8f,\n", ear);
        }
        if (doc["drowsiness_detection"].containsKey("response_time")) {
          float respTime = doc["drowsiness_detection"]["response_time"];
          Serial.printf("    \"response_time\": %.8f,\n", respTime);
        }
        if (doc["drowsiness_detection"].containsKey("status")) {
          String status = doc["drowsiness_detection"]["status"];
          Serial.printf("    \"status\": \"%s\",\n", status.c_str());
        }
        if (doc["drowsiness_detection"].containsKey("yawn_distance")) {
          float yawnDist = doc["drowsiness_detection"]["yawn_distance"];
          Serial.printf("    \"yawn_distance\": %.8f\n", yawnDist);
        }
        Serial.println("  },");
      }
      Serial.println("}");
      
      bool drowsinessDetected = false;
      bool yawnDetected = false;
      
      if (doc.containsKey("drowsiness_detection") && 
          doc["drowsiness_detection"].containsKey("status")) {
          
        String drowsyStatus = doc["drowsiness_detection"]["status"];
        Serial.print("Drowsiness status: ");
        Serial.println(drowsyStatus);
        
        if (drowsyStatus == "sleepy_detected") {
          drowsinessDetected = true;
          Serial.println("ALERT: Drowsiness detected!");
        } 
        else if (drowsyStatus == "yawn_detected") {
          yawnDetected = true;
          Serial.println("ALERT: Yawning detected!");
        }
        
        if (doc["drowsiness_detection"].containsKey("ear")) {
          float ear = doc["drowsiness_detection"]["ear"];
          Serial.printf("Eye Aspect Ratio (EAR): %.2f\n", ear);
        }
        
        if (doc["drowsiness_detection"].containsKey("yawn_distance")) {
          float yawnDist = doc["drowsiness_detection"]["yawn_distance"];
          Serial.printf("Yawn distance: %.2f\n", yawnDist);
        }
      }
      
      if (drowsinessDetected) {
        setBuzzerAlert(1);
        Serial.println("Drowsiness detected - activating continuous buzzer");
      } 
      else if (yawnDetected) {
        if (buzzerType != 1) {
          Serial.println("Yawn detected - activating yawn buzzer");
          setBuzzerAlert(2);
        } else {
          Serial.println("Yawn detected but drowsiness alarm already active");
        }
      }
      else if (!drowsinessDetected && isSleepy) {
        Serial.println("No longer sleepy - turning off continuous buzzer");
        digitalWrite(BUZZER_PIN, LOW);
        buzzerActive = false;
        buzzerType = 0;
        isSleepy = false;
        Serial.println("BUZZER OFF - Normal status");
      }
      
      Serial.printf("Current State - Drowsy: %d, Yawn: %d, isSleepy: %d, buzzerActive: %d, buzzerType: %d\n", 
                    drowsinessDetected, yawnDetected, isSleepy, buzzerActive, buzzerType);
      
    } else {
      Serial.print("Failed to parse JSON response: ");
      Serial.println(error.c_str());
      Serial.println("Response: " + response);
    }
  } else {
    Serial.printf("HTTP POST Error: %d\n", httpResponseCode);
    for (int i = 0; i < 3; i++) {
      digitalWrite(BUZZER_PIN, HIGH);
      delay(100);
      digitalWrite(BUZZER_PIN, LOW);
      delay(100);
    }
  }
  
  http.end();
  
  delay(50);
  readyForNextFrame = true;
}

void loop() {
  unsigned long currentMillis = millis();
  
  updateBuzzerStatus();
  
  if (configPortalActive) {
    wifiManager.process();
    return;
  }
  
  if (currentMillis - previousMillis >= frameInterval && readyForNextFrame) {
    previousMillis = currentMillis;
    readyForNextFrame = false;
    
    frameCount++;
    if (currentMillis - fpsCounterTime >= 1000) {
      fps = frameCount / ((currentMillis - fpsCounterTime) / 1000.0);
      Serial.printf("Current FPS: %.1f\n", fps);
      frameCount = 0;
      fpsCounterTime = currentMillis;
    }
    
    camera_fb_t *fb = esp_camera_fb_get();
    
    if (!fb) {
      Serial.println("Camera capture failed");
      readyForNextFrame = true;
      return;
    }
    
    sendImageToServer(fb);
    
    esp_camera_fb_return(fb);
  }
}
