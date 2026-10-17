import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom';
import Pagination from '@mui/material/Pagination';
import Stack from '@mui/material/Stack';
import { BsFillTrashFill, BsHighlighter } from "react-icons/bs";

function Try() {

    const { state } = useLocation();
    const canvasRef = useRef(null);
    const picture = state.imgf
    console.log(picture.length)
    const counter = state.count
    const codina = state.codination

    const [INDEX, setINDEX] = useState(0);

    const [isDragging, set_isDragging] = useState(false);
    const [Check, set_Check] = useState(true);
    //console.log("length: ", rectangles.length, rectangles)
    console.log(codina[INDEX])


    useEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        const image = new Image();

        image.src = URL.createObjectURL(picture[INDEX])
        image.onload = () => {
            canvas.width = 700;
            canvas.height = 650;
            ctx.drawImage(image, 0, 0, image.width, image.height,
                0, 0, canvas.width, canvas.height);

            ctx.strokeStyle = '#FF0000';
            ctx.font = '15px serif';
            ctx.fillStyle = '#FF0000';

            codina[INDEX].forEach((box, index) => {
                ctx.beginPath();
                ctx.strokeRect(box[0], box[1], box[2], box[3]);
                const center_x = Number(((box[0]) + (box[0] + box[2])) / 2) - 5;
                const center_y = Number(((box[1]) + (box[1] + box[3])) / 2) + 5;
                ctx.fillText(`${index + 1}`, center_x, center_y);
                ctx.stroke();
            });
        }
        const mouseDown = (e) => {
            const startX = e.pageX - canvas.offsetLeft;
            const startY = e.pageY - canvas.offsetTop;
            set_isDragging(true)
            // setRectangles([...rectangles, { startX: startX, startY: startY, width: 0, height: 0 }]);
            // rectangles.push({ startX: startX, startY: startY, width: 0, height: 0 });

            codina[INDEX].push([startX, startY, 0, 0])
            console.log("1", isDragging)
        };
        const mouseMove = (e) => {
            if (isDragging) {
                console.log("2", isDragging, codina[INDEX].length)
                const currentRect = codina[INDEX][codina[INDEX].length - 1];
                const mouseX = e.pageX - canvas.offsetLeft;
                const mouseY = e.pageY - canvas.offsetTop;
                currentRect[2] = mouseX - currentRect[0];
                currentRect[3] = mouseY - currentRect[1];
                redrawCanvas();
            }
        };
        const redrawCanvas = () => { //วาด
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, image.width, image.height,
                0, 0, canvas.width, canvas.height
            );
            ctx.font = '15px serif';
            ctx.strokeStyle = 'red';
            codina[INDEX].forEach((rect, i) => {
                ctx.beginPath();
                ctx.strokeRect(rect[0], rect[1], rect[2], rect[3]);
                ctx.stroke();
                const center_x = ((rect[0]) + (rect[0] + rect[2])) / 2 - 5;
                const center_y = ((rect[1]) + (rect[1] + rect[3])) / 2 + 5;
                ctx.fillStyle = 'red';
                ctx.fillText(i + 1, center_x, center_y);
            });
        };
        const mouseUp = () => {
            console.log("3", isDragging)
            set_isDragging(false)
        };
        const mouseDown_remove = (e) => {
            const arraysMatch = (arr1, arr2) => {
                if (arr1.length !== arr2.length) return false;
                for (let i = 0; i < arr1.length; i++) {
                    if (arr1[i] !== arr2[i]) return false;
                }
                return true;
            };

            const Xt = e.pageX - canvas.offsetLeft;
            const Yt = e.pageY - canvas.offsetTop;
            const size = 10

            console.log("hhhhhhhhhhhhhhhhh: ", Xt, Yt)
            //codina[INDEX].for((rect, i) => {

            for (let i = 0; i < codina[INDEX].length; i++) {
                const rect = codina[INDEX][i]
                const itemToRemove = [rect[0], rect[1], rect[2], rect[3]]

                if ((Xt > rect[0] && Xt < rect[2] + rect[0]) && (Yt > rect[1] && Yt < rect[3] + rect[1])) {
                    const filteredData = codina[INDEX].filter(item => !arraysMatch(item, itemToRemove));
                    ctx.beginPath();
                    ctx.moveTo(Xt - size, Yt - size);//  มันคือ \
                    ctx.lineTo(Xt + size, Yt + size);//    มันคือ \   
                    ctx.moveTo(Xt + size, Yt - size);//มันคือ /                กลายเป็น X
                    ctx.lineTo(Xt - size, Yt + size);//มันคือ /
                    ctx.strokeStyle = '#FF0000';
                    ctx.lineWidth = 2;
                    ctx.stroke();
                    ctx.closePath();
                    console.log("will remove index: ", i + 1)
                    console.log(i + 1)
                    codina[INDEX] = filteredData
                    break
                }
            }

            ///});
        }
        if (Check == true) {
            canvas.addEventListener('mousedown', mouseDown);
            canvas.addEventListener('mousemove', mouseMove);
            canvas.addEventListener('mouseup', mouseUp);

            canvas.removeEventListener('mousedown', mouseDown_remove);
        } else if (Check == false) {
            canvas.removeEventListener('mousedown', mouseDown);
            canvas.removeEventListener('mouseup', mouseUp);
            canvas.removeEventListener('mousemove', mouseMove);

            canvas.addEventListener('mousedown', mouseDown_remove);
        }

        return () => {
            canvas.removeEventListener('mousedown', mouseDown);
            canvas.removeEventListener('mouseup', mouseUp);
            canvas.removeEventListener('mousemove', mouseMove);

            canvas.removeEventListener('mousedown', mouseDown_remove);
        };
    }, [isDragging, Check, INDEX, codina[INDEX]])

    // const saveImage = async () => {
    //     console.log("jffhfjfjfhgghfjfjdhshsjfj")
    // }

    return (
        <>
            <div className='flex justify-center mt-4' >
                <BsFillTrashFill className='mr-4 mt-1' />
                <input type="checkbox" className="toggle toggle-success" checked={Check} onChange={(e) => {
                    // console.log(e.target.checked)
                    if (e.target.checked == true) {
                        set_Check(true)
                    } else {
                        set_Check(false)
                    }
                }} />
                <BsHighlighter className='ml-4 mt-1' />
            </div>
            <div className='flex justify-center'>
                <h1 className=' mt-1 ml-1'>Delete</h1>
                <h1 className=' mt-1 ml-12 '>Modify</h1>
            </div>

            <div className='flex justify-center mt-4 '>
                <div className=' bg-zinc-200 border-2 border-green-400 shadow-3xl'>
                    <canvas ref={canvasRef} />
                </div>
            </div>
            <div className='flex justify-center mt-4'>
                <h1 style={{ fontSize: 40 }} >Number of Colony :   </h1>
                <div style={{ fontSize: 40 }}>
                    {codina[INDEX].length}
                </div>
            </div>

            <div className='flex justify-center mt-4'>
                <Stack spacing={2}>
                    <Pagination count={picture.length} onChange={(e, page) => {
                        //console.log("index", page - 1)
                        setINDEX(page - 1)
                    }} />
                </Stack>
            </div>
            {/* <div className='flex justify-center mt-4'>
            <button className="btn btn-success" onClick={saveImage}>Download</button>
            </div> */}
        </>
    )
}

export default Try
