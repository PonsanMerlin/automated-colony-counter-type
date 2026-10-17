Markdown
🧫 Automated Selective Color-wise Colony Counting on Spread Plates using Deep Learning and Human-in-the-loop Integration
[![IEEE Xplore](https://img.shields.io/badge/IEEE%20Xplore-11596933-00629B?style=for-the-badge&logo=ieee&logoColor=white)](https://ieeexplore.ieee.org/document/11596933)
[![DOI](https://img.shields.io/badge/DOI-10.1109%2FJCSSE68839.2026.11596933-blue?style=for-the-badge)](https://doi.org/10.1109/JCSSE68839.2026.11596933)
[![Model](https://img.shields.io/badge/Model-YOLOv8-FF6F00?style=for-the-badge&logo=ultralytics&logoColor=white)](https://github.com/ultralytics/ultralytics)
[![Python](https://img.shields.io/badge/Python-3.9%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20JSX-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)

> 📄 **Official Publication:** This work is accepted and published in the **2026 23rd International Joint Conference on Computer Science and Software Engineering (JCSSE)**.  
> 🔗 **Paper Access:** [Read on IEEE Xplore Digital Library](https://ieeexplore.ieee.org/document/11596933) | [Permanent DOI](https://doi.org/10.1109/JCSSE68839.2026.11596933


📌 Abstract & Overview
- การนับและจำแนกจุลินทรีย์บนจานเพาะเชื้อ (Agar Plates) ถือเป็นกระบวนการสำคัญในห้องปฏิบัติการจุลชีววิทยาและการตรวจสอบความปลอดภัยของอาหาร แต่การนับด้วยสายตามนุษย์ (Manual Counting) มักใช้เวลานานและเสี่ยงต่อความผิดพลาด โดยเฉพาะกรณีที่มีจุลินทรีย์หลายสายพันธุ์เติบโตปะปนกันบนจานเดียวกัน

- งานวิจัยนี้พัฒนาระบบตรวจนับและจำแนกโคโลนีอัตโนมัติ โดยประยุกต์ใช้โมเดล Deep Learning (YOLOv8) ร่วมกับการแปลงปริภูมิสี (Color Space Conversion) และ K-means Clustering พร้อมทั้งพัฒนาเว็บแอปพลิเคชันที่มีระบบ Human-in-the-loop Integration เพื่อให้ผู้เชี่ยวชาญสามารถตรวจสอบและปรับแก้ผลการตรวจนับได้อย่างสะดวกรวดเร็วและแม่นยำ


⚡ ไฮไลต์ผลการทดลอง (Key Performance & Achievements)
- หมวดหมู่การประเมิน (Metric) ผลลัพธ์ (Performance)
  - ฉolony Detection Accuracy (ความแม่นยำในการตรวจจับโคโลนี) 87.8%
  - Color Analysis Accuracy (ความแม่นยำในการวิเคราะห์จำแนกสี) 89.1%
- Human-in-the-loop Workflowลดภาระงานของนักวิจัย และแก้ปัญหาความกำกวมของสีโคโลนีได้อย่างมีประสิทธิภาพ


🎯 โหมดการทำงานของระบบ (Working Modes)
ระบบรองรับการทำงานหลัก 2 โหมด เพื่อตอบสนองบริบทการวิเคราะห์ที่หลากหลาย
1. Direct Species Counting Mode
   ใช้โมเดล YOLOv8 ตรวจจับและนับจำนวนสายพันธุ์เป้าหมายโดยตรง (รองรับ 5 สายพันธุ์ตัวแทน)
2. Selective Color-wise Counting Mode 
   ตรวจจับโคโลนีด้วย YOLOv8 แล้วส่งต่อพิกัดไปวิเคราะห์แยกกลุ่มตามเฉดสีด้วยเทคนิค Color Space Conversion (HSV) ร่วมกับ K-means Clustering
3. Human-in-the-Loop Web Workflow
   ระบบ Web Application แบบอินเทอร์แอคทีฟ ที่เปิดให้ผู้ใช้สามารถคลิกเพิ่ม, ลบ หรือปรับขนาด Bounding Box เพื่อแก้ไขผลลัพธ์ของโมเดลได้ทันที ก่อนส่งออกข้อมูลสถิติ


🛠️ โครงสร้างสถาปัตยกรรมและเทคโนโลยี (System Architecture & Tech Stack)
Deep Learning & Computer Vision
- Ultralytics YOLOv8 (Object Detection)
  - OpenCV (Image Preprocessing & Color Space Conversion)
  - Scikit-learn (K-Means Clustering)
- Backend
  - Python (FastAPI / Flask) สำหรับประมวลผลโมเดลและจัดการ Pipeline
- Frontend
  - React.js (JSX) สำหรับพัฒนา Interactive Web UI & Annotation Tool
 

🏛️ สถาบันและภาควิชาที่ร่วมวิจัย (Affiliations)
- มหาวิทยาลัยศิลปากร ภาควิชาคอมพิวเตอร์ และ ภาควิชาชีววิทยา คณะวิทยาศาสตร์
- สถาบันเทคโนโลยีพระจอมเกล้าเจ้าคุณทหารลาดกระบัง (KMITL) สาขาวิชาวิทยาศาสตร์และเทคโนโลยีการอาหาร คณะอุตสาหกรรมอาหาร


👥 คณะผู้วิจัยและที่ปรึกษาโครงการ
Panyanat Aonpong(อาจารย์ที่ปรึกษาหลัก / Principal Advisor)
Putthapong Phumsombat(อาจารย์ที่ปรึกษา / Co-Advisor)
Piyaporn Jirawatcharadech(อาจารย์ที่ปรึกษา / Co-Advisor)
Ponsan Pattanakit(Me) 
Kittiya Rattanawong(รุ่นพี่ที่ปรึกษา / Mentor)
