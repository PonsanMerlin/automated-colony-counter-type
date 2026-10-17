
import React, { useEffect, useRef, useState } from "react";

/**
 * CanvasAnnotator
 * props:
 *  - image: HTMLImageElement or URL string
 *  - boxes: [{x,y,w,h, id}] (pixel coords relative to display size)
 *  - clusterLabels: number[] same length as boxes
 *  - onBoxesChange(newBoxes)
 *  - onClickBox(index, event)
 *  - onAddBox(newBox)  // when user draws a new box
 *  - onDeleteBox(index)
 *  - palette: string[] CSS colors for clusters
 */
export default function CanvasAnnotator({
  image,
  boxes,
  clusterLabels,
  onBoxesChange,
  onClickBox,
  onAddBox,
  onDeleteBox,
  palette = []
}) {
  const canvasRef = useRef(null);
  const [imgEl, setImgEl] = useState(null);
  const [drawing, setDrawing] = useState(null); // {x0,y0}
  const [hoverIndex, setHoverIndex] = useState(-1);

  useEffect(() => {
    if (typeof image === "string") {
      const im = new Image();
      im.onload = () => setImgEl(im);
      im.src = image;
    } else if (image instanceof HTMLImageElement) {
      setImgEl(image);
    }
  }, [image]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgEl) return;
    const ctx = canvas.getContext("2d");
    canvas.width = imgEl.width;
    canvas.height = imgEl.height;
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
    // draw boxes
    if (boxes) {
      boxes.forEach((b, i) => {
        const color = palette[clusterLabels?.[i] ?? 0] || "black";
        ctx.strokeStyle = color;
        ctx.lineWidth = (i===hoverIndex)?3:2;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      });
    }
    // draw temp rect
    if (drawing) {
      const {x0,y0,x1,y1} = drawing;
      const x = Math.min(x0,x1), y = Math.min(y0,y1);
      const w = Math.abs(x1-x0), h = Math.abs(y1-y0);
      ctx.setLineDash([6,4]);
      ctx.strokeStyle = "#333";
      ctx.strokeRect(x,y,w,h);
      ctx.setLineDash([]);
    }
  }, [imgEl, boxes, drawing, hoverIndex, palette, clusterLabels]);

  const getMouse = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return {x,y};
  };

  const handleMouseDown = (e) => {
    if (e.shiftKey) {
      const {x,y} = getMouse(e);
      setDrawing({x0:x, y0:y, x1:x, y1:y});
    }
  };
  const handleMouseMove = (e) => {
    const {x,y} = getMouse(e);
    if (drawing) {
      setDrawing(prev => ({...prev, x1:x, y1:y}));
    } else {
      // hover detection
      const idx = boxes?.findIndex(b => x>b.x && x<b.x+b.w && y>b.y && y<b.y+b.h) ?? -1;
      setHoverIndex(idx);
    }
  };
  const handleMouseUp = (e) => {
    if (drawing) {
      const {x0,y0,x1,y1} = drawing;
      const x = Math.min(x0,x1), y=Math.min(y0,y1);
      const w = Math.abs(x1-x0), h=Math.abs(y1-y0);
      setDrawing(null);
      if (w>4 && h>4) {
        onAddBox?.({x,y,w,h, id: crypto.randomUUID()});
      }
    }
  };

  const handleClick = (e) => {
    const {x,y} = getMouse(e);
    const idx = boxes?.findIndex(b => x>b.x && x<b.x+b.w && y>b.y && y<b.y+b.h);
    if (idx!=null && idx>=0) {
      onClickBox?.(idx, e);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      style={{maxWidth:"100%", border:"1px solid #e5e7eb", borderRadius:12, cursor:"crosshair"}}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      title="Shift+Drag เพื่อเพิ่มกรอบใหม่ • คลิกกล่องเพื่อเลือก/ลบ/เปลี่ยนกลุ่ม"
    />
  );
}
