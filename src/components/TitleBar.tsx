import React, { useState, useEffect } from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import MinimizeIcon from '@mui/icons-material/Minimize';
import CropSquareIcon from '@mui/icons-material/CropSquare';
import CloseIcon from '@mui/icons-material/Close';
import { Window } from '@tauri-apps/api/window';

interface TitleBarProps {
  title?: string;
  isDarkMode: boolean;
}

const TitleBar: React.FC<TitleBarProps> = ({ title = 'tagmeister', isDarkMode }) => {
  const [isMaximized, setIsMaximized] = useState(false);

  // Check if window is maximized on mount
  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const appWindow = Window.getCurrent();
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      } catch (error) {
        console.error('Failed to check if window is maximized:', error);
      }
    };

    checkMaximized();
    
    // We can't use event listeners in Tauri v2 the same way as v1
    // So we'll just check the maximized state after actions
  }, []);

  const handleMinimize = async () => {
    const appWindow = Window.getCurrent();
    await appWindow.minimize();
  };

  const handleMaximizeRestore = async () => {
    const appWindow = Window.getCurrent();
    if (isMaximized) {
      await appWindow.unmaximize();
      setIsMaximized(false);
    } else {
      await appWindow.maximize();
      setIsMaximized(true);
    }
  };

  const handleClose = async () => {
    const appWindow = Window.getCurrent();
    await appWindow.close();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 32,
        bgcolor: isDarkMode ? 'background.paper' : 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        px: 1,
        // This makes the title bar draggable
        WebkitAppRegion: 'drag',
        // Prevent text selection during drag
        userSelect: 'none',
      }}
      data-tauri-drag-region
    >
      <img 
        src={isDarkMode ? 'logo_white.png' : 'logo_black.png'} 
        alt="tagmeister logo" 
        style={{ height: 16, marginLeft: 8 }} 
      />

      <Box 
        sx={{ 
          display: 'flex', 
          WebkitAppRegion: 'no-drag' // Make buttons clickable
        }}
      >
        <IconButton 
          size="small" 
          onClick={handleMinimize}
          sx={{ 
            borderRadius: 0,
            color: isDarkMode ? 'text.secondary' : 'text.secondary',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: isDarkMode ? 'action.hover' : 'action.hover',
              boxShadow: 'none',
            },
            '&.MuiButtonBase-root': {
              border: 'none',
              boxShadow: 'none',
            }
          }}
        >
          <MinimizeIcon fontSize="small" />
        </IconButton>
        
        <IconButton 
          size="small" 
          onClick={handleMaximizeRestore}
          sx={{ 
            borderRadius: 0,
            color: isDarkMode ? 'text.secondary' : 'text.secondary',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: isDarkMode ? 'action.hover' : 'action.hover',
              boxShadow: 'none',
            },
            '&.MuiButtonBase-root': {
              border: 'none',
              boxShadow: 'none',
            }
          }}
        >
          <CropSquareIcon fontSize="small" />
        </IconButton>
        
        <IconButton 
          size="small" 
          onClick={handleClose}
          sx={{ 
            borderRadius: 0,
            color: isDarkMode ? 'text.secondary' : 'text.secondary',
            boxShadow: 'none',
            '&:hover': {
              bgcolor: 'error.main',
              color: 'white',
              boxShadow: 'none',
            },
            '&.MuiButtonBase-root': {
              border: 'none',
              boxShadow: 'none',
            }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default TitleBar;
