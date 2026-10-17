import sys
import torch
from pathlib import Path
from collections import OrderedDict
from PIL import Image

USE_RESIZE = False
TARGET_W = 1024

HERE = Path(__file__).resolve().parent
YOLO_DIR = HERE.parent
sys.path.insert(0, str(YOLO_DIR.resolve()))

from torch.serialization import add_safe_globals
from models.yolo import DetectionModel, SegmentationModel, ClassificationModel, Detect
from models.common import Conv, Bottleneck, C3, SPPF, Concat
from torch.nn import Sequential, ModuleList, Module, Identity, Dropout, SiLU, ReLU, LeakyReLU
from torch.nn.modules.conv import Conv2d
from torch.nn.modules.batchnorm import BatchNorm2d
from torch.nn.modules.pooling import MaxPool2d, AdaptiveAvgPool2d, AvgPool2d
from torch.nn.modules.upsampling import Upsample
from pathlib import WindowsPath, PosixPath, PurePath, PureWindowsPath, PurePosixPath

add_safe_globals([
    DetectionModel, SegmentationModel, ClassificationModel, Detect,
    Conv, Bottleneck, C3, SPPF, Concat,
    Sequential, ModuleList, Module, Identity, Dropout, SiLU, ReLU, LeakyReLU,
    Conv2d, BatchNorm2d, MaxPool2d, AdaptiveAvgPool2d, AvgPool2d, Upsample,
    OrderedDict, WindowsPath, PosixPath, PurePath, PureWindowsPath, PurePosixPath,
])

_orig = torch.load
def _load(*a, **k):
    if 'weights_only' not in k:
        k['weights_only'] = False
    return _orig(*a, **k)
torch.load = _load

WEIGHTS = YOLO_DIR / "best.pt"
device = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"✅ Using device: {device}")

model = torch.hub.load(str(YOLO_DIR), 'custom', path=str(WEIGHTS), source='local', force_reload=False)
model.to(device)
model.conf = 0.50
model.eval()

def _resize_keep_aspect(im: Image.Image, target_w: int = TARGET_W):
    W0, H0 = im.size
    scale = float(target_w) / float(W0)
    new_w, new_h = int(round(W0 * scale)), int(round(H0 * scale))
    im_r = im.resize((new_w, new_h), Image.BILINEAR)
    return im_r, scale

def infer_boxes_option1(images):
    X = model(images)
    counts, boxes_list, sizes = [], [], []
    for pred, im in zip(X.xyxy, images):
        W, H = im.size
        sizes.append([W, H])
        boxes = []
        if pred is not None and len(pred) > 0:
            for *xyxy, conf, cls in pred.tolist():
                xmin, ymin, xmax, ymax = xyxy
                boxes.append([int(xmin), int(ymin), int(xmax - xmin), int(ymax - ymin)])
        boxes_list.append(boxes)
        counts.append(len(boxes))
    return counts, boxes_list, sizes

def infer_boxes_option2(images):
    metas, resized = [], []
    for im in images:
        im_r, s = _resize_keep_aspect(im, TARGET_W)
        resized.append(im_r)
        metas.append({"W0": im.size[0], "H0": im.size[1], "scale": s})
    X = model(resized)
    counts, boxes_list, sizes = [], [], []
    for pred, im, meta in zip(X.xyxy, images, metas):
        W0, H0, s = meta["W0"], meta["H0"], meta["scale"]
        sizes.append([W0, H0])
        boxes = []
        if pred is not None and len(pred) > 0:
            for *xyxy, conf, cls in pred.tolist():
                xmin_r, ymin_r, xmax_r, ymax_r = xyxy
                x = int(round(xmin_r / s))
                y = int(round(ymin_r / s))
                w = int(round((xmax_r - xmin_r) / s))
                h = int(round((ymax_r - ymin_r) / s))
                boxes.append([x, y, w, h])
        boxes_list.append(boxes)
        counts.append(len(boxes))
    return counts, boxes_list, sizes

def infer_boxes(images):
    if USE_RESIZE:
        return infer_boxes_option2(images)
    return infer_boxes_option1(images)
