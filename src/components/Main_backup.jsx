import React, { useState, useRef, useEffect } from "react";
import { PiCowFill } from "react-icons/pi";
import { MdUndo, MdTextFields, MdDownload, MdPlayArrow, MdClose, MdAdd, MdRotateLeft, MdRotateRight, MdContentCopy } from "react-icons/md";
import { BsTypeBold } from "react-icons/bs";
import { Rnd } from "react-rnd";
import html2canvas from "html2canvas";

const Main = () => {
  const [textColor, setTextColor] = useState("#8b5cf6");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [font, setFont] = useState("Arial");
  const [bold, setBold] = useState(false);
  const [objects, setObjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const canvasRef = useRef(null);

  // Add new text
  const handleAddText = () => {
    const newObj = {
      id: Date.now(),
      type: "text",
      content: "New Text",
      x: 50,
      y: 50,
      width: 150,
      height: 50,
      rotation: 0,
      color: textColor,
      font,
      bold,
    };
    setObjects([...objects, newObj]);
    setHistory([...history, objects]);
    setSelectedId(newObj.id);
  };

  // Undo
  const handleUndo = () => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setObjects(prev);
      setHistory(history.slice(0, -1));
      setSelectedId(null);
    }
  };

  // Upload media
  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("video") ? "video" : "image";
    const newObj = {
      id: Date.now(),
      type,
      src: url,
      x: 50,
      y: 50,
      width: 200,
      height: 150,
      rotation: 0,
    };
    setObjects([...objects, newObj]);
    setHistory([...history, objects]);
    setSelectedId(newObj.id);
  };

  // Delete object
  const handleDelete = (id) => {
    setObjects(objects.filter((o) => o.id !== id));
    if (id === selectedId) setSelectedId(null);
  };

  // Rotate object
  const handleRotate = (id, delta) => {
    setObjects(
      objects.map((o) =>
        o.id === id ? { ...o, rotation: ((o.rotation || 0) + delta) % 360 } : o
      )
    );
  };

  // Duplicate object
  const handleDuplicate = (id) => {
    const objToDuplicate = objects.find((o) => o.id === id);
    if (!objToDuplicate) return;

    const duplicatedObj = {
      ...objToDuplicate,
      id: Date.now(),
      x: objToDuplicate.x + 20,
      y: objToDuplicate.y + 20,
    };
    setObjects([...objects, duplicatedObj]);
    setHistory([...history, objects]);
    setSelectedId(duplicatedObj.id);
  };

  // Add keyframe placeholder
  const handleAddKeyframe = (id) => {
    alert(`Add keyframe for object ${id}`);
  };

  // Update text
  const handleTextChange = (id, content) => {
    setObjects(objects.map((o) => (o.id === id ? { ...o, content } : o)));
  };

  // Preview canvas
  const handlePreview = async () => {
    if (!canvasRef.current) return;
    const canvas = await html2canvas(canvasRef.current, { useCORS: true });
    const dataUrl = canvas.toDataURL("image/png");
    const win = window.open();
    if (win) win.document.write(`<img src="${dataUrl}" />`);
  };

  // Download canvas
  const handleDownload = async () => {
    if (!canvasRef.current) return;
    const canvas = await html2canvas(canvasRef.current, { useCORS: true });
    const dataUrl = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "animix.png";
    a.click();
  };

  // Deselect object when clicking outside or right-clicking
  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      setSelectedId(null);
    }
  };

  const handleCanvasContextMenu = (e) => {
    e.preventDefault();
    setSelectedId(null);
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) return;

    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("video") ? "video" : "image";

    // Get position relative to canvas
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 100; // Center the dropped object
    const y = e.clientY - rect.top - 75;

    const newObj = {
      id: Date.now(),
      type,
      src: url,
      x: Math.max(0, x),
      y: Math.max(0, y),
      width: 200,
      height: 150,
      rotation: 0,
    };
    setObjects([...objects, newObj]);
    setHistory([...history, objects]);
    setSelectedId(newObj.id);
  };

  // Fit canvas to screen (full width minus padding)
  const [canvasHeight, setCanvasHeight] = useState(window.innerHeight - 120);
  useEffect(() => {
    const handleResize = () => setCanvasHeight(window.innerHeight - 120);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="flex flex-col bg-gray-100 min-h-screen overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white px-4 py-2 shadow-md">
        <div className="flex items-center space-x-2 text-purple-600 font-bold text-xl">
          <PiCowFill size={28} />
          <span>Animix</span>
        </div>

        <div className="flex items-center space-x-2">
          <button onClick={handleUndo} className="p-2 hover:bg-purple-100 rounded">
            <MdUndo size={20} />
          </button>
          <button onClick={handleAddText} className="p-2 hover:bg-purple-100 rounded">
            <MdTextFields size={20} />
          </button>

          <select
            value={font}
            onChange={(e) => {
              setFont(e.target.value);
              if (selectedId)
                setObjects(objects.map((o) => (o.id === selectedId ? { ...o, font: e.target.value } : o)));
            }}
            className="border px-2 py-1 rounded text-sm"
          >
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Roboto">Roboto</option>
            <option value="Comic Sans MS">Comic Sans MS</option>
          </select>

          <input
            type="color"
            value={textColor}
            onChange={(e) => {
              setTextColor(e.target.value);
              if (selectedId)
                setObjects(objects.map((o) => (o.id === selectedId ? { ...o, color: e.target.value } : o)));
            }}
            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
            title="Text Color"
          />

          <button
            onClick={() => {
              setBold(!bold);
              if (selectedId)
                setObjects(objects.map((o) => (o.id === selectedId ? { ...o, bold: !bold } : o)));
            }}
            className={`p-2 rounded hover:bg-purple-100 ${bold ? "bg-purple-100" : ""}`}
          >
            <BsTypeBold size={18} />
          </button>

          <label className="p-2 hover:bg-purple-100 rounded border cursor-pointer text-sm">
            Add Media
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
          </label>

          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
            title="Background Color"
          />

          <button onClick={handlePreview} className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
            Preview
          </button>
          <button onClick={handleDownload} className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm">
            Download
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative m-4 transition-colors duration-200 border-2 border-purple-500 rounded-lg"
        style={{
          backgroundColor: bgColor,
          height: canvasHeight,
          width: "calc(100% - 32px)",
        }}
        onClick={handleCanvasClick}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onContextMenu={handleCanvasContextMenu}
      >
        {objects.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
            <div className="text-center">
              <p className="text-xl mb-2">Drag and drop images or videos here</p>
              <p className="text-sm">or use "Add Media" button above</p>
            </div>
          </div>
        )}
        {objects.map((obj) => {
          const isSelected = selectedId === obj.id;
          return (
            <Rnd
              key={obj.id}
              size={{ width: obj.width, height: obj.height }}
              position={{ x: obj.x, y: obj.y }}
              bounds="parent"
              onDragStart={(e, d) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrag={(e, d) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDragStop={(e, d) => {
                e.preventDefault();
                e.stopPropagation();
                setObjects(objects.map((o) => (o.id === obj.id ? { ...o, x: d.x, y: d.y } : o)));
              }}
              onResizeStart={(e, direction, ref) => {
                e.stopPropagation();
              }}
              onResize={(e, direction, ref, delta, position) => {
                e.stopPropagation();
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                e.stopPropagation();
                setObjects(
                  objects.map((o) =>
                    o.id === obj.id
                      ? { ...o, width: ref.offsetWidth, height: ref.offsetHeight, ...position }
                      : o
                  )
                );
              }}
              style={{
                transform: `rotate(${obj.rotation || 0}deg)`,
                zIndex: isSelected ? 10 : 1,
                border: isSelected ? "2px solid #8b5cf6" : "2px solid transparent",
                boxShadow: isSelected ? "0 0 0 1px rgba(139, 92, 246, 0.3)" : "none",
                background: "transparent",
              }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedId(obj.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedId(null);
              }}
              enableResizing={isSelected}
              resizeHandleStyles={{
                topRight: {
                  width: 12,
                  height: 12,
                  background: "#8b5cf6",
                  borderRadius: "50%",
                  border: "2px solid white",
                },
                bottomRight: {
                  width: 12,
                  height: 12,
                  background: "#8b5cf6",
                  borderRadius: "50%",
                  border: "2px solid white",
                },
                bottomLeft: {
                  width: 12,
                  height: 12,
                  background: "#8b5cf6",
                  borderRadius: "50%",
                  border: "2px solid white",
                },
                topLeft: {
                  width: 12,
                  height: 12,
                  background: "#8b5cf6",
                  borderRadius: "50%",
                  border: "2px solid white",
                },
              }}
            >
              <div className="relative w-full h-full">
                {isSelected && (
                  <div className="absolute -top-8 left-0 flex space-x-1 z-20">
                    <button
                      onClick={() => handleDelete(obj.id)}
                      className="bg-red-500 hover:bg-red-600 p-1.5 rounded text-white shadow-lg transition-colors"
                      title="Delete"
                    >
                      <MdClose size={14} />
                    </button>
                    <button
                      onClick={() => handleDuplicate(obj.id)}
                      className="bg-green-500 hover:bg-green-600 p-1.5 rounded text-white shadow-lg transition-colors"
                      title="Duplicate"
                    >
                      <MdContentCopy size={14} />
                    </button>
                    <button
                      onClick={() => handleRotate(obj.id, -15)}
                      className="bg-orange-500 hover:bg-orange-600 p-1.5 rounded text-white shadow-lg transition-colors"
                      title="Rotate Left"
                    >
                      <MdRotateLeft size={14} />
                    </button>
                    <button
                      onClick={() => handleRotate(obj.id, 15)}
                      className="bg-yellow-500 hover:bg-yellow-600 p-1.5 rounded text-white shadow-lg transition-colors"
                      title="Rotate Right"
                    >
                      <MdRotateRight size={14} />
                    </button>
                    <button
                      onClick={() => handleAddKeyframe(obj.id)}
                      className="bg-blue-500 hover:bg-blue-600 p-1.5 rounded text-white shadow-lg transition-colors"
                      title="Add Keyframe"
                    >
                      <MdAdd size={14} />
                    </button>
                  </div>
                )}

                {obj.type === "text" ? (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="w-full h-full flex items-center justify-center text-center p-1 outline-none"
                    style={{
                      color: obj.color,
                      fontFamily: obj.font,
                      fontWeight: obj.bold ? "bold" : "normal",
                      fontSize: "18px",
                      userSelect: "text",
                    }}
                    onInput={(e) => handleTextChange(obj.id, e.currentTarget.textContent)}
                    onFocus={(e) => {
                      e.stopPropagation();
                      setSelectedId(obj.id);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(obj.id);
                    }}
                  >
                    {obj.content}
                  </div>
                ) : obj.type === "image" ? (
                  <img src={obj.src} alt="" className="w-full h-full object-contain" />
                ) : (
                  <video src={obj.src} className="w-full h-full object-contain" autoPlay loop muted />
                )}
              </div>
            </Rnd>
          );
        })}
      </div>

      {/* Play Controls */}
      <div className="flex justify-center items-center p-4 bg-white shadow-md space-x-4">
        <button className="px-6 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center space-x-2">
          <MdPlayArrow size={22} />
          <span>Play</span>
        </button>
      </div>
    </div>
  );
};

export default Main;
