import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../context/AppStore';
import { 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemText, 
  ListItemAvatar, 
  Avatar, 
  Typography, 
  Box, 
  Paper,
  Button,
  IconButton
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SelectAllIcon from '@mui/icons-material/SelectAll';
import { invoke } from '@tauri-apps/api/core';

const ImageList: React.FC = () => {
  const { 
    currentDirectory,
    selectedImages,
    selectedImage,
    captions,
    imageFiles,
    handleImageClick,
    selectAll,
    isProcessing,
    processedCount,
    totalToProcess,
    selectDirectory
  } = useAppStore();
  
  const listRef = useRef<HTMLUListElement>(null);
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [loadingThumbnails, setLoadingThumbnails] = useState<boolean>(false);
  
  // Load thumbnails for all images
  useEffect(() => {
    if (imageFiles.length === 0) return;
    
    setLoadingThumbnails(true);
    const newImageUrls: Record<string, string> = {};
    let loadedCount = 0;
    
    // Load thumbnails one by one to avoid overwhelming the system
    const loadThumbnail = async (index: number) => {
      if (index >= imageFiles.length) {
        setLoadingThumbnails(false);
        return;
      }
      
      const file = imageFiles[index];
      try {
        // Use Rust function to load the image as base64
        const base64 = await invoke<string>('read_image_as_base64', { path: file.path });
        
        // Determine the image type from the file extension
        const ext = file.path.split('.').pop()?.toLowerCase() || 'png';
        const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
        
        // Create a data URL
        newImageUrls[file.path] = `data:${mimeType};base64,${base64}`;
        
        // Update state every few images to show progress
        loadedCount++;
        if (loadedCount % 5 === 0 || index === imageFiles.length - 1) {
          setImageUrls({...newImageUrls});
        }
        
        // Load the next thumbnail
        loadThumbnail(index + 1);
      } catch (err) {
        console.error('Error loading thumbnail:', err);
        loadThumbnail(index + 1);
      }
    };
    
    // Start loading thumbnails
    loadThumbnail(0);
  }, [imageFiles]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A to select all images, but only if no text input is focused
      if (e.ctrlKey && e.key === 'a') {
        // Check if the active element is a text input field
        const activeElement = document.activeElement;
        const isTextInputFocused = activeElement instanceof HTMLInputElement || 
                                  activeElement instanceof HTMLTextAreaElement || 
                                  (activeElement as HTMLElement)?.isContentEditable;
        
        // Only select all images if no text input is focused
        if (!isTextInputFocused) {
          e.preventDefault();
          selectAll();
        }
        // If a text input is focused, let the browser handle the Ctrl+A (select all text)
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectAll]);
  
  // Render the image list content
  const renderContent = () => {
    if (!currentDirectory) {
      return (
        <Box sx={{ flexGrow: 1 }}></Box>
      );
    }
    
    return (
      <List 
        ref={listRef} 
        dense 
        sx={{ 
          p: 0, 
          overflow: 'auto',
          flexGrow: 1,
          '&::-webkit-scrollbar': {
            width: '8px',
            backgroundColor: 'transparent',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: theme => 
              theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.05)' 
                : 'rgba(0, 0, 0, 0.05)',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme => 
              theme.palette.mode === 'dark' 
                ? 'rgba(0, 150, 136, 0.7)' // Primary color with opacity
                : 'rgba(0, 150, 136, 0.6)',
            borderRadius: '4px',
            '&:hover': {
              backgroundColor: theme => 
                theme.palette.mode === 'dark' 
                  ? 'rgba(0, 150, 136, 0.9)' 
                  : 'rgba(0, 150, 136, 0.8)',
            }
          }
        }}
      >
        {imageFiles.map((file) => {
          const path = file.path;
          const isSelected = selectedImage === path;
          const caption = captions[path];
          
          // Use the name from the file info
          const fileName = file.name;
          
          return (
            <ListItem 
              key={path}
              disablePadding
            >
              <ListItemButton
                selected={isSelected}
                onClick={(e) => {
                  const isCtrlPressed = e.ctrlKey;
                  const isShiftPressed = e.shiftKey;
                  handleImageClick(path, { isCtrlPressed, isShiftPressed });
                }}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'primary.light',
                  },
                  py: 1,
                  position: 'relative'
                }}
              >
                <ListItemAvatar>
                  <Avatar 
                    variant="rounded" 
                    src={imageUrls[path] || ''}
                    sx={{ 
                      width: 60, 
                      height: 60, 
                      mr: 1,
                      borderRadius: '4px'
                    }}
                  />
                </ListItemAvatar>
                <ListItemText
                  primary={fileName}
                  secondary={caption}
                  primaryTypographyProps={{
                    noWrap: true,
                    variant: 'body2',
                    sx: { 
                      color: theme => theme.palette.mode === 'dark' ? 'white' : 'black',
                      fontWeight: 500
                    }
                  }}
                  secondaryTypographyProps={{
                    noWrap: true,
                    variant: 'caption',
                    sx: { 
                      color: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }
                  }}
                />
                
                {/* Selection indicator - squircle shape */}
                {selectedImages.has(path) && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 16,
                      height: 16,
                      borderRadius: '6px',
                      bgcolor: 'primary.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  >
                    ✓
                  </Box>
                )}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    );
  };
  
  return (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}
    >
      {/* Header with squircle buttons */}
      <Box 
        sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        {/* Left side - Directory info or prompt */}
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          {currentDirectory ? (
            <Typography 
              variant="body2" 
              noWrap 
              title={currentDirectory}
              sx={{ 
                fontFamily: '"Inconsolata", monospace',
                opacity: 0.7
              }}
            >
              {currentDirectory.split(/[\/\\]/).pop()}
            </Typography>
          ) : (
            <Typography 
              variant="body2" 
              sx={{ 
                fontFamily: '"Inconsolata", monospace',
                opacity: 0.7
              }}
            >
              Select a directory
            </Typography>
          )}
        </Box>
        
        {/* Right side - Action buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {currentDirectory && (
            <IconButton 
              onClick={selectAll} 
              title="Select All Images"
              size="small"
              sx={{
          borderRadius: '12px',
          padding: '6px',
          backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
          '&:hover': {
            backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
          }
              }}
            >
              <SelectAllIcon fontSize="small" />
            </IconButton>
          )}
          
          <IconButton 
            onClick={() => {
              console.log('Folder button clicked');
              selectDirectory();
            }} 
            title="Open Directory"
            size="small"
            sx={{
              borderRadius: '12px',
              padding: '6px',
              backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
              '&:hover': {
                backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)'
              }
            }}
          >
            <FolderOpenIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>
      
      {renderContent()}
      
      {/* Processing overlay removed - now handled by App.tsx */}
    </Box>
  );
};

export default ImageList;
