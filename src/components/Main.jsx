import React, { useState, useRef, useEffect } from "react";
import { PiCowFill } from "react-icons/pi";
import { MdUndo, MdTextFields, MdDownload, MdPlayArrow, MdClose, MdAdd, MdRemove, MdRotateLeft, MdRotateRight, MdContentCopy, MdOpenWith, MdImage } from "react-icons/md";
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
  const [selectedIds, setSelectedIds] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [animationKeyframes, setAnimationKeyframes] = useState({});
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState('youtube'); // youtube, short, instagram
  const [backgroundMedia, setBackgroundMedia] = useState(null); // { type: 'image'/'video', src: string, dimensions: {width, height} }
  const previewPlaybackRef = useRef(null);
  const canvasRef = useRef(null);
  const recordingRef = useRef(null);
  const playbackRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Multi-selection functions
  const handleMultiSelect = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const clearSelection = () => {
    setSelectedId(null);
    setSelectedIds([]);
  };

  const isObjectSelected = (id) => {
    return selectedId === id || selectedIds.includes(id);
  };

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

  // Upload background media
  const handleBackgroundUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("video") ? "video" : "image";
    
    // Get media dimensions for proper aspect ratio fitting
    if (type === "image") {
      const img = new Image();
      img.onload = () => {
        setBackgroundMedia({
          type: "image",
          src: url,
          dimensions: { width: img.naturalWidth, height: img.naturalHeight }
        });
      };
      img.src = url;
    } else {
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        setBackgroundMedia({
          type: "video",
          src: url,
          dimensions: { width: video.videoWidth, height: video.videoHeight }
        });
      };
      video.src = url;
    }
  };

  // Clear background media
  const handleClearBackground = () => {
    setBackgroundMedia(null);
  };

  // Delete object
  const handleDelete = (id) => {
    setObjects(objects.filter((o) => o.id !== id));
    if (id === selectedId) setSelectedId(null);
  };

  // Helper function to interpolate rotation angles properly for continuous rotation
  const interpolateRotation = (startAngle, endAngle, progress) => {
    // For continuous rotation, use simple linear interpolation
    // This preserves the exact rotation values that were recorded
    return startAngle + (endAngle - startAngle) * progress;
  };

  // Handle text size changes
  const handleTextSizeChange = (id, delta) => {
    const currentObj = objects.find(o => o.id === id);
    if (!currentObj || currentObj.type !== "text") return;
    
    const currentFontSize = currentObj.fontSize || 18;
    const newFontSize = Math.max(8, Math.min(72, currentFontSize + delta)); // Min 8px, Max 72px
    
    const updatedObj = { ...currentObj, fontSize: newFontSize };
    
    // Capture keyframe during recording
    if (isRecording) {
      captureKeyframe(id, updatedObj);
    }
    
    setObjects(objects.map((o) => (o.id === id ? updatedObj : o)));
  };

  // Rotate object
  const handleRotate = (id, delta) => {
    const currentObj = objects.find(o => o.id === id);
    const updatedObj = { ...currentObj, rotation: (currentObj.rotation || 0) + delta };
    
    // Capture keyframe during recording
    if (isRecording) {
      captureKeyframe(id, updatedObj);
    }
    
    setObjects(objects.map((o) => (o.id === id ? updatedObj : o)));
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

  // Start/Stop Recording
  const handleStartRecording = () => {
    if (isRecording) {
      // Stop recording
      setIsRecording(false);
      if (recordingRef.current) {
        clearInterval(recordingRef.current);
      }
      return;
    }

    // Start recording - reset time for each new recording session
    setIsRecording(true);
    setRecordingTime(0); // Reset to 0 for each recording session
    // Don't clear animationKeyframes - keep existing animations
    
    recordingRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 0.1);
    }, 100);
  };

  // Capture keyframe during recording
  const captureKeyframe = (id, obj) => {
    if (!isRecording) return;
    
    const newKeyframe = {
      objectId: id,
      time: recordingTime,
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
      rotation: obj.rotation || 0,
      fontSize: obj.fontSize || (obj.type === "text" ? 18 : undefined),
    };
    
    setAnimationKeyframes(prev => ({
      ...prev,
      [id]: [...(prev[id] || []), newKeyframe]
    }));
  };

  // Add keyframe manually
  const handleAddKeyframe = (id) => {
    const obj = objects.find(o => o.id === id);
    if (!obj) return;
    
    const newKeyframe = {
      objectId: id,
      time: recordingTime,
      x: obj.x,
      y: obj.y,
      width: obj.width,
      height: obj.height,
      rotation: obj.rotation || 0,
    };
    
    setAnimationKeyframes(prev => ({
      ...prev,
      [id]: [...(prev[id] || []), newKeyframe]
    }));
  };

  // Clear all animations
  const handleClearAnimations = () => {
    setAnimationKeyframes({});
    setRecordingTime(0);
    clearSelection();
  };

  // Play animation
  const handlePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      clearSelection();
      if (playbackRef.current) {
        cancelAnimationFrame(playbackRef.current);
      }
      return;
    }

    // Reset objects to first keyframe positions
    setObjects(prevObjects => 
      prevObjects.map(obj => {
        const objKeyframes = animationKeyframes[obj.id] || [];
        if (objKeyframes.length > 0) {
          const firstKeyframe = objKeyframes[0];
          return {
            ...obj,
            x: firstKeyframe.x,
            y: firstKeyframe.y,
            width: firstKeyframe.width,
            height: firstKeyframe.height,
            rotation: firstKeyframe.rotation,
          };
        }
        return obj;
      })
    );

    clearSelection();
    setIsPlaying(true);
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      
      // Update object positions based on keyframes
      setObjects(prevObjects => 
        prevObjects.map(obj => {
          const objKeyframes = animationKeyframes[obj.id] || [];
          if (objKeyframes.length === 0) return obj;
          
          // Find surrounding keyframes
          let prevKeyframe = objKeyframes[0];
          let nextKeyframe = objKeyframes[objKeyframes.length - 1];
          
          for (let i = 0; i < objKeyframes.length - 1; i++) {
            if (elapsed >= objKeyframes[i].time && elapsed <= objKeyframes[i + 1].time) {
              prevKeyframe = objKeyframes[i];
              nextKeyframe = objKeyframes[i + 1];
              break;
            }
          }
          
          if (prevKeyframe && nextKeyframe && prevKeyframe.time !== nextKeyframe.time) {
            const progress = Math.min(1, Math.max(0, (elapsed - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time)));
            // Smooth easing function
            const easedProgress = progress < 0.5 
              ? 2 * progress * progress 
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            const interpolatedRotation = interpolateRotation(prevKeyframe.rotation, nextKeyframe.rotation, easedProgress);
            
            // Handle fontSize interpolation for text objects
            const interpolatedFontSize = obj.type === "text" && prevKeyframe.fontSize !== undefined && nextKeyframe.fontSize !== undefined
              ? prevKeyframe.fontSize + (nextKeyframe.fontSize - prevKeyframe.fontSize) * easedProgress
              : obj.fontSize;
            
            return {
              ...obj,
              x: prevKeyframe.x + (nextKeyframe.x - prevKeyframe.x) * easedProgress,
              y: prevKeyframe.y + (nextKeyframe.y - prevKeyframe.y) * easedProgress,
              rotation: interpolatedRotation,
              width: prevKeyframe.width + (nextKeyframe.width - prevKeyframe.width) * easedProgress,
              height: prevKeyframe.height + (nextKeyframe.height - prevKeyframe.height) * easedProgress,
              fontSize: interpolatedFontSize,
            };
          }
          
          return obj;
        })
      );
      
      // Get max time from all keyframes
      const maxTime = Math.max(...Object.values(animationKeyframes).flat().map(kf => kf.time));
      
      if (elapsed <= maxTime + 0.5) { // Add small buffer at the end
        playbackRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
        clearSelection();
      }
    };
    
    animate();
  };

