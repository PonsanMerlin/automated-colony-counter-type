import React, { useEffect, useRef, useState, useMemo } from "react";
import { kmeans } from "./lib/kmeans";

const API_CLUSTER = "http://127.0.0.1:5000/UpFilesImages"; 
const API_SPECIES = "http://127.0.0.1:5000/DetectType";    

const VIEW_W = 700;
const VIEW_H = 650;


const palette = [
  "#e74c3c", "#2ecc71", "#3498db", "#f1c40f", "#9b59b6",
  "#1abc9c", "#e67e22", "#34495e", "#ff6b6b", "#7bed9f"
];
const speciesPalette = [
  "#1e90ff", "#ff8c00", "#2ed573", "#e84393", "#00cec9",
  "#fdcb6e", "#74b9ff", "#a29bfe", "#55efc4", "#fab1a0"
];

const SPECIES_CLASSES = [
  "B-subtilis",
  "C-albicans",
  "Contamination",
  "Defect",
  "E-coli",
  "P-aeruginosa",
  "S-aureus",
];

function dist2(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1], dz = a[2] - b[2];
  return dx*dx + dy*dy + dz*dz;
}
function computeTransform(W, H) {
  const s = Math.min(VIEW_W / W, VIEW_H / H);
  const drawW = W * s, drawH = H * s;
  const offX = (VIEW_W - drawW) / 2;
  const offY = (VIEW_H - drawH) / 2;
  return { s, offX, offY, drawW, drawH };
}
function orig2view(box, W, H) {
  const { s, offX, offY } = computeTransform(W, H);
  const [x, y, w, h] = box;
  return [offX + x * s, offY + y * s, w * s, h * s];
}
function colorForClass(cls, classOrderMap) {
  const idx = classOrderMap[cls] ?? 0;
  return speciesPalette[idx % speciesPalette.length];
}

