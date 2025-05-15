from flask import Flask, request, jsonify, send_from_directory, render_template
import os
import base64
import re
import shutil
from werkzeug.utils import secure_filename
import glob

app = Flask(__name__)

BASE_DIR = "photo_storage"
MAX_INTRUDER_PHOTOS = 30
PORT = 4998
HOST = "0.0.0.0"

os.makedirs(BASE_DIR, exist_ok=True)


def ensure_id_folders(device_id):
    device_id = secure_filename(device_id)

    device_dir = os.path.join(BASE_DIR, device_id)
    intruder_dir = os.path.join(device_dir, "intruder_photo")
    knownface_dir = os.path.join(device_dir, "knownface_photo")

    os.makedirs(device_dir, exist_ok=True)
    os.makedirs(intruder_dir, exist_ok=True)
    os.makedirs(knownface_dir, exist_ok=True)

    return device_dir, intruder_dir, knownface_dir


def save_base64_image(base64_data, folder, filename):
    if "," in base64_data:
        base64_data = base64_data.split(",", 1)[1]

    try:
        image_data = base64.b64decode(base64_data)

        filepath = os.path.join(folder, filename)
        with open(filepath, "wb") as f:
            f.write(image_data)
        return True
    except Exception as e:
        print(f"Error saving image: {str(e)}")
        return False


def reorganize_intruder_photos(intruder_folder):
    files = glob.glob(os.path.join(intruder_folder, "intruder*.jpg"))

    latest_path = os.path.join(intruder_folder, "latest.jpg")
    if os.path.exists(latest_path) and latest_path in files:
        files.remove(latest_path)

    files.sort(key=os.path.getmtime, reverse=True)

    for i, file_path in enumerate(files, 2):
        new_name = os.path.join(intruder_folder, f"intruder{i}.jpg")

        if file_path != new_name:
            if os.path.exists(new_name):
                os.remove(new_name)
            os.rename(file_path, new_name)

    all_files = glob.glob(os.path.join(intruder_folder, "intruder*.jpg"))
    all_files.sort(key=os.path.getmtime, reverse=True)
    for old_file in all_files[MAX_INTRUDER_PHOTOS - 1 :]:
        if os.path.exists(old_file):
            os.remove(old_file)


@app.route("/<device_id>/upload_intruder/", methods=["POST"])
def upload_intruder(device_id):
    if "image" not in request.json:
        return jsonify({"error": "No image data provided"}), 400

    _, intruder_dir, _ = ensure_id_folders(device_id)

    base64_data = request.json["image"]

    if save_base64_image(base64_data, intruder_dir, "latest.jpg"):
        shutil.copy2(
            os.path.join(intruder_dir, "latest.jpg"),
            os.path.join(intruder_dir, "intruder1.jpg"),
        )

        reorganize_intruder_photos(intruder_dir)
        return (
            jsonify(
                {"success": True, "message": "Intruder photo uploaded successfully"}
            ),
            200,
        )
    else:
        return jsonify({"error": "Failed to save image"}), 500


@app.route("/<device_id>/upload_knownface/", methods=["POST"])
def upload_knownface(device_id):
    if "image" not in request.json or "name" not in request.json:
        return jsonify({"error": "Image data or name not provided"}), 400

    _, _, knownface_dir = ensure_id_folders(device_id)

    base64_data = request.json["image"]
    name = secure_filename(request.json["name"])

    if not name.lower().endswith(".jpg"):
        name = name + ".jpg"

    if save_base64_image(base64_data, knownface_dir, name):
        return (
            jsonify(
                {"success": True, "message": "Known face photo uploaded successfully"}
            ),
            200,
        )
    else:
        return jsonify({"error": "Failed to save image"}), 500


@app.route("/<device_id>/intruder_photo/")
def list_intruder_photos(device_id):
    _, intruder_dir, _ = ensure_id_folders(device_id)

    files = glob.glob(os.path.join(intruder_dir, "*.jpg"))
    files = [os.path.basename(f) for f in files]
    files.sort()

    html = f"""
    <html>
        <head>
            <title>Intruder Photos - {device_id}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .photo-container {{ display: flex; flex-wrap: wrap; }}
                .photo-item {{ margin: 10px; text-align: center; }}
                img {{ max-width: 200px; max-height: 200px; border: 1px solid #ddd; }}
            </style>
        </head>
        <body>
            <h1>Intruder Photos for {device_id}</h1>
            <div class="photo-container">
    """

    for file in files:
        file_url = f"/{device_id}/intruder_photo/{file}"
        html += f"""
            <div class="photo-item">
                <img src="{file_url}" alt="{file}">
                <div><a href="{file_url}">{file}</a></div>
            </div>
        """

    html += """
            </div>
        </body>
    </html>
    """
    return html


