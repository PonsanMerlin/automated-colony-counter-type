import io
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image


from Choky.Powerpula import infer_boxes        
from Choky.TypeInfer import infer_species      

app = Flask(__name__)
CORS(app)

@app.get("/")
def index():
    return jsonify({"message": "ok"}), 200


@app.post("/UpFilesImages")
def up_files_images():
    if "Files_image" not in request.files:
        return jsonify({"error": "no Files_image field"}), 400

    files = request.files.getlist("Files_image")
    if not files:
        return jsonify({"error": "empty Files_image"}), 400

    images = []
    for f in files:
        try:
            img = Image.open(io.BytesIO(f.read())).convert("RGB")
            images.append(img)
        except Exception as e:
            return jsonify({"error": f"cannot open image: {f.filename}", "detail": str(e)}), 400

    counts, boxes_list, sizes = infer_boxes(images)

    return jsonify({
        "message": "ok",
        "counter": counts,
        "codination": boxes_list,
        "sizes": sizes
    }), 200


@app.post("/DetectType")
def detect_type():
    if "Files_image" not in request.files:
        return jsonify({"error": "no Files_image"}), 400

    f = request.files["Files_image"]

    conf = float(request.form.get("conf_thres", 0.25))
    iou = float(request.form.get("iou_thres", 0.5))

    try:
        img = Image.open(io.BytesIO(f.read())).convert("RGB")
    except Exception as e:
        return jsonify({"error": "cannot open image", "detail": str(e)}), 400

    sizes, det_list = infer_species([img], conf_thres=conf, iou_thres=iou)

    out = {
        "message": "ok",
        "sizes": sizes,
        "detections": det_list[0] if det_list else []
    }
    return jsonify(out), 200


@app.post("/predict")
def predict():
    files = request.files.getlist("images") or []
    if not files and "image" in request.files:
        files = [request.files["image"]]
    if not files:
        return jsonify({"error": "no images field"}), 400

    images = []
    for f in files:
        try:
            img = Image.open(io.BytesIO(f.read())).convert("RGB")
            images.append(img)
        except Exception as e:
            return jsonify({"error": f"cannot open image: {f.filename}", "detail": str(e)}), 400

    counts, boxes_list, sizes = infer_boxes(images)
    return jsonify({
        "message": "ok",
        "counter": counts,
        "codination": boxes_list,
        "sizes": sizes
    }), 200


if __name__ == "__main__":
    with app.app_context():
        print("URL MAP:", app.url_map)
    app.run(debug=True)
