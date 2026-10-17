import axios from 'axios';
import { useState } from 'react'
import { useNavigate } from 'react-router-dom';

function App() {

  const [imageURL, setImageURL] = useState([]);
  const [selected, setselected] = useState(null)

  const Navi = useNavigate();

  const handleImageUpload = (event) => {
    const imagesfile = Array.from(event.target.files)
    setImageURL(imagesfile)
    setselected(event.target.files)
  };

  const handleUpload = async () => {
    const formData = new FormData();

    for (const file of selected) {
      formData.append('Files_image', file);
    }
    try {
      await axios.post('http://127.0.0.1:5000/UpFilesImages', formData).then((res) => {
        if (res.status == 200) {
          console.log("ok")
          console.log(res.data["counter"], res.data["codination"])
          Navi('/Try', 
          {state: {
              imgf : imageURL,
              count : res.data["counter"],
              codination : res.data["codination"]
            }
          });
        }
      }).catch((error) => {
        console.log("A", error)
      })
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <>
      <div className="navbar bg-green-200 border-b-green-400 border-2">
        <a className="btn btn-ghost text-xl text-black">COLONY COUNTER
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
            <path d="M16.5 7.5h-9v9h9v-9Z" />
            <path fillRule="evenodd" d="M8.25 2.25A.75.75 0 0 1 9 3v.75h2.25V3a.75.75 0 0 1 1.5 0v.75H15V3a.75.75 0 0 1 1.5 0v.75h.75a3 3 0 0 1 3 3v.75H21A.75.75 0 0 1 21 9h-.75v2.25H21a.75.75 0 0 1 0 1.5h-.75V15H21a.75.75 0 0 1 0 1.5h-.75v.75a3 3 0 0 1-3 3h-.75V21a.75.75 0 0 1-1.5 0v-.75h-2.25V21a.75.75 0 0 1-1.5 0v-.75H9V21a.75.75 0 0 1-1.5 0v-.75h-.75a3 3 0 0 1-3-3v-.75H3A.75.75 0 0 1 3 15h.75v-2.25H3a.75.75 0 0 1 0-1.5h.75V9H3a.75.75 0 0 1 0-1.5h.75v-.75a3 3 0 0 1 3-3h.75V3a.75.75 0 0 1 .75-.75ZM6 6.75A.75.75 0 0 1 6.75 6h10.5a.75.75 0 0 1 .75.75v10.5a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V6.75Z" clipRule="evenodd" />
          </svg>
        </a>
      </div>
      <div className ='flex justify-center'>
        <input type="file" className="file-input file-input-bordered file-input-success w-full max-w-xs mt-4" multiple onChange={handleImageUpload} />
      </div >
      <h1 className ='flex justify-center'>You can add more thant 1 picture</h1>

      {selected && <div className='flex justify-center'>
        <div className='flex justify-center mt-4 p-2 bg-zinc-200 size-fit border-2 border-green-400'>
          <div className="grid grid-cols-8 gap-4 ">
            {
              imageURL.map((file, index) => {
                return (<img
                  key={index}
                  src={URL.createObjectURL(file)}
                  alt={`selected-img-${index}`}
                  width={120} height={125}
                />
                )
              })}
          </div>
        </div>
      </div>}

      {selected && <div className='flex justify-center mt-4'>
        <button className="btn btn-wide  bg-success" onClick={handleUpload}>Upload</button>
      </div>}
    </>
  )
}

export default App