// Update text
  const handleTextChange = (id, content) => {
    setObjects(objects.map((o) => (o.id === id ? { ...o, content } : o)));
  };

  // Preview canvas
  const handlePreview = async () => {
    console.log('Preview button clicked');
    // Just show the preview modal with live objects
    setShowPreview(true);
    console.log('Preview modal should be shown with live animation');
  };

  // Preview animation playback
  const handlePreviewPlay = () => {
    if (isPreviewPlaying) {
      setIsPreviewPlaying(false);
      if (previewPlaybackRef.current) {
        cancelAnimationFrame(previewPlaybackRef.current);
      }
      return;
    }

    // Check if we have keyframes
    const hasKeyframes = Object.keys(animationKeyframes).some(id => 
      animationKeyframes[id] && animationKeyframes[id].length > 0
    );
    
    if (!hasKeyframes) {
      // No animations to play - just show static preview for 3 seconds
      setIsPreviewPlaying(true);
      setTimeout(() => setIsPreviewPlaying(false), 3000);
      return;
    }

    setIsPreviewPlaying(true);
    const startTime = Date.now();
    
    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      
      // Update object positions based on keyframes
      setObjects(prevObjects => 
        prevObjects.map(obj => {
          const objKeyframes = animationKeyframes[obj.id] || [];
          if (objKeyframes.length === 0) return obj;
          
          // Find surrounding keyframes
          let prevKeyframe = objKeyframes[0];
          let nextKeyframe = objKeyframes[objKeyframes.length - 1];
          
          for (let i = 0; i < objKeyframes.length - 1; i++) {
            if (elapsed >= objKeyframes[i].time && elapsed <= objKeyframes[i + 1].time) {
              prevKeyframe = objKeyframes[i];
              nextKeyframe = objKeyframes[i + 1];
              break;
            }
          }
          
          if (prevKeyframe && nextKeyframe && prevKeyframe.time !== nextKeyframe.time) {
            const progress = Math.min(1, Math.max(0, (elapsed - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time)));
            // Smooth easing function
            const easedProgress = progress < 0.5 
              ? 2 * progress * progress 
              : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            return {
              ...obj,
              x: prevKeyframe.x + (nextKeyframe.x - prevKeyframe.x) * easedProgress,
              y: prevKeyframe.y + (nextKeyframe.y - prevKeyframe.y) * easedProgress,
              rotation: interpolateRotation(prevKeyframe.rotation, nextKeyframe.rotation, easedProgress),
              width: prevKeyframe.width + (nextKeyframe.width - prevKeyframe.width) * easedProgress,
              height: prevKeyframe.height + (nextKeyframe.height - prevKeyframe.height) * easedProgress,
              fontSize: obj.type === "text" && prevKeyframe.fontSize !== undefined && nextKeyframe.fontSize !== undefined
                ? prevKeyframe.fontSize + (nextKeyframe.fontSize - prevKeyframe.fontSize) * easedProgress
                : obj.fontSize,
            };
          }
          
          return obj;
        })
      );
      
      // Get max time from all keyframes
      const maxTime = Math.max(...Object.values(animationKeyframes).flat().map(kf => kf.time));
      
      if (elapsed <= maxTime + 0.5) { // Add small buffer at the end
        previewPlaybackRef.current = requestAnimationFrame(animate);
      } else {
        setIsPreviewPlaying(false);
      }
    };
    
    animate();
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

  // Download animation as MP4
  const handleDownloadVideo = async () => {
    if (!canvasRef.current) return;
    
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      // Create a temporary canvas element for cleaner capture
      const tempCanvas = document.createElement('canvas');
      const ctx = tempCanvas.getContext('2d');
      const canvasRect = canvasRef.current.getBoundingClientRect();
      
      tempCanvas.width = canvasRect.width;
      tempCanvas.height = canvasRect.height;
      
      // Preload all images and videos
      const preloadMedia = async () => {
        const mediaPromises = [];
        
        // Preload background media if exists
        let backgroundMediaElement = null;
        if (backgroundMedia) {
          if (backgroundMedia.type === 'image') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const promise = new Promise((resolve) => {
              img.onload = () => {
                backgroundMediaElement = { type: 'image', element: img };
                resolve();
              };
              img.onerror = resolve; // Continue even if image fails to load
            });
            img.src = backgroundMedia.src;
            mediaPromises.push(promise);
          } else if (backgroundMedia.type === 'video') {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.muted = true;
            video.loop = true;
            const promise = new Promise((resolve) => {
              video.onloadeddata = () => {
                backgroundMediaElement = { type: 'video', element: video };
                video.play(); // Start playing the video
                resolve();
              };
              video.onerror = resolve; // Continue even if video fails to load
            });
            video.src = backgroundMedia.src;
            mediaPromises.push(promise);
          }
        }
        
        // Preload object images
        const objectImages = {};
        objects.forEach(obj => {
          if (obj.type === 'image') {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            const promise = new Promise((resolve) => {
              img.onload = () => {
                objectImages[obj.id] = img;
                resolve();
              };
              img.onerror = resolve; // Continue even if image fails to load
            });
            img.src = obj.src;
            mediaPromises.push(promise);
          }
        });
        
        await Promise.all(mediaPromises);
        return { backgroundMediaElement, objectImages };
      };
      
      const { backgroundMediaElement, objectImages } = await preloadMedia();
      
      const stream = tempCanvas.captureStream(30); // 30 FPS
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
        videoBitsPerSecond: 5000000 // 5 Mbps for high quality
      });
      
      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'animix-animation.webm';
        a.click();
        URL.revokeObjectURL(url);
        setIsDownloading(false);
        setDownloadProgress(0);
      };
      
      // Start recording
      mediaRecorder.start();
      
      // Play the animation while recording
      const maxTime = Math.max(...Object.values(animationKeyframes).flat().map(kf => kf.time), 3); // At least 3 seconds
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const progress = Math.min(elapsed / maxTime, 1);
        setDownloadProgress(Math.round(progress * 100));
        
        // Clear and redraw canvas
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        
        // Draw background media if exists
        if (backgroundMediaElement) {
          if (backgroundMediaElement.type === 'image') {
            ctx.drawImage(backgroundMediaElement.element, 0, 0, tempCanvas.width, tempCanvas.height);
          } else if (backgroundMediaElement.type === 'video') {
            ctx.drawImage(backgroundMediaElement.element, 0, 0, tempCanvas.width, tempCanvas.height);
          }
        }
        
        // Update and draw objects
        const updatedObjects = objects.map(obj => {
          const objKeyframes = animationKeyframes[obj.id] || [];
          let updatedObj = { ...obj };
          
          if (objKeyframes.length > 0) {
            // Find surrounding keyframes
            let prevKeyframe = objKeyframes[0];
            let nextKeyframe = objKeyframes[objKeyframes.length - 1];
            
            for (let i = 0; i < objKeyframes.length - 1; i++) {
              if (elapsed >= objKeyframes[i].time && elapsed <= objKeyframes[i + 1].time) {
                prevKeyframe = objKeyframes[i];
                nextKeyframe = objKeyframes[i + 1];
                break;
              }
            }
            
            if (prevKeyframe && nextKeyframe && prevKeyframe.time !== nextKeyframe.time) {
              const progress = Math.min(1, Math.max(0, (elapsed - prevKeyframe.time) / (nextKeyframe.time - prevKeyframe.time)));
              // Smooth easing function
              const easedProgress = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
              
              const interpolatedRotation = interpolateRotation(prevKeyframe.rotation, nextKeyframe.rotation, easedProgress);
              
              // Handle fontSize interpolation for text objects
              const interpolatedFontSize = obj.type === "text" && prevKeyframe.fontSize !== undefined && nextKeyframe.fontSize !== undefined
                ? prevKeyframe.fontSize + (nextKeyframe.fontSize - prevKeyframe.fontSize) * easedProgress
                : obj.fontSize;
              
              updatedObj = {
                ...obj,
                x: prevKeyframe.x + (nextKeyframe.x - prevKeyframe.x) * easedProgress,
                y: prevKeyframe.y + (nextKeyframe.y - prevKeyframe.y) * easedProgress,
                rotation: interpolatedRotation,
                width: prevKeyframe.width + (nextKeyframe.width - prevKeyframe.width) * easedProgress,
                height: prevKeyframe.height + (nextKeyframe.height - prevKeyframe.height) * easedProgress,
                fontSize: interpolatedFontSize,
              };
            }
          }
          
          // Draw object on canvas
          ctx.save();
          ctx.translate(updatedObj.x + updatedObj.width / 2, updatedObj.y + updatedObj.height / 2);
          ctx.rotate((updatedObj.rotation || 0) * Math.PI / 180);
          
          if (updatedObj.type === "text") {
            ctx.font = `${updatedObj.bold ? 'bold' : 'normal'} ${updatedObj.fontSize || 18}px ${updatedObj.font || 'Arial'}`;
            ctx.fillStyle = updatedObj.color || '#000000';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(updatedObj.content || '', 0, 0);
          } else if (updatedObj.type === "image" && objectImages[obj.id]) {
            ctx.drawImage(objectImages[obj.id], -updatedObj.width / 2, -updatedObj.height / 2, updatedObj.width, updatedObj.height);
          } else if (updatedObj.type === "video") {
            // For videos, we'll just draw a placeholder rectangle
            ctx.fillStyle = '#333333';
            ctx.fillRect(-updatedObj.width / 2, -updatedObj.height / 2, updatedObj.width, updatedObj.height);
            ctx.fillStyle = '#ffffff';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Video', 0, 0);
          }
          
          ctx.restore();
          return updatedObj;
        });
        
        if (elapsed <= maxTime + 0.5) {
          requestAnimationFrame(animate);
        } else {
          mediaRecorder.stop();
          // Reset objects to their original positions
          setObjects(prevObjects => 
            prevObjects.map(obj => {
              const objKeyframes = animationKeyframes[obj.id] || [];
              if (objKeyframes.length > 0) {
                const firstKeyframe = objKeyframes[0];
                return {
                  ...obj,
                  x: firstKeyframe.x,
                  y: firstKeyframe.y,
                  width: firstKeyframe.width,
                  height: firstKeyframe.height,
                  rotation: firstKeyframe.rotation,
                };
              }
              return obj;
            })
          );
        }
      };
      
      animate();
      
    } catch (error) {
      console.error('Error recording video:', error);
      alert('Failed to record video. Please try again.');
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Deselect object when clicking outside or right-clicking
  const handleCanvasClick = (e) => {
    if (e.target === canvasRef.current) {
      if (!isMultiSelectMode) {
        clearSelection();
      }
    }
  };

  const handleCanvasContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isPlaying) clearSelection();
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
  
  // Calculate canvas dimensions based on aspect ratio
  const getCanvasDimensions = () => {
    const maxWidth = window.innerWidth - 32; // Subtract padding
    const maxHeight = window.innerHeight - 120; // Subtract toolbar and controls
    
    switch (aspectRatio) {
      case 'youtube':
        // 16:9 aspect ratio
        const youtubeWidth = Math.min(maxWidth, maxHeight * 16 / 9);
        return { width: youtubeWidth, height: youtubeWidth * 9 / 16 };
      case 'short':
        // 9:16 aspect ratio (vertical)
        const shortHeight = Math.min(maxHeight, maxWidth * 16 / 9);
        return { width: shortHeight * 9 / 16, height: shortHeight };
      case 'instagram':
        // 1:1 aspect ratio (square)
        const instagramSize = Math.min(maxWidth, maxHeight);
        return { width: instagramSize, height: instagramSize };
      default:
        return { width: maxWidth, height: maxHeight };
    }
  };
  
  useEffect(() => {
    const handleResize = () => setCanvasHeight(window.innerHeight - 120);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
    
    <div className="flex flex-col bg-gray-100 min-h-screen overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white px-4 py-2 shadow-md">
        <div className="flex items-center space-x-2 text-purple-600 font-bold text-lg sm:text-xl">
          <PiCowFill size={24} className="sm:size-28" />
          <span className="hidden sm:inline">Animix</span>
        </div>

        <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
          <button onClick={handleUndo} className="p-1.5 border-2 border-purple-400 hover:border-purple-600 rounded transition-all duration-200 hover:bg-purple-50 cursor-pointer group">
            <MdUndo size={16} className="text-purple-600 group-hover:text-purple-700" />
          </button>
          <button onClick={handleAddText} className="p-1.5 border-2 border-purple-400 hover:border-purple-600 rounded transition-all duration-200 hover:bg-purple-50 cursor-pointer group">
            <MdTextFields size={16} className="text-purple-600 group-hover:text-purple-700" />
          </button>

          <select
            value={font}
            onChange={(e) => {
              setFont(e.target.value);
              if (selectedId)
                setObjects(objects.map((o) => (o.id === selectedId ? { ...o, font: e.target.value } : o)));
            }}
            className="border-2 border-purple-400 hover:border-purple-600 px-2 py-1 rounded text-sm cursor-pointer transition-all duration-200 hover:bg-purple-50 focus:outline-none focus:border-purple-600"
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
            className="w-7 h-7 rounded border-2 border-purple-400 hover:border-purple-600 cursor-pointer transition-all duration-200 hover:scale-110"
            title="Text Color"
          />

          <button
            onClick={() => {
              setBold(!bold);
              if (selectedId)
                setObjects(objects.map((o) => (o.id === selectedId ? { ...o, bold: !bold } : o)));
            }}
            className={`p-1.5 border-2 border-purple-400 hover:border-purple-600 rounded transition-all duration-200 hover:bg-purple-50 cursor-pointer group ${bold ? "bg-purple-100 border-purple-600" : ""}`}
          >
            <BsTypeBold size={16} className={`text-purple-600 group-hover:text-purple-700 ${bold ? "text-purple-700" : ""}`} />
          </button>

          <label className="p-1.5 border-2 border-purple-400 hover:border-purple-600 rounded cursor-pointer text-sm transition-all duration-200 hover:bg-purple-50 flex items-center space-x-1 group">
            <MdAdd size={16} className="text-purple-600 group-hover:text-purple-700" />
            <span className="text-purple-600 group-hover:text-purple-700">Add Media</span>
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />
          </label>

          <label className="p-1.5 border-2 border-purple-400 hover:border-purple-600 rounded cursor-pointer text-sm flex items-center space-x-1 transition-all duration-200 hover:bg-purple-50 group">
            <MdImage size={16} className="text-purple-600 group-hover:text-purple-700" />
            <span className="text-purple-600 group-hover:text-purple-700">Background</span>
            <input type="file" accept="image/*,video/*" className="hidden" onChange={handleBackgroundUpload} />
          </label>

          {backgroundMedia && (
            <button 
              onClick={handleClearBackground}
              className="p-1.5 border-2 border-red-400 hover:border-red-600 rounded cursor-pointer text-sm flex items-center space-x-1 text-red-600 transition-all duration-200 hover:bg-red-50"
              title="Clear Background"
            >
              <MdClose size={16} />
              <span>Clear BG</span>
            </button>
          )}

          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="w-7 h-7 rounded border-2 border-purple-400 hover:border-purple-600 cursor-pointer transition-all duration-200 hover:scale-110"
            title="Background Color"
          />

          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="border-2 border-purple-400 hover:border-purple-600 px-2 py-1 rounded text-sm cursor-pointer transition-all duration-200 hover:bg-purple-50 focus:outline-none focus:border-purple-600"
            title="Aspect Ratio"
          >
            <option value="youtube">YouTube (16:9)</option>
            <option value="short">Short Video (9:16)</option>
            <option value="instagram">Instagram (1:1)</option>
          </select>

          <button onClick={handlePreview} className="px-3 py-1 border-2 border-purple-400 hover:border-purple-600 bg-purple-600 hover:bg-purple-700 text-white rounded transition-all duration-200 hover:scale-105 cursor-pointer text-sm font-medium">
            Preview
          </button>
          <button 
            onClick={() => {
              setIsMultiSelectMode(!isMultiSelectMode);
              clearSelection();
            }}
            className={`px-3 py-1 border-2 rounded text-sm cursor-pointer transition-all duration-200 hover:scale-105 font-medium ${
              isMultiSelectMode 
                ? 'border-blue-600 bg-blue-600 hover:bg-blue-700 text-white' 
                : 'border-purple-400 hover:border-purple-600 bg-purple-100 hover:bg-purple-200 text-purple-700'
            }`}
          >
            {isMultiSelectMode ? 'Multi-Select ON' : 'Multi-Select OFF'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex justify-center items-center flex-1 p-2 sm:p-4">
        <div
          ref={canvasRef}
          className="relative transition-colors duration-200 border-2 sm:border-4 border-purple-500 rounded-lg"
          style={{
            backgroundColor: bgColor,
            ...getCanvasDimensions(),
            minHeight: '200px',
            position: 'relative'
          }}
          onClick={handleCanvasClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onContextMenu={handleCanvasContextMenu}
        >
        {/* Background Media */}
        {backgroundMedia && (
          <div className="absolute inset-0 overflow-hidden">
            {backgroundMedia.type === "image" ? (
              <img 
                src={backgroundMedia.src} 
                alt="Background" 
                className="absolute inset-0 w-full h-full object-cover"
                style={{
                  objectFit: 'cover',
                  width: '100%',
                  height: '100%'
                }}
              />
            ) : (
              <video 
                src={backgroundMedia.src} 
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay 
                loop 
                muted
                style={{
                  objectFit: 'cover',
                  width: '100%',
                  height: '100%'
                }}
              />
            )}
          </div>
        )}
        {objects.length === 0 && !backgroundMedia && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 pointer-events-none">
            <div className="text-center">
              <p className="text-xl mb-2">Drag and drop images or videos here</p>
              <p className="text-sm">or use the "Add Media" button above</p>
            </div>
          </div>
        )}
        {objects.map((obj) => {
          const isSelected = isObjectSelected(obj.id);
          const isMultiSelected = selectedIds.includes(obj.id);
          return (
            <Rnd
              key={obj.id}
              size={{ width: obj.width, height: obj.height }}
              position={{ x: obj.x, y: obj.y }}
              disableDragging={isPlaying}
              enableResizing={isSelected && !isPlaying}
              onDragStart={(e, d) => {
                if (isPlaying) return;
                // Don't start drag if clicking on text div (for text editing)
                if (e.target.getAttribute('contenteditable') === 'true' || e.target.closest('[contenteditable="true"]')) return;
                e.preventDefault();
                e.stopPropagation();
                if (isMultiSelectMode) {
                  handleMultiSelect(obj.id);
                } else {
                  clearSelection();
                  setSelectedId(obj.id);
                }
              }}
              onDrag={(e, d) => {
                if (isPlaying) return;
                e.preventDefault();
                e.stopPropagation();
                
                // Calculate relative movement
                const deltaX = d.x - obj.x;
                const deltaY = d.y - obj.y;
                
                // Update all selected objects
                const updatedObjects = objects.map((o) => {
                  if (isObjectSelected(o.id)) {
                    const updatedObj = { ...o, x: o.x + deltaX, y: o.y + deltaY };
                    captureKeyframe(o.id, updatedObj);
                    return updatedObj;
                  }
                  return o;
                });
                setObjects(updatedObjects);
              }}
              onDragStop={(e, d) => {
                if (isPlaying) return;
                e.preventDefault();
                e.stopPropagation();
                
                // Final position update for all selected objects
                const deltaX = d.x - obj.x;
                const deltaY = d.y - obj.y;
                
                const updatedObjects = objects.map((o) => {
                  if (isObjectSelected(o.id)) {
                    const updatedObj = { ...o, x: o.x + deltaX, y: o.y + deltaY };
                    captureKeyframe(o.id, updatedObj);
                    return updatedObj;
                  }
                  return o;
                });
                setObjects(updatedObjects);
              }}
              onResizeStart={(e, direction, ref) => {
                if (isPlaying) return;
                // Don't start resize if clicking on text div (for text editing)
                if (e.target.getAttribute('contenteditable') === 'true' || e.target.closest('[contenteditable="true"]')) return;
                e.stopPropagation();
                setSelectedId(obj.id);
              }}
              onResize={(e, direction, ref, delta, position) => {
                if (isPlaying) return;
                e.stopPropagation();
                const updatedObj = {
                  ...objects.find(o => o.id === obj.id),
                  width: ref.offsetWidth,
                  height: ref.offsetHeight,
                  ...position
                };
                setObjects(
                  objects.map((o) =>
                    o.id === obj.id ? updatedObj : o
                  )
                );
                captureKeyframe(obj.id, updatedObj);
              }}
              onResizeStop={(e, direction, ref, delta, position) => {
                if (isPlaying) return;
                e.stopPropagation();
                const updatedObj = {
                  ...objects.find(o => o.id === obj.id),
                  width: ref.offsetWidth,
                  height: ref.offsetHeight,
                  ...position
                };
                setObjects(
                  objects.map((o) =>
                    o.id === obj.id ? updatedObj : o
                  )
                );
                captureKeyframe(obj.id, updatedObj);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isPlaying) clearSelection();
              }}
              resizeHandleStyles={{
                topRight: {
                  width: 12,
                  height: 12,
                  background: "#8b5cf6",
                  borderRadius: "50%",
                  border: "2px solid #8b5cf6",
                  zIndex: 10
                },
                bottomRight: {
                  width: 12,
                  height: 12,
                  background: "#8b5cf6",
                  borderRadius: "50%",
                  border: "2px solid #8b5cf6",
                  zIndex: 10
                },
                bottomLeft: {
                  width: 12,
                  height: 12,
                  background: "#8b5cf6",
                  borderRadius: "50%",
                  border: "2px solid #8b5cf6",
                  zIndex: 10
                },
                topLeft: {
                  width: 12,
                  height: 12,
                  background: "#8b5cf6",
                  borderRadius: "50%",
                  border: "2px solid #8b5cf6",
                  zIndex: 10
                },
              }}
            >
              <div 
                className="relative w-full h-full"
                style={{
                  transform: `rotate(${obj.rotation || 0}deg)`,
                  transformOrigin: 'center',
                  transition: 'transform 0.3s ease-out',
                  cursor: obj.type === "text" ? 'default' : 'auto'
                }}
              >
                {/* Object content */}
                {obj.type === "text" ? (
                  <div
                    contentEditable
                    suppressContentEditableWarning={true}
                    onInput={(e) => {
                      e.stopPropagation();
                      handleTextChange(obj.id, e.currentTarget.textContent || '');
                    }}
                    onFocus={(e) => {
                      e.stopPropagation();
                      setSelectedId(obj.id);
                    }}
                    className="w-full h-full p-2 outline-none cursor-text resize-none bg-transparent border-none flex items-center justify-center"
                    style={{
                      color: obj.color,
                      fontFamily: obj.font,
                      fontWeight: obj.bold ? "bold" : "normal",
                      fontSize: `${obj.fontSize || 18}px`,
                      userSelect: "text",
                      pointerEvents: isSelected ? "none" : "auto",
                      whiteSpace: "nowrap",
                      overflow: "visible",
                      textOverflow: "clip",
                      zIndex: 1
                    }}
                    data-text-id={obj.id}
                  >
                    {obj.content}
                  </div>
                ) : obj.type === "image" ? (
                  <img src={obj.src} alt="" className="w-full h-full object-contain" />
                ) : (
                  <video src={obj.src} className="w-full h-full object-contain" autoPlay loop muted />
                )}
              </div>
              
              {/* Control buttons - positioned outside the rotating container */}
              {isSelected && (
                <div className="absolute -top-8 left-0 flex space-x-1 z-20">
                  <button
                    onClick={() => handleDelete(obj.id)}
                    className="border-2 border-red-400 hover:border-red-600 bg-red-500 hover:bg-red-600 p-1.5 rounded text-white shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer"
                    title="Delete"
                  >
                    <MdClose size={14} />
                  </button>
                  <button
                    onClick={() => handleDuplicate(obj.id)}
                    className="border-2 border-green-400 hover:border-green-600 bg-green-500 hover:bg-green-600 p-1.5 rounded text-white shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer"
                    title="Duplicate"
                  >
                    <MdContentCopy size={14} />
                  </button>
                  {obj.type === "text" && (
                    <button
                      onClick={() => handleTextSizeChange(obj.id, -2)}
                      className="border-2 border-gray-400 hover:border-gray-600 bg-gray-500 hover:bg-gray-600 p-1.5 rounded text-white shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer"
                      title="Decrease Text Size"
                    >
                      <MdRemove size={14} />
                    </button>
                  )}
                  {obj.type === "text" && (
                    <button
                      onClick={() => handleTextSizeChange(obj.id, 2)}
                      className="border-2 border-gray-400 hover:border-gray-600 bg-gray-500 hover:bg-gray-600 p-1.5 rounded text-white shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer"
                      title="Increase Text Size"
                    >
                      <MdAdd size={14} />
                    </button>
                  )}
                  {obj.type === "text" && (
                    <button
                      onMouseDown={() => {
                        // Enable move mode by temporarily enabling pointer events on text div
                        const textDiv = document.querySelector(`div[data-text-id="${obj.id}"]`);
                        if (textDiv) {
                          textDiv.style.pointerEvents = 'auto';
                        }
                      }}
                      onMouseUp={() => {
                        // Restore normal pointer events after move
                        const textDiv = document.querySelector(`div[data-text-id="${obj.id}"]`);
                        if (textDiv) {
                          textDiv.style.pointerEvents = 'none';
                        }
                      }}
                      className="border-2 border-blue-400 hover:border-blue-600 bg-blue-500 hover:bg-blue-600 p-1.5 rounded text-white shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer"
                      title="Move Text"
                    >
                      <MdOpenWith size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => handleRotate(obj.id, -30)}
                    className="border-2 border-orange-400 hover:border-orange-600 bg-orange-500 hover:bg-orange-600 p-2 rounded text-white shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer"
                    title="Rotate Left 30°"
                  >
                    <MdRotateLeft size={16} />
                  </button>
                  <button
                    onClick={() => handleRotate(obj.id, 30)}
                    className="border-2 border-purple-400 hover:border-purple-600 bg-purple-500 hover:bg-purple-600 p-2 rounded text-white shadow-lg transition-all duration-200 hover:scale-110 cursor-pointer"
                    title="Rotate Right 30°"
                  >
                    <MdRotateRight size={16} />
                  </button>
                </div>
              )}
              
              {/* Multi-selection indicator - positioned outside the rotating container */}
              {isMultiSelected && (
                <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full border-2 border-white z-30"></div>
              )}
            </Rnd>
          );
        })}
        </div>
      </div>

      {/* Play Controls */}
      <div className="flex justify-center items-center p-4 bg-white shadow-md space-x-4">
        <div className="flex items-center space-x-2">
          <button onClick={handleStartRecording} className={`px-4 py-2 border-2 ${isRecording ? 'border-red-600 bg-red-600 hover:bg-red-700 hover:border-red-700' : 'border-green-600 bg-green-600 hover:bg-green-700 hover:border-green-700'} text-white rounded flex items-center space-x-2 transition-all duration-200 hover:scale-105 cursor-pointer font-medium text-sm`}>
            {isRecording ? (
              <>
                <MdClose size={18} />
                <span>Stop Recording ({recordingTime.toFixed(1)}s)</span>
              </>
            ) : (
              <>
                <MdAdd size={18} />
                <span>Start Animating</span>
              </>
            )}
          </button>
          <button
            onClick={handlePlay}
            disabled={isRecording}
            className={`px-4 py-2 border-2 ${isPlaying ? 'border-red-600 bg-red-600 hover:bg-red-700 hover:border-red-700' : 'border-purple-600 bg-purple-600 hover:bg-purple-700 hover:border-purple-700'} text-white rounded flex items-center space-x-2 transition-all duration-200 hover:scale-105 cursor-pointer font-medium text-sm ${isRecording ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isPlaying ? (
              <>
                <MdClose size={18} />
                <span>Stop</span>
              </>
            ) : (
              <>
                <MdPlayArrow size={18} />
                <span>Play</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>

    {/* Preview Modal */}
    {showPreview && (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[9999] p-2 sm:p-4">
        <div className="bg-white rounded-lg shadow-2xl p-4 sm:p-6 w-full max-w-4xl" style={{ 
          width: '90vw', 
          maxWidth: '1000px',
          height: 'auto',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto'
        }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">Animation Preview</h2>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-500 hover:text-purple-600 text-2xl leading-none hover:bg-purple-50 rounded-full w-6 h-6 flex items-center justify-center transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-purple-300"
            >
              ×
            </button>
          </div>
          <div className="border-2 border-gray-200 rounded bg-black flex-shrink-0 mx-auto" style={{ 
            position: 'relative', 
            overflow: 'hidden',
            ...getCanvasDimensions(),
            minHeight: '200px'
          }}>
            <div 
              className="absolute inset-0"
              style={{
                backgroundColor: bgColor,
                width: '100%',
                height: '100%',
                padding: '0',
                margin: '0'
              }}
            >
              {/* Background Media in Preview */}
              {backgroundMedia && (
                <div className="absolute inset-0 overflow-hidden">
                  {backgroundMedia.type === "image" ? (
                    <img 
                      src={backgroundMedia.src} 
                      alt="Background" 
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        objectFit: 'cover',
                        width: '100%',
                        height: '100%'
                      }}
                    />
                  ) : (
                    <video 
                      src={backgroundMedia.src} 
                      className="absolute inset-0 w-full h-full object-cover"
                      autoPlay 
                      loop 
                      muted
                      style={{
                        objectFit: 'cover',
                        width: '100%',
                        height: '100%'
                      }}
                    />
                  )}
                </div>
              )}
              {objects.length === 0 && !backgroundMedia ? (
                <div className="absolute inset-0 flex items-center justify-center text-white text-lg">
                  No objects to preview. Add some objects first!
                </div>
              ) : (
                objects.map((obj) => {
                  return obj.type === "text" ? (
                    <div
                      key={obj.id}
                      style={{
                        position: "absolute",
                        left: `${obj.x}px`,
                        top: `${obj.y}px`,
                        width: `${obj.width}px`,
                        height: `${obj.height}px`,
                        color: obj.color,
                        fontFamily: obj.font,
                        fontWeight: obj.bold ? "bold" : "normal",
                        fontSize: `${obj.fontSize || 18}px`,
                        transform: `rotate(${obj.rotation || 0}deg)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        whiteSpace: "nowrap",
                        overflow: "visible"
                      }}
                    >
                      {obj.content}
                    </div>
                  ) : obj.type === "image" ? (
                    <img 
                      key={obj.id}
                      src={obj.src} 
                      alt="" 
                      style={{
                        position: "absolute",
                        left: `${obj.x}px`,
                        top: `${obj.y}px`,
                        width: `${obj.width}px`,
                        height: `${obj.height}px`,
                        transform: `rotate(${obj.rotation || 0}deg)`,
                        objectFit: "contain"
                      }}
                    />
                  ) : (
                    <video 
                      key={obj.id}
                      src={obj.src} 
                      style={{
                        position: "absolute",
                        left: `${obj.x}px`,
                        top: `${obj.y}px`,
                        width: `${obj.width}px`,
                        height: `${obj.height}px`,
                        transform: `rotate(${obj.rotation || 0}deg)`,
                        objectFit: "contain"
                      }}
                      autoPlay 
                      loop 
                      muted 
                    />
                  )
                })
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-2 sm:space-y-0 sm:space-x-3 mt-4 sm:mt-6 pt-4 border-t border-gray-200 bg-gray-100" style={{ paddingTop: '24px', minHeight: '80px' }}>
            <button
              onClick={handlePreviewPlay}
              className="w-full sm:w-auto px-4 py-2 border-2 border-green-600 bg-green-600 hover:bg-green-700 hover:border-green-700 text-white rounded-lg flex items-center justify-center space-x-2 font-medium text-sm shadow-lg transition-all transform hover:scale-105 cursor-pointer"
              style={{ minWidth: '140px' }}
            >
              {isPreviewPlaying ? (
                <>
                  <MdClose size={16} />
                  <span>Stop Animation</span>
                </>
              ) : (
                <>
                  <MdPlayArrow size={16} />
                  <span>Play Animation</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowPreview(false)}
              className="w-full sm:w-auto px-4 py-2 border-2 border-gray-500 bg-gray-500 hover:bg-gray-600 hover:border-gray-600 text-white rounded-lg font-medium shadow-md transition-all duration-200 hover:scale-105 cursor-pointer text-sm"
            >
              Close
            </button>
            <button
              onClick={handleDownloadVideo}
              disabled={isDownloading}
              className="w-full sm:w-auto px-4 py-2 border-2 border-purple-600 bg-purple-600 hover:bg-purple-700 hover:border-purple-700 disabled:border-gray-400 disabled:bg-gray-400 text-white rounded-lg font-medium shadow-md flex items-center justify-center space-x-2 transition-all duration-200 hover:scale-105 cursor-pointer text-sm"
            >
              {isDownloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Downloading... {downloadProgress}%</span>
                </>
              ) : (
                <>
                  <MdDownload size={16} />
                  <span>Download MP4</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default Main;
