import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../context/AppStore';
import { Box, Paper, Typography, CircularProgress, IconButton, Divider } from '@mui/material';
import { invoke } from '@tauri-apps/api/core';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

const ImageViewer: React.FC = () => {
  const { selectedImage, imageFiles, setSelectedImage } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset view when image changes
  useEffect(() => {
    if (selectedImage) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [selectedImage]);

  useEffect(() => {
    if (selectedImage) {
      setLoading(true);
      setError(null);
      
      // Use Rust function to load the image as base64
      invoke<string>('read_image_as_base64', { path: selectedImage })
        .then(base64 => {
          // Determine the image type from the file extension
          const ext = selectedImage.split('.').pop()?.toLowerCase() || 'png';
          const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
          
          // Create a data URL
          const dataUrl = `data:${mimeType};base64,${base64}`;
          setImageSrc(dataUrl);
          setLoading(false);
        })
        .catch(err => {
          console.error('Error loading image:', err);
          setError('Failed to load image');
          setLoading(false);
        });
    } else {
      setImageSrc(null);
    }
  }, [selectedImage]);

  if (!selectedImage) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%' 
        }}
      >
        <Typography variant="body1">No image selected</Typography>
      </Box>
    );
  }
  
  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };
  
  // Handle mouse move for dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };
  
  // Handle mouse up to end dragging
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  // Handle mouse leave to end dragging
  const handleMouseLeave = () => {
    setIsDragging(false);
  };
  
  // Handle wheel for zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      setScale(prev => Math.min(prev + 0.1, 4));
    } else {
      // Zoom out
      setScale(prev => Math.max(prev - 0.1, 0.5));
    }
  };
  
  // Get current image index and total count
  const getCurrentImageIndex = (): number => {
    if (!selectedImage || imageFiles.length === 0) return 0;
    const index = imageFiles.findIndex(file => file.path === selectedImage);
    return index >= 0 ? index + 1 : 0;
  };
  
  // Navigate to previous image
  const handlePreviousImage = () => {
    if (!selectedImage || imageFiles.length === 0) return;
    
    const currentIndex = imageFiles.findIndex(file => file.path === selectedImage);
    if (currentIndex > 0) {
      const previousImage = imageFiles[currentIndex - 1].path;
      setSelectedImage(previousImage);
    }
  };
  
  // Navigate to next image
  const handleNextImage = () => {
    if (!selectedImage || imageFiles.length === 0) return;
    
    const currentIndex = imageFiles.findIndex(file => file.path === selectedImage);
    if (currentIndex < imageFiles.length - 1) {
      const nextImage = imageFiles[currentIndex + 1].path;
      setSelectedImage(nextImage);
    }
  };

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        bgcolor: 'background.paper',
        overflow: 'hidden'
      }}
    >
      {/* Image container */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          cursor: scale > 1 ? 'grab' : 'default',
          ...(isDragging && { cursor: 'grabbing' })
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      >
        {loading ? (
          <CircularProgress />
        ) : error ? (
          <Typography color="error">Error loading image: {error}</Typography>
        ) : (
          <img
            src={imageSrc || ''}
            alt="Selected"
            style={{ 
              maxWidth: `${scale * 100}%`, 
              maxHeight: `${scale * 100}%`, 
              objectFit: 'contain',
              transform: `translate(${position.x}px, ${position.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            onError={() => setError('Failed to load image')}
            draggable={false}
          />
        )}
      </Box>

      {/* Navigation bar */}
      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: 2,
            py: 1
          }}
        >
          {/* Current image info */}
          <Typography variant="body2">
            {getCurrentImageIndex()} / {imageFiles.length}
          </Typography>

          {/* Navigation buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              size="small" 
              onClick={handlePreviousImage}
              disabled={getCurrentImageIndex() <= 1}
              sx={{
                borderRadius: '12px',
                padding: '6px',
                backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                '&:hover': {
                  backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                }
              }}
            >
              <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={handleNextImage}
              disabled={getCurrentImageIndex() >= imageFiles.length}
              sx={{
                borderRadius: '12px',
                padding: '6px',
                backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                '&:hover': {
                  backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
                }
              }}
            >
              <KeyboardArrowDownIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default ImageViewer;
