
import React, { useEffect, useMemo, useRef, useState } from "react";
import CanvasAnnotator from "./CanvasAnnotator.jsx";
import ClusterTools from "./ClusterTools.jsx";
import { kmeans, rgbToHsv } from "../lib/kmeans.js";

function sampleBoxMeanHSV(ctx, box){
  const {x,y,w,h} = box;
  const img = ctx.getImageData(x,y,w,h);
  const data = img.data;
  let r=0,g=0,b=0, cnt=0;
  for (let i=0;i<data.length;i+=4){
    r += data[i]; g += data[i+1]; b += data[i+2];
    cnt++;
  }
  r/=cnt; g/=cnt; b/=cnt;
  const [H,S,V]=rgbToHsv(r,g,b);
  return [H,S,V];
}

const DEFAULT_PALETTE = [
  "#ef4444","#10b981","#3b82f6","#f59e0b","#8b5cf6","#14b8a6","#e11d48","#22c55e"
];

export default function ColorClusterPage({imageUrl, initialBoxes}){
  const [k, setK] = useState(3);
  const [boxes, setBoxes] = useState(initialBoxes || []);
  const [labels, setLabels] = useState(new Array(boxes.length).fill(0));
  const canvasRef = useRef(null);
  const [counts, setCounts] = useState([]);

  useEffect(()=>{
    // recalc counts
    const c = Array(k).fill(0);
    labels.forEach(l => { if (l<k) c[l]++; });
    setCounts(c);
  }, [labels, k]);

  // prepare an offscreen canvas for sampling
  const [imgEl, setImgEl] = useState(null);
  const offRef = useRef(document.createElement("canvas"));
  useEffect(()=>{
    const im = new Image();
    im.onload=()=>{ setImgEl(im); };
    im.src = imageUrl;
  }, [imageUrl]);

  function recluster(){
    if (!imgEl) return;
    const canvas = offRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = imgEl.width;
    canvas.height = imgEl.height;
    ctx.drawImage(imgEl, 0,0);
    const feats = boxes.map(b => sampleBoxMeanHSV(ctx,b));
    const {labels: L} = kmeans(feats, k, 30);
    setLabels(L);
  }

  useEffect(()=>{ recluster(); }, [imgEl, boxes, k]);

  function onClickBox(index, e){
    if (e.altKey){ // ALT+Click to delete
      const nb = boxes.slice();
      nb.splice(index,1);
      setBoxes(nb);
      const nl = labels.slice();
      nl.splice(index,1);
      setLabels(nl);
      return;
    }
    // Cycle cluster on click
    const nl = labels.slice();
    nl[index] = (nl[index] + 1) % k;
    setLabels(nl);
  }

  function onAddBox(b){
    setBoxes(prev => [...prev, b]);
    setLabels(prev => [...prev, (prev.length? (prev[prev.length-1]+1)%k : 0)]);
  }

  return (
    <div className="space-y-3">
      <ClusterTools k={k} setK={setK} counts={counts} palette={DEFAULT_PALETTE.slice(0,k)} onRecluster={recluster}/>
      <CanvasAnnotator
        image={imageUrl}
        boxes={boxes}
        clusterLabels={labels}
        onClickBox={onClickBox}
        onAddBox={onAddBox}
        palette={DEFAULT_PALETTE.slice(0,k)}
      />
      <div className="flex gap-2">
        <button className="px-3 py-1 rounded-xl border" onClick={()=>recluster()}>Re-run K-means</button>
        <button className="px-3 py-1 rounded-xl border"
          onClick={()=>{
            const out = boxes.map((b,i)=>({...b, cluster: labels[i]}));
            const blob = new Blob([JSON.stringify(out,null,2)], {type:"application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = "annotations.json"; a.click();
            URL.revokeObjectURL(url);
          }}
        >Export JSON</button>
      </div>
      <p className="text-xs text-gray-500">การใช้งาน: คลิกที่กรอบเพื่อย้ายไปคลัสเตอร์ถัดไป • กด <b>Alt+Click</b> เพื่อลบกรอบ • <b>Shift+ลากเมาส์</b> เพื่อเพิ่มกรอบใหม่</p>
    </div>
  );
}
