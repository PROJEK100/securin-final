import cv2
import numpy as np
import face_recognition
import os
import time
import threading
import queue
from datetime import datetime
import base64
from flask import Flask, request, jsonify, Response
import shutil
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db
import paho.mqtt.client as mqtt
import ntplib
import pytz
import requests
import json
from io import BytesIO

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
LATEST_IMAGE = 'latest.jpg'
MAX_IMAGES = 30  

FIREBASE_CRED_PATH = "/home/frhn/Desktop/file/project_sic6/work/serviceAccountKey.json"
FIREBASE_DATABASE_URL = "https://securin-b49ed-default-rtdb.asia-southeast1.firebasedatabase.app/"
FIREBASE_TOPIC = "vehicle/SUPRAX123/detection/face_detection"
FIREBASE_MASTER_SWITCH = "vehicle/SUPRAX123/master_switch"

MQTT_BROKER = "broker.emqx.io"  
MQTT_PORT = 1883
MQTT_USERNAME = "" 
MQTT_PASSWORD = ""  
MQTT_TOPIC = "/SECURIN/SUPRAX123/master_switch"
MQTT_CLIENT_ID = "face_recognition_client"

INTRUDER_API_ENDPOINT = "http://192.168.153.119:4998/SUPRAX123/upload_intruder/"
KNOWN_FACES_API_ENDPOINT = "http://192.168.153.119:4998/upload_knownface/"

NTP_SERVER = "pool.ntp.org"
WIB_TIMEZONE = pytz.timezone('Asia/Jakarta')

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

class TimestampManager:
    def __init__(self, ntp_server="pool.ntp.org", timezone=pytz.timezone('Asia/Jakarta'), 
                 update_interval=900, max_drift=1.0):
        self.ntp_server = ntp_server
        self.timezone = timezone
        self.update_interval = update_interval
        self.max_drift = max_drift
        
        self.offset = 0.0  
        self.last_update = 0  
        self.update_lock = threading.Lock()
        self.is_synchronized = False
        
        self.stop_thread = False
        self.sync_thread = threading.Thread(target=self._sync_thread, daemon=True)
        self.sync_thread.start()
        
        self._update_ntp_offset()
    
    def _sync_thread(self):
        while not self.stop_thread:
            try:
                current_time = time.time()
                if current_time - self.last_update > self.update_interval:
                    self._update_ntp_offset()
                time.sleep(min(60, self.update_interval / 10))  
            except Exception as e:
                print(f"Error in sync thread: {e}")
    
    def _update_ntp_offset(self):
        with self.update_lock:
            try:
                ntp_client = ntplib.NTPClient()
                response = ntp_client.request(self.ntp_server, timeout=5)
                
                new_offset = response.tx_time - time.time()
                
                if self.is_synchronized and abs(new_offset - self.offset) > self.max_drift:
                    print(f"Warning: Significant time drift detected: {abs(new_offset - self.offset):.3f} seconds")
                
                self.offset = new_offset
                self.last_update = time.time()
                self.is_synchronized = True
                
                print(f"NTP sync successful. Offset: {self.offset:.3f} seconds")
                return True
            except Exception as e:
                print(f"Failed to update NTP offset: {e}")
                if not self.is_synchronized:
                    print("Warning: System using local time without NTP sync")
                return False
    
    def get_timestamp(self):
        if self.is_synchronized:
            corrected_time = time.time() + self.offset
        else:
            corrected_time = time.time()
            
            if time.time() - self.last_update > 60:  
                threading.Thread(target=self._update_ntp_offset, daemon=True).start()
                self.last_update = time.time()
        
        return int(corrected_time)
    
    def get_datetime(self):
        timestamp = self.get_timestamp()
        dt = datetime.fromtimestamp(timestamp, pytz.utc)
        return dt.astimezone(self.timezone)
    
    def get_formatted_time(self, format_str='%Y-%m-%d %H:%M:%S'):
        return self.get_datetime().strftime(format_str)
    
    def stop(self):
        self.stop_thread = True
        if self.sync_thread.is_alive():
            self.sync_thread.join(timeout=1.0)

timestamp_manager = TimestampManager(
    ntp_server=NTP_SERVER,
    timezone=WIB_TIMEZONE,
    update_interval=900  
)

def get_ntp_time():
    return timestamp_manager.get_datetime()

def get_ntp_timestamp():
    return timestamp_manager.get_timestamp()

