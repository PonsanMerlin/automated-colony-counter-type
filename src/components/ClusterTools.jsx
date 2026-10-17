
import React from "react";

/**
 * ClusterTools
 * props:
 *  - k
 *  - setK
 *  - counts: number[]
 *  - palette: string[]
 *  - onRecluster()
 */
export default function ClusterTools({k, setK, counts=[], palette=[], onRecluster}) {
  return (
    <div className="p-3 rounded-2xl border border-gray-200">
      <div className="flex items-center gap-3">
        <label className="font-semibold">จำนวนกลุ่มสี (k):</label>
        <input type="number" min={1} value={k} onChange={e=>setK(parseInt(e.target.value||1))}
               className="border rounded px-2 py-1 w-20"/>
        <button onClick={onRecluster} className="px-3 py-1 rounded-xl bg-black text-white">Run K-means</button>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {counts.map((c,i)=>(
          <div key={i} className="flex items-center gap-2 border rounded-xl px-2 py-1">
            <span className="inline-block w-4 h-4 rounded" style={{background: palette[i]}}/>
            <span className="text-sm">Cluster {i+1}: <b>{c}</b></span>
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">Tip: กด <b>Shift+ลากเมาส์</b> เพื่อเพิ่มกรอบโคโลนี • คลิกกล่องเพื่อเปลี่ยนกลุ่ม/ลบ</p>
    </div>
  );
}
