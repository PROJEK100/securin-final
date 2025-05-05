from flask import Flask, request, jsonify
import base64
import numpy as np
import cv2
import dlib
import time
import ntplib
import pytz
from datetime import datetime
from scipy.spatial import distance as dist
from imutils import face_utils
import imutils
import threading
import os
import json
import firebase_admin
from firebase_admin import credentials
from firebase_admin import db

app = Flask(__name__)

FIREBASE_CRED_PATH = "/home/frhn/Desktop/file/project_sic6/work/serviceAccountKey.json"
FIREBASE_DATABASE_URL = "https://securin-b49ed-default-rtdb.asia-southeast1.firebasedatabase.app/"
FIREBASE_TOPIC = "vehicle/SUPRAX123/detection/drowsiness"

EYE_AR_THRESH = 0.3
EYE_AR_CONSEC_FRAMES = 5  
YAWN_THRESH = 20

NTP_SERVER = "id.pool.ntp.org"
WIB_TIMEZONE = pytz.timezone('Asia/Jakarta')
NTP_SYNC_INTERVAL = 600
time_offset = 0

print("-> Loading the predictor and detector...")
detector = cv2.CascadeClassifier("haarcascade_frontalface_default.xml")
predictor = dlib.shape_predictor('shape_predictor_68_face_landmarks.dat')

frame_counter = 0
status = "normal"
last_status = "normal"
status_changed_time = time.time()

def sync_ntp_time():
    global time_offset
    try:
        ntp_client = ntplib.NTPClient()
        response = ntp_client.request(NTP_SERVER, timeout=5)
        ntp_time = response.tx_time
        local_time = time.time()
        time_offset = ntp_time - local_time
        readable_time = datetime.fromtimestamp(ntp_time, WIB_TIMEZONE).strftime('%Y-%m-%d %H:%M:%S %Z')
        print(f"NTP time synchronized. Offset: {time_offset:.3f} seconds. Current WIB time: {readable_time}")
        return True
    except Exception as e:
        print(f"NTP server error: {e}")
        return False

def get_wib_timestamp():
    local_time = time.time()
    adjusted_time = local_time + time_offset
    return int(adjusted_time)

def ntp_sync_loop():
    while True:
        sync_ntp_time()
        time.sleep(NTP_SYNC_INTERVAL)

def init_firebase():
    try:
        cred = credentials.Certificate(FIREBASE_CRED_PATH)
        firebase_admin.initialize_app(cred, {
            'databaseURL': FIREBASE_DATABASE_URL
        })
        print(f"Firebase client connected to {FIREBASE_DATABASE_URL}")
    except Exception as e:
        print(f"Firebase connection error: {e}")

def publish_to_firebase(status_code):
    try:
        ref = db.reference(FIREBASE_TOPIC)
        timestamp = get_wib_timestamp()
        readable_time = datetime.fromtimestamp(timestamp, WIB_TIMEZONE).strftime('%Y-%m-%d %H:%M:%S %Z')
        
        payload = {
            "status_code": status_code,
            "timestamp": timestamp
        }
        print(f"{timestamp}")
        ref.set(payload)
        print(f"Firebase status updated: {status_code}, timestamp: {timestamp} ({readable_time})")
    except Exception as e:
        print(f"Error sending to Firebase: {e}")

def eye_aspect_ratio(eye):
    A = dist.euclidean(eye[1], eye[5])
    B = dist.euclidean(eye[2], eye[4])
    C = dist.euclidean(eye[0], eye[3])
    ear = (A + B) / (2.0 * C)
    return ear

def final_ear(shape):
    (lStart, lEnd) = face_utils.FACIAL_LANDMARKS_IDXS["left_eye"]
    (rStart, rEnd) = face_utils.FACIAL_LANDMARKS_IDXS["right_eye"]

    leftEye = shape[lStart:lEnd]
    rightEye = shape[rStart:rEnd]

    leftEAR = eye_aspect_ratio(leftEye)
    rightEAR = eye_aspect_ratio(rightEye)

    ear = (leftEAR + rightEAR) / 2.0
    return (ear, leftEye, rightEye)