class FaceRecognitionSystem:
    def __init__(self, known_faces_dir="known_faces", 
             detection_interval=1.0,
             firebase_cred_path=FIREBASE_CRED_PATH,
             firebase_database_url=FIREBASE_DATABASE_URL,
             firebase_topic=FIREBASE_TOPIC,
             firebase_master_switch=FIREBASE_MASTER_SWITCH,
             mqtt_broker=MQTT_BROKER,
             mqtt_port=MQTT_PORT,
             mqtt_username=MQTT_USERNAME,
             mqtt_password=MQTT_PASSWORD,
             mqtt_topic=MQTT_TOPIC,
             mqtt_client_id=MQTT_CLIENT_ID,
             intruder_api_endpoint=INTRUDER_API_ENDPOINT,
             known_faces_api_endpoint=KNOWN_FACES_API_ENDPOINT,
             tolerance=0.6):
        self.known_faces_dir = known_faces_dir
        self.known_face_encodings = []
        self.known_face_names = []
        self.detection_interval = detection_interval
        self.tolerance = tolerance
        
        self.intruder_api_endpoint = intruder_api_endpoint
        self.known_faces_api_endpoint = known_faces_api_endpoint
        
        self.firebase_cred_path = firebase_cred_path
        self.firebase_database_url = firebase_database_url
        self.firebase_topic = firebase_topic
        self.firebase_master_switch = firebase_master_switch
        
        self.mqtt_broker = mqtt_broker
        self.mqtt_port = mqtt_port
        self.mqtt_username = mqtt_username
        self.mqtt_password = mqtt_password
        self.mqtt_topic = mqtt_topic
        self.mqtt_client_id = mqtt_client_id
        self.mqtt_client = None
        
        self.frame_queue = queue.Queue(maxsize=2) 
        self.is_running = False
        self.last_detection_time = 0
        self.lock = threading.Lock()

        self.current_frame = None
        self.latest_processed_frame = None
        
        self.init_firebase()
        self.init_mqtt()
        
        if not os.path.exists(self.known_faces_dir):
            os.makedirs(self.known_faces_dir)
        
        self.load_known_faces()
        
        threading.Thread(target=self.fetch_known_faces_from_api, daemon=True).start()
    
    def fetch_known_faces_from_api(self):
        try:
            print(f"Fetching known faces from API: {self.known_faces_api_endpoint}")
            response = requests.get(self.known_faces_api_endpoint)
            
            if response.status_code == 200:
                try:
                    faces_data = response.json()
                    
                    for face in faces_data:
                        if isinstance(face, dict) and 'name' in face and 'image' in face:
                            name = face['name']
                            image_data = base64.b64decode(face['image'])
                        elif isinstance(face, dict) and 'filename' in face and 'data' in face:
                            name = os.path.splitext(face['filename'])[0]
                            image_data = base64.b64decode(face['data'])
                        else:
                            print(f"Unknown face data format: {face}")
                            continue
                        
                        filepath = os.path.join(self.known_faces_dir, f"{name}.jpg")
                        with open(filepath, 'wb') as f:
                            f.write(image_data)
                        
                        self._process_face_image(filepath, name)
                    
                    print(f"Successfully fetched and processed {len(faces_data)} faces from API")
                except ValueError as e:
                    print(f"API returned non-JSON data: {e}")
                    self._process_api_directory_listing(response.text)
            else:
                print(f"Failed to fetch known faces from API. Status code: {response.status_code}")
        
        except Exception as e:
            print(f"Error fetching known faces from API: {e}")
    
    def _process_api_directory_listing(self, content):
        try:
            lines = content.split('\n')
            for line in lines:
                if '.jpg' in line or '.png' in line or '.jpeg' in line:
                    filename = line.strip()
                    
                    image_url = f"{self.known_faces_api_endpoint}/{filename}"
                    img_response = requests.get(image_url)
                    
                    if img_response.status_code == 200:
                        filepath = os.path.join(self.known_faces_dir, filename)
                        with open(filepath, 'wb') as f:
                            f.write(img_response.content)
                        
                        name = os.path.splitext(filename)[0]
                        self._process_face_image(filepath, name)
            
            print(f"Processed directory listing from API")
        except Exception as e:
            print(f"Error processing directory listing: {e}")
    
    def _process_face_image(self, filepath, name):
        try:
            image = face_recognition.load_image_file(filepath)
            face_locations = face_recognition.face_locations(image, model="hog")
            
            if face_locations:
                face_encoding = face_recognition.face_encodings(image, face_locations)[0]
                
                if name in self.known_face_names:
                    idx = self.known_face_names.index(name)
                    self.known_face_encodings[idx] = face_encoding
                    print(f"Updated existing face: {name}")
                else:
                    self.known_face_encodings.append(face_encoding)
                    self.known_face_names.append(name)
                    print(f"Added new face: {name}")
                
                return True
            else:
                print(f"No face detected in {filepath}")
                return False
        except Exception as e:
            print(f"Error processing face image {filepath}: {e}")
            return False
    
    def upload_intruder_image(self, frame):
        try:
            _, img_encoded = cv2.imencode('.jpg', frame)
            
            img_base64 = base64.b64encode(img_encoded.tobytes()).decode('utf-8')
            
            timestamp = get_ntp_time().strftime('%Y%m%d_%H%M%S')
            formatted_time = get_ntp_time().strftime('%Y-%m-%d %H:%M:%S')
            
            json_data = {
                "image": img_base64,
                "timestamp": timestamp,
                "detected_at": formatted_time
            }
            
            headers = {'Content-Type': 'application/json'}
            response = requests.post(
                self.intruder_api_endpoint,
                json=json_data,
                headers=headers
            )
            
            if response.status_code == 200:
                print(f"Intruder image successfully uploaded to API")
                return True
            else:
                print(f"Failed to upload intruder image. Status code: {response.status_code}")
                return False
                    
        except Exception as e:
            print(f"Error uploading intruder image: {e}")
            return False

    def init_firebase(self):
        try:
            if not firebase_admin._apps:
                cred = credentials.Certificate(self.firebase_cred_path)
                firebase_admin.initialize_app(cred, {
                    'databaseURL': self.firebase_database_url
                })
            print(f"Firebase client connected to {self.firebase_database_url}")
        except Exception as e:
            print(f"Firebase connection error: {e}")
            
    def publish_to_firebase(self, status_code):
        try:
            ref = db.reference(self.firebase_topic)
            timestamp = get_ntp_timestamp()
            
            data = {
                "status": status_code,
                "timestamp": timestamp
            }
            print(f"{timestamp}")
            ref.set(data)
            print(f"Firebase status updated: {status_code} with WIB timestamp: {timestamp}")
            
            if status_code == 1:
                self.update_firebase_master_switch(True)
        except Exception as e:
            print(f"Error sending to Firebase: {e}")
    
    def update_firebase_master_switch(self, is_known_user):
        try:
            if is_known_user:
                timestamp = get_ntp_timestamp()
                
                master_switch_ref = db.reference(self.firebase_master_switch)
                master_switch_data = {
                    "value": True,
                    "timestamp": timestamp
                }
                master_switch_ref.set(master_switch_data)
                print(f"Firebase master switch updated: true (known user) with timestamp: {timestamp}")
        except Exception as e:
            print(f"Error updating Firebase master switch: {e}")
    
    def init_mqtt(self):
        try:
            self.mqtt_client = mqtt.Client(client_id=self.mqtt_client_id)
            self.mqtt_client.username_pw_set(self.mqtt_username, self.mqtt_password)
            self.mqtt_client.connect(self.mqtt_broker, self.mqtt_port, 60)
            self.mqtt_client.loop_start()
            
            print(f"MQTT client connected to {self.mqtt_broker}:{self.mqtt_port}")
        except Exception as e:
            print(f"MQTT connection error: {e}")
    
    def publish_to_mqtt(self, is_known_user):
        try:
            if self.mqtt_client and is_known_user:
                timestamp = get_ntp_timestamp()
                
                mqtt_payload = f'{{"value": 1, "timestamp": {timestamp}}}'
                
                self.mqtt_client.publish(self.mqtt_topic, mqtt_payload)
                print(f"MQTT status published: {mqtt_payload} (known user)")
                self.update_firebase_master_switch(is_known_user)
        except Exception as e:
            print(f"Error sending to MQTT: {e}")
    
    def load_known_faces(self):
        start_time = time.time()
        print("Loading face database from local directory...")

        if not os.path.exists(self.known_faces_dir):
            os.makedirs(self.known_faces_dir)
            print(f"Directory {self.known_faces_dir} created. Please add known face images.")
            return
        
        count = 0
        for filename in os.listdir(self.known_faces_dir):
            if filename.endswith(('.png', '.jpg', '.jpeg')):
                
                name = os.path.splitext(filename)[0]
                filepath = os.path.join(self.known_faces_dir, filename)
                
                if self._process_face_image(filepath, name):
                    count += 1
        
        elapsed_time = time.time() - start_time
        print(f"Successfully loaded {count} faces from local directory in {elapsed_time:.2f} seconds")
    
    def add_new_face(self, image_path, name):
        try:
            if self._process_face_image(image_path, name):
                if not os.path.exists(self.known_faces_dir):
                    os.makedirs(self.known_faces_dir)
                
                extension = os.path.splitext(image_path)[1]
                new_path = os.path.join(self.known_faces_dir, f"{name}{extension}")
                
                if os.path.exists(new_path):
                    timestamp = get_ntp_time().strftime("%Y%m%d%H%M%S")
                    new_path = os.path.join(self.known_faces_dir, f"{name}_{timestamp}{extension}")
                
                shutil.copy2(image_path, new_path)
                print(f"Face {name} successfully added")
                return True
            else:
                return False
        except Exception as e:
            print(f"Error adding new face: {e}")
            return False
    
    def process_frame(self, frame):
        try:
            small_frame = cv2.resize(frame, (0, 0), fx=0.5, fy=0.5)
            rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
            
            with self.lock:
                self.current_frame = frame.copy()
            
            face_locations = face_recognition.face_locations(rgb_small_frame, model="hog")
            processed_frame = frame.copy()
            
            if not face_locations:
                print("No face detected")
                self.publish_to_firebase(0)
                return processed_frame, "no face"
            
            face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
            
            detection_result = None
            known_user_detected = False
            intruder_detected = False
            
            for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
                top *= 2
                right *= 2
                bottom *= 2
                left *= 2
                
                if len(self.known_face_encodings) > 0:
                    matches = face_recognition.compare_faces(
                        self.known_face_encodings, 
                        face_encoding,
                        tolerance=self.tolerance
                    )
                    
                    if True in matches:
                        match_index = matches.index(True)
                        name = self.known_face_names[match_index]
                        
                        cv2.rectangle(processed_frame, (left, top), (right, bottom), (0, 255, 0), 2)
                        cv2.rectangle(processed_frame, (left, bottom - 35), (right, bottom), (0, 255, 0), cv2.FILLED)
                        cv2.putText(processed_frame, name, (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 1.0, (255, 255, 255), 1)
                        
                        print(f"Face detected: {name}")
                        self.publish_to_firebase(1)
                        known_user_detected = True
                        detection_result = name
                    else:
                        cv2.rectangle(processed_frame, (left, top), (right, bottom), (0, 0, 255), 2)
                        cv2.rectangle(processed_frame, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.FILLED)
                        cv2.putText(processed_frame, "Unknown", (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 1.0, (255, 255, 255), 1)
                        
                        print("Face detected: intruder")
                        self.publish_to_firebase(2)
                        detection_result = "intruder"
                        intruder_detected = True
                else:
                    cv2.rectangle(processed_frame, (left, top), (right, bottom), (0, 0, 255), 2)
                    cv2.rectangle(processed_frame, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.FILLED)
                    cv2.putText(processed_frame, "Unknown", (left + 6, bottom - 6), cv2.FONT_HERSHEY_DUPLEX, 1.0, (255, 255, 255), 1)
                    
                    print("Face detected: intruder (empty database)")
                    self.publish_to_firebase(2)
                    detection_result = "intruder"
                    intruder_detected = True
            
            if intruder_detected:
                threading.Thread(
                    target=self.upload_intruder_image,
                    args=(frame,),
                    daemon=True
                ).start()
            
            self.publish_to_mqtt(known_user_detected)
            
            with self.lock:
                self.latest_processed_frame = processed_frame.copy()
            
            return processed_frame, detection_result
            
        except Exception as e:
            print(f"Error processing frame: {e}")
            return frame, "error"
    
    def process_rest_image(self, image_data):
        try:
            nparr = np.frombuffer(image_data, np.uint8)
            frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            current_time = time.time()
            if current_time - self.last_detection_time >= self.detection_interval:
                self.last_detection_time = current_time
                processed_frame, result = self.process_frame(frame)
                return True, result
            else:
                return False, "skipped"
                
        except Exception as e:
            print(f"Error processing REST image: {e}")
            return False, f"error: {str(e)}"
    
    def cleanup(self):
        if self.mqtt_client:
            self.mqtt_client.loop_stop()
            self.mqtt_client.disconnect()
            print("MQTT client disconnected")

def limit_images():
    image_files = [f for f in os.listdir(UPLOAD_FOLDER) if f.endswith('.jpg') and f != LATEST_IMAGE]
    image_files.sort()  
    
    if len(image_files) > MAX_IMAGES:
        for file_to_delete in image_files[:len(image_files) - MAX_IMAGES]:
            os.remove(os.path.join(UPLOAD_FOLDER, file_to_delete))
            print(f"Deleted old image: {file_to_delete}")

face_system = FaceRecognitionSystem(
    known_faces_dir="known_faces",
    detection_interval=1.0,
    firebase_cred_path=FIREBASE_CRED_PATH,
    firebase_database_url=FIREBASE_DATABASE_URL,
    firebase_topic=FIREBASE_TOPIC,
    firebase_master_switch=FIREBASE_MASTER_SWITCH,
    mqtt_broker=MQTT_BROKER,
    mqtt_port=MQTT_PORT,
    mqtt_username=MQTT_USERNAME,
    mqtt_password=MQTT_PASSWORD,
    mqtt_topic=MQTT_TOPIC,
    mqtt_client_id=MQTT_CLIENT_ID,
    intruder_api_endpoint=INTRUDER_API_ENDPOINT,
    known_faces_api_endpoint=KNOWN_FACES_API_ENDPOINT,
    tolerance=0.6
)

@app.route('/upload', methods=['POST'])
def upload_image():
    try:
        data = request.get_json()
        
        if not data or 'image' not in data:
            return jsonify({'error': 'No image data received'}), 400
        
        base64_image = data['image']
        image_data = base64.b64decode(base64_image)
        
        timestamp = get_ntp_time().strftime('%Y%m%d_%H%M%S')
        filename = f"{timestamp}.jpg"
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        
        with open(filepath, 'wb') as f:
            f.write(image_data)
        
        latest_path = os.path.join(UPLOAD_FOLDER, LATEST_IMAGE)
        with open(latest_path, 'wb') as f:
            f.write(image_data)
            
        print(f"Image saved as {filepath}")
        
        limit_images()
        
        processed, result = face_system.process_rest_image(image_data)
        
        response_data = {
            'success': True,
            'message': 'Image received and saved',
            'filename': filename,
            'processed': processed,
            'result': result,
            'timestamp': timestamp
        }
        
        return jsonify(response_data)
        
    except Exception as e:
        print(f"Error processing image: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    ntp_status = "connected" if timestamp_manager.is_synchronized else "disconnected"
    
    return jsonify({
        'status': 'ok', 
        'ntp_status': ntp_status,
        'server_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'ntp_time': get_ntp_time().strftime('%Y-%m-%d %H:%M:%S WIB'),
        'offset': f"{timestamp_manager.offset:.3f} seconds" if timestamp_manager.is_synchronized else "unknown"
    }), 200

@app.route('/latest_image', methods=['GET'])
def get_latest_image():
    try:
        latest_path = os.path.join(UPLOAD_FOLDER, LATEST_IMAGE)
        if os.path.exists(latest_path):
            with open(latest_path, 'rb') as f:
                image_data = f.read()
            return Response(image_data, mimetype='image/jpeg')
        else:
            return jsonify({'error': 'No latest image available'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/refresh_faces', methods=['GET'])
def refresh_known_faces():
    try:
        threading.Thread(target=face_system.fetch_known_faces_from_api, daemon=True).start()
        return jsonify({
            'status': 'success',
            'message': 'Refreshing known faces from API in background'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def main():
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    
    if not os.path.exists("known_faces"):
        os.makedirs("known_faces")
        print("Created known_faces directory. Please add face images before detection.")
    
    if timestamp_manager.is_synchronized:
        print(f"NTP server connection successful. Current WIB time: {get_ntp_time().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Time offset: {timestamp_manager.offset:.3f} seconds")
    else:
        print("Warning: Initial NTP synchronization failed. Using system time as fallback.")
        print("Synchronization will be retried in the background.")
    
    try:
        print("Starting integrated Flask server with face recognition...")
        app.run(host='0.0.0.0', port=5001, debug=False, threaded=True)
    except KeyboardInterrupt:
        face_system.cleanup()
        timestamp_manager.stop()
        print("Server stopped.")
    finally:
        face_system.cleanup()
        timestamp_manager.stop()

if __name__ == "__main__":
    main()