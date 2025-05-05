from flask import Flask, request, jsonify
import requests
import json
import time
import os
import threading
import logging

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("api-forwarder")

app = Flask(__name__)

FACE_RECOGNITION_SERVICE = os.getenv(
    "FACE_RECOGNITION_SERVICE", "http://127.0.0.1:5001/upload"
)
DROWSINESS_DETECTION_SERVICE = os.getenv(
    "DROWSINESS_DETECTION_SERVICE", "http://127.0.0.1:5002/upload"
)

def forward_request(url, data, results, service_name):
    try:
        start_time = time.time()
        response = requests.post(url, json=data, timeout=10)
        elapsed_time = time.time() - start_time

        if response.status_code == 200:
            logger.info(f"Request to {service_name} successful in {elapsed_time:.2f}s")
            results[service_name] = {
                "status": "success",
                "response_time": elapsed_time,
                "data": response.json(),
            }
        else:
            logger.error(
                f"Request to {service_name} failed with status {response.status_code}"
            )
            results[service_name] = {
                "status": "error",
                "response_time": elapsed_time,
                "error": f"HTTP {response.status_code}: {response.text}",
            }
    except requests.exceptions.RequestException as e:
        logger.error(f"Connection error to {service_name}: {str(e)}")
        results[service_name] = {
            "status": "error",
            "error": f"Connection error: {str(e)}",
        }


@app.route("/process", methods=["POST"])
def process_image():
    try:
        data = request.get_json()

        if not data or "image" not in data:
            return jsonify({"error": "Missing image data in request"}), 400

        results = {}

        threads = [
            threading.Thread(
                target=forward_request,
                args=(FACE_RECOGNITION_SERVICE, data, results, "face_recognition"),
            ),
            threading.Thread(
                target=forward_request,
                args=(
                    DROWSINESS_DETECTION_SERVICE,
                    data,
                    results,
                    "drowsiness_detection",
                ),
            ),
        ]

        for thread in threads:
            thread.start()

        for thread in threads:
            thread.join()

        response = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "status": (
                "success"
                if all(r.get("status") == "success" for r in results.values())
                else (
                    "partial_success"
                    if any(r.get("status") == "success" for r in results.values())
                    else "error"
                )
            ),
        }

        if "face_recognition" in results:
            fr_result = results["face_recognition"]
            if fr_result["status"] == "success":
                face_data = fr_result["data"]
                response["face_recognition"] = {
                    "status": face_data.get("result", "unknown"),
                    "processed": face_data.get("processed", False),
                    "response_time": fr_result["response_time"],
                }
            else:
                response["face_recognition"] = {
                    "status": "error",
                    "message": fr_result.get("error", "Unknown error"),
                }

        if "drowsiness_detection" in results:
            dd_result = results["drowsiness_detection"]
            if dd_result["status"] == "success":
                drowsy_data = dd_result["data"]
                response["drowsiness_detection"] = {
                    "status": drowsy_data.get("detection_result", "unknown"),
                    "ear": drowsy_data.get("ear"),
                    "yawn_distance": drowsy_data.get("yawn_distance"),
                    "response_time": dd_result["response_time"],
                }
            else:
                response["drowsiness_detection"] = {
                    "status": "error",
                    "message": dd_result.get("error", "Unknown error"),
                }

        if "face_recognition" in results and "drowsiness_detection" in results:
            fr_status = results["face_recognition"].get("status")
            dd_status = results["drowsiness_detection"].get("status")

            if fr_status == "success" and dd_status == "success":
                fr_result = results["face_recognition"]["data"].get("result")
                dd_result = results["drowsiness_detection"]["data"].get(
                    "detection_result"
                )

                if fr_result in ["intruder", "no face"]:
                    response["overall_status"] = "security_alert"
                elif dd_result in ["user_sleepy", "user_yawn"]:
                    response["overall_status"] = "driver_alert"
                else:
                    response["overall_status"] = "normal"
            else:
                response["overall_status"] = "system_error"

        return jsonify(response)

    except Exception as e:
        logger.error(f"Error processing request: {str(e)}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    logger.info("Starting API forwarding service on port 5000...")
    app.run(host="0.0.0.0", port=4999, debug=False, threaded=True)