def lip_distance(shape):
    top_lip = shape[50:53]
    top_lip = np.concatenate((top_lip, shape[61:64]))

    low_lip = shape[56:59]
    low_lip = np.concatenate((low_lip, shape[65:68]))

    top_mean = np.mean(top_lip, axis=0)
    low_mean = np.mean(low_lip, axis=0)

    distance = abs(top_mean[1] - low_mean[1])
    return distance

@app.route('/upload', methods=['POST'])
def upload_image():
    global frame_counter, status, last_status, status_changed_time
    
    try:
        content = request.json
        base64_image = content.get('image', '')
        
        if not base64_image:
            return jsonify({"error": "No image data received"}), 400
        
        image_data = base64.b64decode(base64_image)
        nparr = np.frombuffer(image_data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if frame is None:
            return jsonify({"error": "Failed to decode image"}), 400
        
        frame = imutils.resize(frame, width=450)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        
        rects = detector.detectMultiScale(gray, scaleFactor=1.1, 
                                        minNeighbors=5, minSize=(30, 30),
                                        flags=cv2.CASCADE_SCALE_IMAGE)
        
        status = "normal" 
        status_code = 0
        
        for (x, y, w, h) in rects:
            rect = dlib.rectangle(int(x), int(y), int(x + w), int(y + h))
            
            shape = predictor(gray, rect)
            shape = face_utils.shape_to_np(shape)
            
            eye = final_ear(shape)
            ear = eye[0]
            
            distance = lip_distance(shape)
            
            leftEye = eye[1]
            rightEye = eye[2]
            leftEyeHull = cv2.convexHull(leftEye)
            rightEyeHull = cv2.convexHull(rightEye)
            cv2.drawContours(frame, [leftEyeHull], -1, (0, 255, 0), 1)
            cv2.drawContours(frame, [rightEyeHull], -1, (0, 255, 0), 1)
            
            lip = shape[48:60]
            cv2.drawContours(frame, [lip], -1, (0, 255, 0), 1)
            
            if ear < EYE_AR_THRESH:
                frame_counter += 1
                if frame_counter >= EYE_AR_CONSEC_FRAMES:
                    status = "sleepy_detected"
                    status_code = 2
                    cv2.putText(frame, "DROWSINESS ALERT!", (10, 30),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            else:
                frame_counter = 0
            
            if distance > YAWN_THRESH:
                status = "yawn_detected"
                status_code = 1
                cv2.putText(frame, "Yawn Alert", (10, 60),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            cv2.putText(frame, f"EAR: {ear:.2f}", (300, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            cv2.putText(frame, f"YAWN: {distance:.2f}", (300, 60),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
        
        if len(rects) == 0:
            frame_counter = 0
        
        current_time = time.time()
        if status != last_status or (current_time - status_changed_time) > 3:
            publish_to_firebase(status_code)
            last_status = status
            status_changed_time = current_time
        
        wib_timestamp = get_wib_timestamp()
        readable_time = datetime.fromtimestamp(wib_timestamp, WIB_TIMEZONE).strftime('%Y-%m-%d %H:%M:%S %Z')
        
        return jsonify({
            "status": "success", 
            "detection_result": status,
            "status_code": status_code,
            "timestamp": wib_timestamp,
            "timestamp_readable": readable_time,
            "ear": float(ear) if 'ear' in locals() else None,
            "yawn_distance": float(distance) if 'distance' in locals() else None
        })
    
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    init_firebase()
    
    if sync_ntp_time():
        print("Successfully connected to NTP server and synced time.")
    else:
        print("Warning: Could not connect to NTP server. Using system time with zero offset.")
    
    ntp_sync_thread = threading.Thread(target=ntp_sync_loop, daemon=True)
    ntp_sync_thread.start()
    
    app.run(host='0.0.0.0', port=5002, debug=False)