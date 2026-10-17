import sys
import torch
from pathlib import Path
from collections import OrderedDict
from PIL import Image

HERE = Path(__file__).resolve().parent
YOLO_DIR = HERE.parent
sys.path.insert(0, str(YOLO_DIR.resolve()))

from torch.serialization import add_safe_globals
from models.yolo import DetectionModel, Detect
from models.common import Conv, Bottleneck, C3, SPPF, Concat
from torch.nn import Sequential, ModuleList, Module, Identity, Dropout, SiLU, ReLU, LeakyReLU
from torch.nn.modules.conv import Conv2d
from torch.nn.modules.batchnorm import BatchNorm2d
from torch.nn.modules.pooling import MaxPool2d, AdaptiveAvgPool2d, AvgPool2d
from torch.nn.modules.upsampling import Upsample
from pathlib import WindowsPath, PosixPath, PurePath, PureWindowsPath, PurePosixPath

add_safe_globals([
    DetectionModel, Detect, Conv, Bottleneck, C3, SPPF, Concat,
    Sequential, ModuleList, Module, Identity, Dropout, SiLU, ReLU, LeakyReLU,
    Conv2d, BatchNorm2d, MaxPool2d, AdaptiveAvgPool2d, AvgPool2d, Upsample,
    OrderedDict, WindowsPath, PosixPath, PurePath, PureWindowsPath, PurePosixPath,
])

_orig = torch.load
def _compat(*a, **k):
    if 'weights_only' not in k:
        k['weights_only'] = False
    return _orig(*a, **k)
torch.load = _compat

WEIGHTS = YOLO_DIR / "type.pt"   
device = 'cuda' if torch.cuda.is_available() else 'cpu'

model = torch.hub.load(str(YOLO_DIR), 'custom', path=str(WEIGHTS), source='local', force_reload=False)
model.to(device).eval()
model.conf = 0.25

def infer_species(images, conf_thres=0.25, iou_thres=0.5):
    """จำแนกชนิดเชื้อในจานเพาะ"""
    if hasattr(model, 'conf'):
        model.conf = float(conf_thres)
    if hasattr(model, 'iou'):
        try:
            model.iou = float(iou_thres)
        except Exception:
            pass

    results = model(images)
    names = getattr(model, 'names', None) or getattr(results, 'names', None) or {}

    sizes = []
    all_det = []
    for preds, im in zip(results.xyxy, images):
        W, H = im.size
        sizes.append([W, H])
        dets = []
        if preds is not None and len(preds) > 0:
            for *xyxy, conf, cls_idx in preds.tolist():
                x1, y1, x2, y2 = xyxy
                x, y, w, h = int(x1), int(y1), int(x2 - x1), int(y2 - y1)
                cls_name = (
                    names[int(cls_idx)]
                    if isinstance(names, (dict, list)) and int(cls_idx) in names
                    else str(int(cls_idx))
                )
                dets.append({
                    "box": [x, y, w, h],
                    "cls": cls_name,
                    "conf": float(conf)
                })
        all_det.append(dets)
    return sizes, all_det
