import { useEffect } from "react";
import { useAppStore } from "./context/AppStore";
import { 
  Box, 
  CssBaseline, 
  ThemeProvider, 
  createTheme, 
  Typography, 
  IconButton, 
  Paper,
  Grid,
  Divider,
  Button
} from "@mui/material";
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import ImageList from "./components/ImageList";
import ImageViewer from "./components/ImageViewer";
import CaptionEditor from "./components/CaptionEditor";
import TitleBar from "./components/TitleBar";
import "./App.css";

function App() {
  const { 
    isDarkMode, 
    toggleTheme, 
    selectDirectory,
    initialize,
    isProcessing,
    processedCount,
    totalToProcess,
    leftPanelWidth,
    rightPanelWidth,
    setPanelWidth,
    shouldInterrupt
  } = useAppStore();
  
  // Handle stopping the caption generation process
  const handleStopProcessing = () => {
    useAppStore.getState().setShouldInterrupt(true);
  };
  
  // Initialize the app
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  // Create theme based on dark mode setting
  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: '#009688', // teal - same as Flutter app
      },
      secondary: {
        main: '#4db6ac', // teal light - same as Flutter app's tealAccent
      },
      background: {
        default: isDarkMode ? '#121212' : '#f5f5f5',
        paper: isDarkMode ? '#1e1e1e' : '#ffffff',
      },
      // Match Flutter app's color scheme
      ...(isDarkMode 
        ? {
            surface: {
              main: '#1E1E1E' // Match Flutter's dark mode surface color
            }
          } 
        : {
            surface: {
              main: '#f5f5f5' // Match Flutter's light mode surface color
            }
          }
      )
    },
    typography: {
      // Use Karla for headings and Inconsolata for body text
      fontFamily: '"Inconsolata", monospace',
      h1: {
        fontFamily: '"Karla", sans-serif',
        fontWeight: 700,
      },
      h2: {
        fontFamily: '"Karla", sans-serif',
        fontWeight: 700,
      },
      h3: {
        fontFamily: '"Karla", sans-serif',
        fontWeight: 700,
      },
      h4: {
        fontFamily: '"Karla", sans-serif',
        fontWeight: 700,
      },
      h5: {
        fontFamily: '"Karla", sans-serif',
        fontWeight: 700,
      },
      h6: {
        fontFamily: '"Karla", sans-serif',
        fontWeight: 500,
        fontSize: '1.25rem',
      },
      subtitle1: {
        fontFamily: '"Karla", sans-serif',
        fontWeight: 500,
      },
      subtitle2: {
        fontFamily: '"Karla", sans-serif',
        fontWeight: 500,
      },
      body1: {
        fontFamily: '"Inconsolata", monospace',
        fontSize: '1rem',
      },
      body2: {
        fontFamily: '"Inconsolata", monospace',
        fontSize: '0.875rem',
      },
      button: {
        fontFamily: '"Karla", sans-serif',
        fontWeight: 500,
      },
      caption: {
        fontFamily: '"Inconsolata", monospace',
        fontSize: '0.75rem',
      },
    },
    components: {
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 8, // Match Flutter's card border radius
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 4, // Match Flutter's button border radius
            textTransform: 'none', // Don't uppercase button text
          },
        },
      },
    },
  });
  
  // Drag handle component
  const DragHandle = ({ onDrag }: { onDrag: (dx: number) => void }) => (
    <Box
      sx={{
        width: 8,
        height: '100%',
        cursor: 'col-resize',
        backgroundColor: 'transparent',
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
        },
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        
        const startX = e.clientX;
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
          const dx = moveEvent.clientX - startX;
          onDrag(dx);
        };
        
        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }}
    />
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Custom title bar */}
        <TitleBar isDarkMode={isDarkMode} />
        
        {/* App controls section removed to eliminate gap */}
        
        <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden', p: '8px 8px 8px 8px', position: 'relative' }}>
          {/* Left panel - Image list */}
          <Paper 
            elevation={1} 
            sx={{ 
              width: `${leftPanelWidth * 100}%`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              mr: 0.5
            }}
          >
            <ImageList />
          </Paper>
          
          {/* Left drag handle */}
          <DragHandle 
            onDrag={(dx) => {
              const newWidth = leftPanelWidth + dx / window.innerWidth;
              // Constrain between 15% and 40%
              const constrainedWidth = Math.min(Math.max(newWidth, 0.15), 0.4);
              setPanelWidth('left', constrainedWidth);
            }} 
          />
          
          {/* Middle panel - Image viewer with logo */}
          <Paper 
            elevation={1} 
            sx={{ 
              width: `${(1 - leftPanelWidth - rightPanelWidth) * 100}%`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
              mx: 0.5
            }}
          >
            {/* Logo at the top with theme toggle */}
            <Box 
              sx={{ 
                p: 2, 
                display: 'flex', 
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              <Box sx={{ width: '40px' }}></Box> {/* Empty space for balance */}
              
              <img 
                src={isDarkMode ? 'logo_white.png' : 'logo_black.png'} 
                alt="tagmeister logo" 
                style={{ height: 20 }} 
              />
              
              {/* Theme toggle aligned to the right with squircle shape */}
              <IconButton 
                onClick={toggleTheme} 
                title="Toggle Theme"
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
                {isDarkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
              </IconButton>
            </Box>
            
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <ImageViewer />
            </Box>
            
            {/* Processing overlay moved to main container */}
          </Paper>
          
          {/* Right drag handle */}
          <DragHandle 
            onDrag={(dx) => {
              const newWidth = rightPanelWidth - dx / window.innerWidth;
              // Constrain between 15% and 40%
              const constrainedWidth = Math.min(Math.max(newWidth, 0.15), 0.4);
              setPanelWidth('right', constrainedWidth);
            }} 
          />
          
          {/* Right panel - Caption editor */}
          <Paper 
            elevation={1} 
            sx={{ 
              width: `${rightPanelWidth * 100}%`,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              ml: 0.5
            }}
          >
            <CaptionEditor />
          </Paper>
          {/* Global processing overlay that covers all panels */}
          {isProcessing && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000
              }}
            >
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: '3px solid transparent',
                  borderTopColor: 'white',
                  animation: 'spin 1s linear infinite',
                  mb: 2,
                  '@keyframes spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' }
                  }
                }}
              />
              <Typography 
                color="white" 
                variant="h6"
                sx={{ fontFamily: '"Karla", sans-serif' }}
              >
                Processing {processedCount}/{totalToProcess}
              </Typography>
              <Button
                variant="contained"
                color="error"
                onClick={handleStopProcessing}
                disabled={shouldInterrupt}
                sx={{ 
                  mt: 2,
                  fontFamily: '"Karla", sans-serif'
                }}
              >
                {shouldInterrupt ? "Stopping..." : "Stop Processing"}
              </Button>
            </Box>
          )}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
