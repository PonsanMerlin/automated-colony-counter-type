import React, { useMemo, useRef } from "react";
import { Pie } from "react-chartjs-2";
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function ResultSummary() {
    const data = useMemo(() => {
        try {
            const raw = localStorage.getItem("colony_last_result");
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }, []);

    const overlayURL = useMemo(() => {
        const s = localStorage.getItem("colony_last_snapshot");
        return s ? s : null;
    }, []);

    const chartRef = useRef(null);

    if (!data || !data.rows || !data.rows.length) {
        return (
            <div className="p-6 max-w-5xl mx-auto">
                <h1 className="text-xl font-semibold mb-3">Result Summary</h1>
                <p className="text-gray-600">
                    ⚠️ ยังไม่มีผลลัพธ์ล่าสุด กรุณากลับไปหน้า{" "}
                    <a className="text-indigo-600 underline" href="/">
                        Detect &amp; Cluster
                    </a>{" "}
                    แล้วรัน K-means ก่อน
                </p>
            </div>
        );
    }

    const labels = data.rows.map(function (r) {
        return "Cluster " + r.cluster + " (" + r.percent + "%)";
    });
    const values = data.rows.map(function (r) { return r.count; });
    const colors = data.rows.map(function (r) { return r.color; });

    const chartData = {
        labels: labels,
        datasets: [
            {
                data: values,
                backgroundColor: colors,
                borderWidth: 1,
            },
        ],
    };

    const downloadResultImage = () => {
        if (!overlayURL) return;
        const a = document.createElement("a");
        a.download = (data.filename || "result") + "_overlay.png";
        a.href = overlayURL;
        a.click();
    };

    const downloadSummaryPNG = () => {
        const chartCanvas = chartRef.current && chartRef.current.canvas;
        const W = 1200, H = 700;
        const out = document.createElement("canvas");
        out.width = W;
        out.height = H;
        const ctx = out.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = "#111827";
        ctx.font = "20px sans-serif";
        ctx.fillText("Summary: " + (data.filename || "-"), 24, 36);
        ctx.font = "14px sans-serif";
        ctx.fillStyle = "#6b7280";
        ctx.fillText(
            "Total: " + data.total + " colonies • Updated: " + new Date(data.when).toLocaleString(),
            24,
            60
        );

        if (chartCanvas) {
            const img = chartCanvas.toDataURL("image/png");
            const tmp = new Image();
            tmp.onload = function () {
                ctx.drawImage(tmp, 24, 90, 540, 540);
                drawTableAndFinish();
            };
            tmp.src = img;
        } else {
            drawTableAndFinish();
        }

        function drawTableAndFinish() {
            const X = 600, Y0 = 110;
            ctx.fillStyle = "#111827";
            ctx.font = "16px sans-serif";
            ctx.fillText("Table", X, 90);

            ctx.font = "14px sans-serif";
            ctx.fillStyle = "#374151";
            ctx.fillText("Cluster", X, Y0);
            ctx.fillText("Count", X + 220, Y0);
            ctx.fillText("%", X + 320, Y0);

            var y = Y0 + 24;
            data.rows.forEach(function (r) {
                ctx.fillStyle = r.color;
                ctx.fillRect(X, y - 10, 12, 12);

                ctx.fillStyle = "#111827";
                ctx.textAlign = "start";
                ctx.fillText("Cluster " + r.cluster, X + 18, y);
                ctx.textAlign = "right";
                ctx.fillText(String(r.count), X + 280, y);
                ctx.fillText(String(r.percent) + "%", X + 360, y);

                y += 24;
            });

            y += 8;
            ctx.fillStyle = "#111827";
            ctx.font = "bold 14px sans-serif";
            ctx.textAlign = "start";
            ctx.fillText("รวม", X, y);
            ctx.textAlign = "right";
            ctx.fillText(String(data.total), X + 280, y);
            ctx.fillText("100%", X + 360, y);

            const a = document.createElement("a");
            a.download = (data.filename || "summary") + "_chart_table.png";
            a.href = out.toDataURL("image/png");
            a.click();
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-semibold">Result Summary</h1>
                <div className="flex gap-2">
                    <button
                        onClick={downloadResultImage}
                        className="px-3 py-1 rounded bg-indigo-600 text-white"
                    >
                        ดาวน์โหลดรูปผลลัพธ์
                    </button>
                    <button
                        onClick={downloadSummaryPNG}
                        className="px-3 py-1 rounded bg-purple-600 text-white"
                    >
                        ดาวน์โหลดสรุป (กราฟ+ตาราง)
                    </button>
                </div>
            </div>

            <div className="mb-2 text-sm text-gray-600">
                ไฟล์: <b>{data.filename || "-"}</b> • รวมทั้งสิ้น{" "}
                <b>{data.total}</b> กล่อง • อัปเดต: {new Date(data.when).toLocaleString()}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="border rounded p-3">
                    <Pie ref={chartRef} data={chartData} />
                </div>

                <div className="border rounded p-3">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2">Cluster</th>
                                    <th className="text-right p-2">Count</th>
                                    <th className="text-right p-2">% (of total)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.rows.map(function (r) {
                                    return (
                                        <tr key={String(r.cluster)} className="border-b">
                                            <td className="p-2">
                                                <span
                                                    style={{
                                                        display: "inline-block",
                                                        width: 12,
                                                        height: 12,
                                                        background: r.color,
                                                        borderRadius: 2,
                                                        marginRight: 8,
                                                    }}
                                                />
                                                {"Cluster " + r.cluster}
                                            </td>
                                            <td className="p-2 text-right">{r.count}</td>
                                            <td className="p-2 text-right">{r.percent}%</td>
                                        </tr>
                                    );
                                })}
                                <tr>
                                    <td className="p-2 font-semibold">รวม</td>
                                    <td className="p-2 text-right font-semibold">{data.total}</td>
                                    <td className="p-2 text-right">100%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6">
                        <div className="text-sm font-medium mb-2">Result image</div>
                        {overlayURL ? (
                            <img
                                src={overlayURL}
                                alt="result overlay"
                                className="max-h-[520px] border rounded"
                            />
                        ) : (
                            <div className="text-gray-500 text-sm">ไม่พบรูปผลลัพธ์</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}