@app.route("/<device_id>/knownface_photo/")
def list_knownface_photos(device_id):
    _, _, knownface_dir = ensure_id_folders(device_id)

    files = glob.glob(os.path.join(knownface_dir, "*.jpg"))
    files = [os.path.basename(f) for f in files]
    files.sort()

    html = f"""
    <html>
        <head>
            <title>Known Face Photos - {device_id}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .photo-container {{ display: flex; flex-wrap: wrap; }}
                .photo-item {{ margin: 10px; text-align: center; }}
                img {{ max-width: 200px; max-height: 200px; border: 1px solid #ddd; }}
            </style>
        </head>
        <body>
            <h1>Known Face Photos for {device_id}</h1>
            <div class="photo-container">
    """

    for file in files:
        file_url = f"/{device_id}/knownface_photo/{file}"
        html += f"""
            <div class="photo-item">
                <img src="{file_url}" alt="{file}">
                <div><a href="{file_url}">{file}</a></div>
            </div>
        """

    html += """
            </div>
        </body>
    </html>
    """
    return html


@app.route("/<device_id>/knownface_json/", methods=["GET"])
def list_knownface_json(device_id):
    _, _, knownface_dir = ensure_id_folders(device_id)
    entries = []
    for fname in os.listdir(knownface_dir):
        if fname.lower().endswith((".jpg", ".png")):
            path = os.path.join(knownface_dir, fname)
            with open(path, "rb") as f:
                b64 = base64.b64encode(f.read()).decode("utf-8")
            entries.append({"filename": fname, "data": b64})
    return jsonify(entries)


@app.route("/<device_id>/intruder_photo/<filename>")
def serve_intruder_photo(device_id, filename):
    _, intruder_dir, _ = ensure_id_folders(device_id)
    return send_from_directory(intruder_dir, filename)


@app.route("/<device_id>/knownface_photo/<filename>")
def serve_knownface_photo(device_id, filename):
    _, _, knownface_dir = ensure_id_folders(device_id)
    return send_from_directory(knownface_dir, filename)


@app.route("/devices/")
def list_devices():
    devices = [
        d for d in os.listdir(BASE_DIR) if os.path.isdir(os.path.join(BASE_DIR, d))
    ]
    devices.sort()

    html = """
    <html>
        <head>
            <title>All Devices</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                ul { list-style-type: none; padding: 0; }
                li { margin: 10px 0; }
                a { text-decoration: none; color: #0066cc; }
                a:hover { text-decoration: underline; }
            </style>
        </head>
        <body>
            <h1>All Registered Devices</h1>
            <ul>
    """

    for device in devices:
        html += f"""
            <li>
                <h3>{device}</h3>
                <ul>
                    <li><a href="/{device}/intruder_photo/">Intruder Photos</a></li>
                    <li><a href="/{device}/knownface_photo/">Known Face Photos</a></li>
                </ul>
            </li>
        """

    html += """
            </ul>
        </body>
    </html>
    """
    return html


@app.route("/")
def home():
    return """
    <html>
        <head>
            <title>Dynamic Photo Server</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; max-width: 800px; line-height: 1.6; }
                code { background-color: #f4f4f4; padding: 2px 5px; border-radius: 3px; }
                pre { background-color: #f4f4f4; padding: 10px; border-radius: 5px; overflow-x: auto; }
                h2 { margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
            </style>
        </head>
        <body>
            <h1>Dynamic Photo Server</h1>
            
            <p>This server allows multiple devices to upload and access photos in their own namespace.</p>
            
            <h2>Available Routes</h2>
            <ul>
                <li><a href="/devices/">View All Devices</a></li>
            </ul>
            
            <h2>API Usage</h2>
            
            <h3>Upload Intruder Photo:</h3>
            <pre>POST /{DEVICE_ID}/upload_intruder/
Content-Type: application/json

{
  "image": "base64_encoded_image_data"
}</pre>
            
            <h3>Upload Known Face Photo:</h3>
            <pre>POST /{DEVICE_ID}/upload_knownface/
Content-Type: application/json

{
  "image": "base64_encoded_image_data",
  "name": "person_name"
}</pre>
            
            <h3>Access Photos:</h3>
            <ul>
                <li>Intruder photos: <code>/{DEVICE_ID}/intruder_photo/latest.jpg</code></li>
                <li>Known face photos: <code>/{DEVICE_ID}/knownface_photo/{name}.jpg</code></li>
            </ul>
        </body>
    </html>
    """


if __name__ == "__main__":
    print(f"Starting server on http://{HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=True)