export default function Demo() {
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const viewCanvasRef = useRef(null);
  const imgCanvasRef = useRef(null);

  const [filename, setFilename] = useState("");
  const [imageURL, setImageURL] = useState("");
  const [origSize, setOrigSize] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [mainMode, setMainMode] = useState("cluster"); 


  const [boxes, setBoxes] = useState([]);     
  const [labels, setLabels] = useState([]);   
  const [kValue, setKValue] = useState(2);
  const [mode, setMode] = useState("select"); 
  const [sel, setSel] = useState(-1);
  const [drag, setDrag] = useState(null);
  const [history, setHistory] = useState([]); 

  const [speciesDet, setSpeciesDet] = useState([]);
  const [confThres] = useState(0.25);
  const [nmsIoU] = useState(0.5);
  const [classFilter, setClassFilter] = useState({});

  const [modeSpecies, setModeSpecies] = useState("select");
  const [selSpecies, setSelSpecies] = useState(-1);
  const [dragSpecies, setDragSpecies] = useState(null);
  const [historySpecies, setHistorySpecies] = useState([]); 

  const classOrderMap = useMemo(() => {
    const uniq = Array.from(new Set(speciesDet.map(d => d.cls))).sort();
    const m = {};
    uniq.forEach((c, i) => (m[c] = i));
    return m;
  }, [speciesDet]);

  function pushHistory() {
    setHistory(h => {
      const snapshot = { boxes: boxes.map(b => [...b]), labels: [...labels] };
      const next = [...h, snapshot];
      if (next.length > 50) next.shift();
      return next;
    });
  }
  function undo() {
    setHistory(h => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setBoxes(prev.boxes.map(b => [...b]));
      setLabels([...prev.labels]);
      setSel(-1);
      setTimeout(drawOverlay, 0);
      return h.slice(0, h.length - 1);
    });
  }

  function pushSpeciesHistory() {
    setHistorySpecies(h => {
      const snapshot = {
        speciesDet: speciesDet.map(d => ({
          orig: [...d.orig],
          view: [...d.view],
          cls: d.cls,
          conf: d.conf
        })),
      };
      const next = [...h, snapshot];
      if (next.length > 50) next.shift();
      return next;
    });
  }
  function undoSpecies() {
    setHistorySpecies(h => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setSpeciesDet(prev.speciesDet.map(d => ({
        orig: [...d.orig],
        view: [...d.view],
        cls: d.cls,
        conf: d.conf
      })));
      setSelSpecies(-1);
      setTimeout(drawOverlay, 0);
      return h.slice(0, h.length - 1);
    });
  }

  function drawOverlay(drawDragFlag = true) {
    const cvs = viewCanvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    ctx.clearRect(0, 0, cvs.width, cvs.height);

    if (mainMode === "cluster") {
      for (let i = 0; i < boxes.length; i++) {
        const [x, y, w, h] = boxes[i];
        const col = palette[(labels?.[i] ?? 0) % palette.length];
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = col;
        ctx.font = "12px sans-serif";
        ctx.fillText(String(i + 1), x + 2, y + 12);
      }
      if (sel >= 0 && boxes[sel]) {
        const [x, y, w, h] = boxes[sel];
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
      }
      if (drawDragFlag && drag) {
        const x = Math.min(drag.x0, drag.x1);
        const y = Math.min(drag.y0, drag.y1);
        const w = Math.abs(drag.x1 - drag.x0);
        const h = Math.abs(drag.y1 - drag.y0);
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "#ff00aa";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
      }
    }

    if (mainMode === "species") {
      for (let i = 0; i < speciesDet.length; i++) {
        const d = speciesDet[i];
        if (Object.keys(classFilter).length && classFilter[d.cls] === false) continue;
        const [x, y, w, h] = d.view;
        const col = colorForClass(d.cls, classOrderMap);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = col;
        ctx.font = "12px sans-serif";
        ctx.fillText(`${d.cls} ${(d.conf * 100).toFixed(0)}%`, x + 2, y + 12);
      }
      if (selSpecies >= 0 && speciesDet[selSpecies]) {
        const [x, y, w, h] = speciesDet[selSpecies].view;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, w, h);
      }
      if (drawDragFlag && dragSpecies) {
        const x = Math.min(dragSpecies.x0, dragSpecies.x1);
        const y = Math.min(dragSpecies.y0, dragSpecies.y1);
        const w = Math.abs(dragSpecies.x1 - dragSpecies.x0);
        const h = Math.abs(dragSpecies.y1 - dragSpecies.y0);
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = "#ff00aa";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.setLineDash([]);
      }
    }
  }

  function paintImageToImgCanvas() {
    if (!imgRef.current || !origSize) return;
    const img = imgRef.current;
    const cvs = imgCanvasRef.current;
    const ctx = cvs.getContext("2d");
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    const [W, H] = origSize;
    const { offX, offY, drawW, drawH } = computeTransform(W, H);
    ctx.drawImage(img, offX, offY, drawW, drawH);
  }

  function meanColorOfBox(boxView) {
    const cvs = imgCanvasRef.current;
    const ctx = cvs.getContext("2d");
    const [x, y, w, h] = boxView.map(v => Math.max(0, Math.round(v)));
    const W = cvs.width, H = cvs.height;
    if (w <= 0 || h <= 0) return [0, 0, 0];
    const sx = Math.min(W, Math.max(0, x));
    const sy = Math.min(H, Math.max(0, y));
    const sw = Math.min(W - sx, Math.max(1, w));
    const sh = Math.min(H - sy, Math.max(1, h));
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    let r = 0, g = 0, b = 0, c = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; c++; }
    return c ? [r / c, g / c, b / c] : [0, 0, 0];
  }

  function computeAndSaveSummary() {
    const counts = labels.reduce((acc, l) => ((acc[l] = (acc[l] || 0) + 1), acc), {});
    const rows = Object.entries(counts).map(([c, n]) => {
      const pct = (n / boxes.length) * 100 || 0;
      return { cluster: Number(c), count: n, percent: Math.round(pct), color: palette[c % palette.length] };
    }).sort((a, b) => a.cluster - b.cluster);

    const payload = { filename, total: boxes.length, rows, when: Date.now() };
    localStorage.setItem("colony_last_result", JSON.stringify(payload));
  }

  function saveOverlaySnapshot() {
    try {
      const baseImg = imgRef.current;
      const overlay = viewCanvasRef.current;
      if (!baseImg || !overlay) return;

      const out = document.createElement("canvas");
      out.width = VIEW_W;
      out.height = VIEW_H;
      const ctx = out.getContext("2d");

      if (origSize && baseImg.complete) {
        const [W, H] = origSize;
        const { offX, offY, drawW, drawH } = computeTransform(W, H);
        ctx.drawImage(baseImg, offX, offY, drawW, drawH);
      } else {
        ctx.drawImage(baseImg, 0, 0, VIEW_W, VIEW_H);
      }
      ctx.drawImage(overlay, 0, 0);

      const url = out.toDataURL("image/png");
      localStorage.setItem("colony_last_snapshot", url);
    } catch (e) {
      console.warn("saveOverlaySnapshot failed:", e);
    }
  }

  function clearSummaryCache() {
    localStorage.removeItem("colony_last_result");
    localStorage.removeItem("colony_last_snapshot");
  }
  const handleFileChange = () => {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    setFilename(f.name);
    const url = URL.createObjectURL(f);
    setImageURL(url);

    setBoxes([]); setLabels([]); setSel(-1); setHistory([]);
    setSpeciesDet([]); setClassFilter({});
    clearSummaryCache();
  };

  const onImageLoad = () => { paintImageToImgCanvas(); drawOverlay(); };

  const handleDetectCluster = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) { alert("กรุณาเลือกไฟล์ภาพก่อน"); return; }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("Files_image", f, f.name);
      const res = await fetch(API_CLUSTER, { method: "POST", body: fd });
      const data = await res.json();

      const origBoxes = (data?.codination?.[0]) || [];
      const size = data?.sizes?.[0] || null;
      if (!size) { alert("ไม่พบ sizes จาก backend"); return; }
      setOrigSize(size);

      setTimeout(() => {
        paintImageToImgCanvas();
        const [W, H] = size;
        const mapped = origBoxes.map(b => orig2view(b, W, H));
        setBoxes(mapped);
        setLabels(new Array(mapped.length).fill(0)); 
        setSel(-1);
        setHistory([]);
        setTimeout(drawOverlay, 0);
      }, 40);
    } catch (e) {
      console.error(e);
      alert("เรียก API ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleRunKmeans = () => {
    if (!boxes.length) { alert("ยังไม่มีผล detect"); return; }
    const features = boxes.map(b => meanColorOfBox(b).map(v => v / 255));
    const k = Math.max(1, parseInt(kValue || 1, 10));
    const { labels: L } = kmeans(features, k, {
      seed: "colony-fixed-seed",
      init: "kmeans++",
      nInit: 5,
      maxIters: 30,
      sortLabels: "brightness",
    });
    setLabels(L);
    setSel(-1);
    setTimeout(drawOverlay, 0);
  };

  const handleDetectSpecies = async () => {
    const f = fileRef.current?.files?.[0];
    if (!f) { alert("กรุณาเลือกไฟล์ภาพก่อน"); return; }
    if (!origSize) {
      const img = imgRef.current;
      if (!img?.naturalWidth || !img?.naturalHeight) {
        alert("กรุณาโหลดภาพให้แสดงบนจอก่อน");
        return;
      }
      setOrigSize([img.naturalWidth, img.naturalHeight]);
    }

    const cacheKey = `species_cache:${filename}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed?.items?.length && parsed.size && parsed.filename === filename) {
          const [W, H] = parsed.size;
          const mapped = parsed.items.map(it => ({ ...it, view: orig2view(it.orig, W, H) }));
          setSpeciesDet(mapped);
          setClassFilter(parsed.classFilter || {});
          setTimeout(drawOverlay, 0);
          return;
        }
      } catch {}
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("Files_image", f, f.name);
      fd.append("conf_thres", String(confThres));
      fd.append("iou_thres", String(nmsIoU));
      const res = await fetch(API_SPECIES, { method: "POST", body: fd });
      const data = await res.json();

      const size = data?.sizes?.[0] || origSize;
      if (!size) { alert("ไม่พบ sizes จาก backend ของ species"); return; }
      setOrigSize(size);
      const [W, H] = size;

      const det = (data?.detections || []).map(d => ({
        orig: d.box,
        view: orig2view(d.box, W, H),
        cls: d.cls,
        conf: d.conf,
      }));

      setSpeciesDet(det);
      const allClasses = Array.from(new Set(det.map(d => d.cls)));
      const startFilter = {};
      allClasses.forEach(c => (startFilter[c] = true));
      setClassFilter(startFilter);

      const toStore = {
        filename,
        size,
        items: det.map(d => ({ orig: d.orig, cls: d.cls, conf: d.conf })),
        classFilter: startFilter,
        when: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(toStore));
      setTimeout(drawOverlay, 0);
    } catch (e) {
      console.error(e);
      alert("เรียก API Species ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const handleExportSpeciesCSV = () => {
    if (!speciesDet.length) { alert("ยังไม่มีผลจำแนกสายพันธุ์"); return; }
    const headers = [
      "filename", "class", "confidence",
      "orig_x", "orig_y", "orig_w", "orig_h",
      "view_x", "view_y", "view_w", "view_h",
    ];
    const rows = [headers.join(",")];
    for (const d of speciesDet) {
      if (Object.keys(classFilter).length && classFilter[d.cls] === false) continue;
      const line = [
        filename,
        `"${d.cls}"`,
        (d.conf ?? 1).toFixed(4),
        ...d.orig.map(v => Math.round(v)),
        ...d.view.map(v => Math.round(v)),
      ].join(",");
      rows.push(line);
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    a.download = `species_${ts}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onCanvasClick = (e) => {
    if (mainMode === "cluster") {
      if (mode !== "select") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      let found = -1;
      for (let i = boxes.length - 1; i >= 0; i--) {
        const [x, y, w, h] = boxes[i];
        if (px >= x && px <= x + w && py >= y && py <= y + h) { found = i; break; }
      }
      setSel(found);
      setTimeout(drawOverlay, 0);
      return;
    }

    if (mainMode === "species") {
      if (modeSpecies !== "select") return;
      const rect = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      let found = -1;
      for (let i = speciesDet.length - 1; i >= 0; i--) {
        const [x, y, w, h] = speciesDet[i].view;
        if (px >= x && px <= x + w && py >= y && py <= y + h) { found = i; break; }
      }
      setSelSpecies(found);
      setTimeout(drawOverlay, 0);
    }
  };

  const changeSelectedCluster = (newCluster) => {
    if (mainMode !== "cluster" || sel < 0) return;
    pushHistory();
    const L = [...labels];
    L[sel] = parseInt(newCluster, 10);
    setLabels(L);
    setTimeout(drawOverlay, 0);
  };
  const deleteSelected = () => {
    if (mainMode !== "cluster" || sel < 0) return;
    pushHistory();
    const B = [...boxes], L = [...labels];
    B.splice(sel, 1); L.splice(sel, 1);
    setBoxes(B); setLabels(L); setSel(-1);
    setTimeout(drawOverlay, 0);
  };

  const onMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (mainMode === "cluster" && mode === "add") {
      setDrag({
        x0: e.clientX - rect.left,
        y0: e.clientY - rect.top,
        x1: e.clientX - rect.left,
        y1: e.clientY - rect.top
      });
    }
    if (mainMode === "species" && modeSpecies === "add") {
      setDragSpecies({
        x0: e.clientX - rect.left,
        y0: e.clientY - rect.top,
        x1: e.clientX - rect.left,
        y1: e.clientY - rect.top
      });
    }
  };
  const onMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (drag) {
      setDrag(d => ({ ...d, x1: e.clientX - rect.left, y1: e.clientY - rect.top }));
      drawOverlay(false);
      const cvs = viewCanvasRef.current;
      const ctx = cvs.getContext("2d");
      const x = Math.min(drag.x0, e.clientX - rect.left);
      const y = Math.min(drag.y0, e.clientY - rect.top);
      const w = Math.abs((e.clientX - rect.left) - drag.x0);
      const h = Math.abs((e.clientY - rect.top) - drag.y0);
      ctx.setLineDash([6, 4]); ctx.strokeStyle = "#ff00aa"; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
    }
    if (dragSpecies) {
      setDragSpecies(d => ({ ...d, x1: e.clientX - rect.left, y1: e.clientY - rect.top }));
      drawOverlay(false);
      const cvs = viewCanvasRef.current;
      const ctx = cvs.getContext("2d");
      const x = Math.min(dragSpecies.x0, e.clientX - rect.left);
      const y = Math.min(dragSpecies.y0, e.clientY - rect.top);
      const w = Math.abs((e.clientX - rect.left) - dragSpecies.x0);
      const h = Math.abs((e.clientY - rect.top) - dragSpecies.y0);
      ctx.setLineDash([6, 4]); ctx.strokeStyle = "#ff00aa"; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h); ctx.setLineDash([]);
    }
  };
  const onMouseUp = () => {
    if (drag) {
      const x = Math.min(drag.x0, drag.x1);
      const y = Math.min(drag.y0, drag.y1);
      const w = Math.abs(drag.x1 - drag.x0);
      const h = Math.abs(drag.y1 - drag.y0);
      setDrag(null);
      if (w >= 5 && h >= 5) {
        pushHistory();
        const B = [...boxes, [x, y, w, h]];
        let L = [...labels, 0];
        if (labels.length) {
          const col = meanColorOfBox([x, y, w, h]);
          const centers = Array.from({ length: Math.max(...labels) + 1 }, (_, c) => {
            const idx = labels.map((lb, i) => [lb, i]).filter(([lb]) => lb === c).map(([, i]) => i);
            if (!idx.length) return [0, 0, 0];
            const s = idx.reduce((acc, i) => {
              const m = meanColorOfBox(boxes[i]); return [acc[0] + m[0], acc[1] + m[1], acc[2] + m[2]];
            }, [0, 0, 0]);
            return [s[0] / idx.length, s[1] / idx.length, s[2] / idx.length];
          });
          let best = 0, bd = Infinity;
          for (let c = 0; c < centers.length; c++) {
            const d = dist2(col, centers[c]);
            if (d < bd) { bd = d; best = c; }
          }
          L[L.length - 1] = best;
        }
        setBoxes(B); setLabels(L); setSel(B.length - 1);
      } else {
        drawOverlay();
      }
      return;
    }

    if (dragSpecies) {
      const x = Math.min(dragSpecies.x0, dragSpecies.x1);
      const y = Math.min(dragSpecies.y0, dragSpecies.y1);
      const w = Math.abs(dragSpecies.x1 - dragSpecies.x0);
      const h = Math.abs(dragSpecies.y1 - dragSpecies.y0);
      setDragSpecies(null);
      if (w >= 5 && h >= 5) {
        if (!origSize) { drawOverlay(); return; }
        const [W, H] = origSize;
        const { s, offX, offY } = computeTransform(W, H);
        const x0 = Math.max(0, Math.round((x - offX) / s));
        const y0 = Math.max(0, Math.round((y - offY) / s));
        const w0 = Math.max(1, Math.round(w / s));
        const h0 = Math.max(1, Math.round(h / s));

        pushSpeciesHistory();
        const newItem = {
          orig: [x0, y0, w0, h0],
          view: [x, y, w, h],
          cls: SPECIES_CLASSES[0],
          conf: 1.0,
        };
        const next = [...speciesDet, newItem];
        setSpeciesDet(next);
        setSelSpecies(next.length - 1);
      } else {
        drawOverlay();
      }
    }
  };

  const changeSelectedSpeciesClass = (newCls) => {
    if (selSpecies < 0) return;
    pushSpeciesHistory();
    const next = speciesDet.map((d, i) => i === selSpecies ? { ...d, cls: newCls } : d);
    setSpeciesDet(next);
    setTimeout(drawOverlay, 0);
  };
  const deleteSelectedSpecies = () => {
    if (selSpecies < 0) return;
    pushSpeciesHistory();
    const next = [...speciesDet];
    next.splice(selSpecies, 1);
    setSpeciesDet(next);
    setSelSpecies(-1);
    setTimeout(drawOverlay, 0);
  };

  useEffect(() => { drawOverlay(); },
    [boxes, labels, sel, drag, mainMode, speciesDet, classFilter, selSpecies, dragSpecies]);

  useEffect(() => { paintImageToImgCanvas(); }, [imageURL, origSize]);

  useEffect(() => {
    if (!filename) return;
    if (!boxes.length || !labels.length) return;

    requestAnimationFrame(() => {
      setTimeout(() => {
        drawOverlay();
        saveOverlaySnapshot();
        computeAndSaveSummary();
      }, 30);
    });
  }, [labels, boxes, filename]);

  const countsByCluster = labels.reduce((acc, l) => ((acc[l] = (acc[l] || 0) + 1), acc), {});
  const totalCluster = boxes.length;

  const speciesCounts = useMemo(() => {
    const m = {};
    for (const d of speciesDet) {
      if (Object.keys(classFilter).length && classFilter[d.cls] === false) continue;
      m[d.cls] = (m[d.cls] || 0) + 1;
    }
    return m;
  }, [speciesDet, classFilter]);
  const totalSpecies = Object.values(speciesCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Colony Counter</h1>
        <div className="flex gap-2">
          <a href="/summary" className="px-3 py-1 rounded bg-indigo-600 text-white">ไปหน้า Summary</a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-3">
        <input type="file" accept="image/*" ref={fileRef} onChange={handleFileChange} />

        {mainMode === "cluster" ? (
          <>
            <button
              className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
              onClick={handleDetectCluster}
              disabled={loading || !imageURL}
            >
              {loading ? "Detecting..." : "Detect"}
            </button>

            <label className="ml-2 text-sm">จำนวนกลุ่ม (k):</label>
            <input
              type="number" min={1} max={10}
              value={kValue}
              onChange={e => setKValue(e.target.value)}
              className="w-16 border px-2 py-1 rounded"
            />
            <button
              className="px-3 py-1 rounded bg-emerald-600 text-white"
              onClick={handleRunKmeans}
              disabled={!boxes.length}
            >
              Run K-means
            </button>

            <span className="ml-auto font-semibold">Count: {totalCluster}</span>

            <button
              className={`px-3 py-1 rounded text-white font-medium transition
                ${history.length === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600 active:bg-amber-700"}`}
              onClick={undo}
              disabled={history.length === 0}
              title="ย้อนกลับ (Cluster)"
            >
              ⟲ Undo
            </button>
          </>
        ) : (
          <>
            <button
              className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
              onClick={handleDetectSpecies}
              disabled={loading || !imageURL}
            >
              {loading ? "Detecting..." : "Detect Species"}
            </button>

            <span className="ml-auto font-semibold">Count: {totalSpecies}</span>

            <button
              className={`px-3 py-1 rounded bg-slate-700 text-white ${!speciesDet.length ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleExportSpeciesCSV}
              disabled={!speciesDet.length}
              title="ส่งออก CSV"
            >
              Export CSV
            </button>

            <button
              className={`px-3 py-1 rounded text-white font-medium transition
                ${historySpecies.length === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-600 active:bg-amber-700"}`}
              onClick={undoSpecies}
              disabled={historySpecies.length === 0}
              title="ย้อนกลับ (Species)"
            >
              ⟲ Undo
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 mb-2">
        <div className="text-sm">โหมดหลัก:</div>
        <button
          className={`px-3 py-1 rounded ${mainMode === "cluster" ? "bg-gray-800 text-white" : "bg-gray-200"}`}
          onClick={() => setMainMode("cluster")}
        >นับและจัดกลุ่มสี</button>
        <button
          className={`px-3 py-1 rounded ${mainMode === "species" ? "bg-gray-800 text-white" : "bg-gray-200"}`}
          onClick={() => setMainMode("species")}
        >จำแนกสายพันธุ์</button>

        {mainMode === "cluster" && (
          <>
            <div className="ml-6 text-sm">โหมดวาด:</div>
            <button
              className={`px-3 py-1 rounded ${mode === "select" ? "bg-gray-800 text-white" : "bg-gray-200"}`}
              onClick={() => setMode("select")}
            >เลือก/ย้ายคลัสเตอร์</button>
            <button
              className={`px-3 py-1 rounded ${mode === "add" ? "bg-gray-800 text-white" : "bg-gray-200"}`}
              onClick={() => setMode("add")}
            >เพิ่มกล่อง (ลากเมาส์)</button>

            <div className="ml-6 text-sm">คลัสเตอร์ของที่เลือก:</div>
            <select
              className="border px-2 py-1 rounded"
              value={sel >= 0 ? (labels[sel] ?? 0) : ""}
              onChange={e => changeSelectedCluster(e.target.value)}
              disabled={sel < 0}
            >
              <option value="" disabled>— เลือกกล่องก่อน —</option>
              {Array.from({ length: Math.max(1, parseInt(kValue || 1, 10)) }, (_, i) => (
                <option key={i} value={i}>Cluster {i}</option>
              ))}
            </select>
            <button
              className="px-3 py-1 rounded bg-rose-600 text-white disabled:opacity-50"
              onClick={deleteSelected}
              disabled={sel < 0}
            >ลบกล่องที่เลือก</button>
          </>
        )}

        {mainMode === "species" && (
          <>
            <div className="ml-6 text-sm">โหมดวาด:</div>
            <button
              className={`px-3 py-1 rounded ${modeSpecies === "select" ? "bg-gray-800 text-white" : "bg-gray-200"}`}
              onClick={() => setModeSpecies("select")}
            >เลือก/เปลี่ยนคลาส</button>
            <button
              className={`px-3 py-1 rounded ${modeSpecies === "add" ? "bg-gray-800 text-white" : "bg-gray-200"}`}
              onClick={() => setModeSpecies("add")}
            >เพิ่มกล่อง (ลากเมาส์)</button>

            <div className="ml-6 text-sm">คลาสของกล่องที่เลือก:</div>
            <select
              className="border px-2 py-1 rounded"
              value={selSpecies >= 0 ? (speciesDet[selSpecies]?.cls ?? "") : ""}
              onChange={e => changeSelectedSpeciesClass(e.target.value)}
              disabled={selSpecies < 0}
            >
              <option value="" disabled>— เลือกกล่องก่อน —</option>
              {SPECIES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
              className="px-3 py-1 rounded bg-rose-600 text-white disabled:opacity-50"
              onClick={deleteSelectedSpecies}
              disabled={selSpecies < 0}
            >ลบกล่องที่เลือก</button>
          </>
        )}
      </div>

      {mainMode === "cluster" ? (
        Object.keys(countsByCluster).length > 0 && (
          <div className="flex gap-4 text-sm mb-2">
            {Object.entries(countsByCluster).map(([c, n]) => (
              <div key={c} className="flex items-center gap-2">
                <span style={{ display: 'inline-block', width: 12, height: 12, background: palette[c % palette.length], borderRadius: 2 }} />
                Cluster {c}: {n}
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-wrap items-center gap-4 text-sm mb-2">
          {Array.from(new Set(speciesDet.map(d => d.cls))).sort().map((cls) => {
            const col = colorForClass(cls, classOrderMap);
            const checked = classFilter[cls] !== false;
            const count = speciesCounts[cls] || 0;
            return (
              <label key={cls} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => {
                    const v = e.target.checked;
                    setClassFilter(f => ({ ...f, [cls]: v }));
                  }}
                />
                <span style={{ display: 'inline-block', width: 12, height: 12, background: col, borderRadius: 2 }} />
                <span>{cls}: {count}</span>
              </label>
            );
          })}
        </div>
      )}

      <div style={{ position: "relative", width: VIEW_W, height: VIEW_H, border: "1px dashed #bbb" }}>
        <img
          ref={imgRef}
          src={imageURL || ""}
          alt=""
          style={{ position: "absolute", inset: 0, width: VIEW_W, height: VIEW_H, objectFit: "contain" }}
          onLoad={onImageLoad}
        />
        <canvas
          ref={viewCanvasRef}
          width={VIEW_W}
          height={VIEW_H}
          style={{ position: "absolute", inset: 0, cursor: (
            (mainMode === "cluster" && mode === "add") ||
            (mainMode === "species" && modeSpecies === "add")
          ) ? "crosshair" : "default" }}
          onClick={onCanvasClick}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
        />
        <canvas ref={imgCanvasRef} width={VIEW_W} height={VIEW_H} style={{ display: "none" }} />
      </div>
    </div>
  );
}