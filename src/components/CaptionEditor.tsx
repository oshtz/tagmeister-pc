import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useAppStore } from '../context/AppStore';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  LinearProgress,
  Grid,
  InputAdornment,
  Collapse,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LinkIcon from '@mui/icons-material/Link';
import { OpenAIService } from '../services/OpenAIService';
import { AnthropicService } from '../services/AnthropicService';
import { LMStudioService } from '../services/LMStudioService';
import Popover from '@mui/material/Popover';
import Slider from '@mui/material/Slider';
import Tooltip from '@mui/material/Tooltip';

// FontSizePopover component
const FontSizePopover: React.FC<{
  fontSize: number;
  adjustFontSize: (delta: number) => void;
}> = ({ fontSize, adjustFontSize }) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [sliderValue, setSliderValue] = React.useState(fontSize);

  // Sync slider with fontSize prop
  React.useEffect(() => {
    setSliderValue(fontSize);
  }, [fontSize]);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? 'font-size-popover' : undefined;

  // When slider changes, call adjustFontSize with the delta
  const handleSliderChange = (_: Event, value: number | number[]) => {
    if (typeof value === 'number') {
      setSliderValue(value);
      adjustFontSize(value - fontSize);
    }
  };

  return (
    <>
      <Tooltip title="Adjust caption font size">
        <IconButton
          aria-describedby={id}
          onClick={handleClick}
          size="small"
          sx={{
            borderRadius: '12px',
            padding: '6px',
            backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
            '&:hover': {
              backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'
            }
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 1 }}>Aa</Typography>
        </IconButton>
      </Tooltip>
      <Popover
        id={id}
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { p: 2, minWidth: 180 }
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ mb: 1 }}>Font Size</Typography>
          <Slider
            min={10}
            max={48}
            step={1}
            value={sliderValue}
            onChange={handleSliderChange}
            valueLabelDisplay="auto"
            sx={{ width: 120 }}
            aria-label="Font size slider"
          />
          <Typography variant="body2" sx={{ fontFamily: '"Inconsolata", monospace' }}>{sliderValue}px</Typography>
        </Box>
      </Popover>
    </>
  );
};

const CaptionEditor: React.FC = () => {
  // Add global styles to completely remove any shadows from API key inputs
  useLayoutEffect(() => {
    // Create a style element
    const styleEl = document.createElement('style');
    // Comprehensive rules to eliminate all shadows
    styleEl.innerHTML = `
      /* Target all shadows everywhere in the API key section */
      .MuiPaper-root.MuiAccordion-root,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionSummary-root,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root *,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root .MuiInputBase-root,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root .MuiTextField-root,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root .MuiOutlinedInput-root,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root .MuiInputBase-root .MuiInputAdornment-root {
        box-shadow: none !important;
        -webkit-box-shadow: none !important;
        -moz-box-shadow: none !important;
        filter: none !important;
        text-shadow: none !important;
      }
      
      /* Removing divider between accordion summary and details */
      .MuiPaper-root.MuiAccordion-root .MuiAccordionSummary-root {
        border-bottom: none !important;
        box-shadow: none !important;
        margin-bottom: 0 !important;
      }
      
      .MuiPaper-root.MuiAccordion-root .MuiAccordionSummary-root.Mui-expanded {
        min-height: 48px !important;
        margin: 0 !important;
      }
      
      /* Remove the divider line completely */
      .MuiPaper-root.MuiAccordion-root .MuiDivider-root,
      .MuiPaper-root.MuiAccordion-root hr {
        display: none !important;
      }
      
      /* Remove the shadow specifically between header and content */
      .MuiPaper-root.MuiAccordion-root::after,
      .MuiPaper-root.MuiAccordion-root::before,
      .MuiPaper-root.MuiAccordion-root .MuiAccordionSummary-root::after {
        display: none !important;
        box-shadow: none !important;
        border: none !important;
      }
      
      .MuiAccordionDetails-root {
        padding-top: 8px !important;
        border-top: none !important;
      }
      
      /* Light mode specific overrides */
      body[data-color-mode="light"] .MuiPaper-root.MuiAccordion-root {
        box-shadow: none !important;
      }
      
      /* Ensuring no borders or outlines */
      .MuiPaper-root.MuiAccordion-root .MuiAccordionDetails-root .MuiOutlinedInput-notchedOutline,
      .MuiPaper-root.MuiAccordion-root .MuiInputBase-root fieldset {
        border: none !important;
        outline: none !important;
      }
    `;
    // Append the style to the document head
    document.head.appendChild(styleEl);
    
    // Cleanup function to remove the style on unmount
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);
  
  const { 
    selectedImage,
    selectedImages,
    captions,
    apiKey,
    apiKeyVisible,
    toggleApiKeyVisibility,
    setApiKey,
    anthropicApiKey,
    anthropicApiKeyVisible,
    toggleAnthropicApiKeyVisibility,
    setAnthropicApiKey,
    prefixText,
    suffixText,
    selectedModel,
    selectedPromptStyle,
    fontSize,
    updateCaption,
    saveCaption,
    setPromptStyle,
    setModel,
    getProviderForModel,
    adjustFontSize,
    isProcessing,
    processedCount,
    totalToProcess,
    setProcessingState,
    incrementProcessedCount,
    setShouldInterrupt,
    checkShouldInterrupt,
    shouldInterrupt,
    // LM Studio
    lmStudioBaseUrl,
    setLMStudioBaseUrl,
    checkLMStudioConnection,
    fetchLMStudioModels,
    lmStudioAvailable,
    lmStudioModels
  } = useAppStore();

  // Automatically fetch LM Studio models when LM Studio becomes available
  useEffect(() => {
    if (lmStudioAvailable) {
      fetchLMStudioModels();
    }
  }, [lmStudioAvailable, fetchLMStudioModels]);
  
  const [caption, setCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Update caption when selection changes
  useEffect(() => {
    if (selectedImage) {
      setCaption(captions[selectedImage] || '');
    } else {
      setCaption('');
    }
  }, [selectedImage, captions]);
  
  // Handle caption change
  const handleCaptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCaption(e.target.value);
    if (selectedImage) {
      updateCaption(selectedImage, e.target.value);
    }
  };
  
  // Handle caption save
  const handleSaveCaption = async () => {
    if (selectedImage) {
      await saveCaption(selectedImage, caption);
    }
  };
  
  // Helper function to delay execution
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  // Process a single image and return its final caption
  const processSingleImage = async (
    imagePath: string
  ): Promise<string> => {
    // Clear the caption before starting
    setCaption('');
    updateCaption(imagePath, '');
    
    // Create a streaming handler for real-time updates
    const streamHandler = (chunk: string) => {
      setCaption(prev => {
        const newCaption = prev + chunk;
        // Also update the caption in the store
        updateCaption(imagePath, newCaption);
        return newCaption;
      });
    };
    
    // Determine which service to use based on the selected model
    const provider = getProviderForModel(selectedModel);
    
    let rawCaption: string;
    let processedCaption: string;

    if (provider === 'anthropic') {
      // Use Anthropic service
      if (!anthropicApiKey) {
        throw new Error('Anthropic API key is required for Claude models');
      }
      const anthropicService = new AnthropicService(anthropicApiKey, true);
      rawCaption = await anthropicService.generateImageCaption(
        imagePath,
        selectedModel,
        selectedPromptStyle,
        streamHandler
      );
      processedCaption = anthropicService.processCaption(rawCaption).trim();
    } else if (provider === 'lmstudio') {
      // Use LM Studio service
      const { lmStudioBaseUrl } = useAppStore.getState();
      const lmstudioService = new LMStudioService(lmStudioBaseUrl);
      // Use the same prompt logic as OpenAI
      let promptText: string;
      if (selectedPromptStyle === 'SDXL (Booru Tags)') {
        promptText = "Generate a list of tags for this image in the style of Booru image boards and SDXL prompts. Focus on describing the visual elements, subjects, objects, settings, colors, lighting, composition, artistic style, and other relevant attributes. Format the output as a comma-separated list of tags without numbering or bullet points. Be specific and detailed, but keep each tag concise (1-3 words typically). Include tags for the main subject, background elements, colors, lighting, composition, style, medium, and any notable features. Do not include explanatory text or categorization headers - just provide the raw comma-separated tag list. Make sure to include mostly single-word tags, you can use some double-word tags if needed but mostly single word if possible.";
      } else {
        promptText = "Describe this image in one concise paragraph, starting immediately with the primary subject (e.g., 'Watch,' 'Landscape,' 'Person'). Focus on key elements, their relationships, and notable details. Be specific and direct, avoiding any introductory phrases like 'The image shows' or 'I can see.' Prioritize the most important aspects and describe them factually. Identify the main subject quickly and accurately, noting its dominant characteristics such as size, color, shape, or position. For multiple elements, describe their spatial relationships. Include relevant details about composition, color schemes, lighting, and textures. Mention any actions, movements, functions, or unique features of objects, and appearances or behaviors of people or animals. Include any visible text, logos, or recognizable symbols. Describe what you see literally, without interpreting the image's style (e.g., don't use terms like 'stylized,' 'illustration,' or mention artistic techniques). Treat every subject as a real object or scene, not as a representation. Use varied and precise vocabulary to create a vivid description while maintaining a neutral tone. Avoid subjective interpretations unless crucial to understanding the image's content.";
      }
      // Remove lmstudio: prefix for model id
      const modelId = selectedModel.replace(/^lmstudio:/, '');
      rawCaption = await lmstudioService.generateImageCaption(
        imagePath,
        modelId,
        promptText,
        streamHandler
      );
      // Use OpenAI-style post-processing
      processedCaption = rawCaption.trim().replace(/\.$/, '');
    } else if (provider === 'ollama') {
      // Use Ollama service
      const { ollamaBaseUrl } = useAppStore.getState();
      const { OllamaService } = await import('../services/OllamaService');
      const ollamaService = new OllamaService(ollamaBaseUrl);
      // Use the same prompt logic as LM Studio
      let promptText: string;
      if (selectedPromptStyle === 'SDXL (Booru Tags)') {
        promptText = "Generate a list of tags for this image in the style of Booru image boards and SDXL prompts. Focus on describing the visual elements, subjects, objects, settings, colors, lighting, composition, artistic style, and other relevant attributes. Format the output as a comma-separated list of tags without numbering or bullet points. Be specific and detailed, but keep each tag concise (1-3 words typically). Include tags for the main subject, background elements, colors, lighting, composition, style, medium, and any notable features. Do not include explanatory text or categorization headers - just provide the raw comma-separated tag list. Make sure to include mostly single-word tags, you can use some double-word tags if needed but mostly single word if possible.";
      } else {
        promptText = "Describe this image in one concise paragraph, starting immediately with the primary subject (e.g., 'Watch,' 'Landscape,' 'Person'). Focus on key elements, their relationships, and notable details. Be specific and direct, avoiding any introductory phrases like 'The image shows' or 'I can see.' Prioritize the most important aspects and describe them factually. Identify the main subject quickly and accurately, noting its dominant characteristics such as size, color, shape, or position. For multiple elements, describe their spatial relationships. Include relevant details about composition, color schemes, lighting, and textures. Mention any actions, movements, functions, or unique features of objects, and appearances or behaviors of people or animals. Include any visible text, logos, or recognizable symbols. Describe what you see literally, without interpreting the image's style (e.g., don't use terms like 'stylized,' 'illustration,' or mention artistic techniques). Treat every subject as a real object or scene, not as a representation. Use varied and precise vocabulary to create a vivid description while maintaining a neutral tone. Avoid subjective interpretations unless crucial to understanding the image's content.";
      }
      // Remove ollama: prefix and :latest suffix for model id
      const modelId = selectedModel.replace(/^ollama:/, '').replace(/:latest$/, '');
      rawCaption = await ollamaService.generateImageCaption(
        imagePath,
        modelId,
        promptText,
        streamHandler
      );
      processedCaption = rawCaption.trim().replace(/\.$/, '');
    } else {
      // Use OpenAI service
      if (!apiKey) {
        throw new Error('OpenAI API key is required for OpenAI models');
      }
      const openAiService = new OpenAIService(apiKey);
      rawCaption = await openAiService.generateImageCaption(
        imagePath,
        selectedModel,
        selectedPromptStyle,
        streamHandler
      );
      processedCaption = openAiService.processCaption(rawCaption).trim();
    }

    // Remove trailing comma if present
    if (processedCaption.endsWith(',')) {
      processedCaption = processedCaption.substring(0, processedCaption.length - 1).trim();
    }

    // Build final caption with prefix and suffix
    let finalCaption = '';

    // Handle prefix
    let prefix = prefixText.trim();
    if (prefix) {
      // Remove trailing comma and space if present
      if (prefix.endsWith(', ') || prefix.endsWith(' ,')) {
        prefix = prefix.substring(0, prefix.length - 2).trim();
      } else if (prefix.endsWith(',')) {
        prefix = prefix.substring(0, prefix.length - 1).trim();
      }
      finalCaption = prefix + ', ' + processedCaption;
    } else {
      finalCaption = processedCaption;
    }

    // Handle suffix
    let suffix = suffixText.trim();
    if (suffix) {
      // Remove leading comma and space if present
      if (suffix.startsWith(', ') || suffix.startsWith(' ,')) {
        suffix = suffix.substring(2).trim();
      } else if (suffix.startsWith(',')) {
        suffix = suffix.substring(1).trim();
      }
      finalCaption = finalCaption + ', ' + suffix;
    }

    // Update caption in state
    updateCaption(imagePath, finalCaption);
    setCaption(finalCaption);

    // Save caption to file
    await saveCaption(imagePath, finalCaption);

    // Refresh caption from store to ensure UI shows latest prefix/suffix
    setCaption(captions[imagePath] || finalCaption);

    // Ensure sidebar preview updates by forcing captions object update in store
    useAppStore.setState({ captions: { ...captions, [imagePath]: finalCaption } });

    // Increment processed count
    incrementProcessedCount();

    return finalCaption;
  };

  // State for custom confirmation dialog
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingImagesToProcess, setPendingImagesToProcess] = useState<string[] | null>(null);

  // Refactored caption generation logic
  const startCaptionGeneration = async (imagesToProcess: string[]) => {
    setIsGenerating(true);
    setProcessingState(true, imagesToProcess.length);
    setShouldInterrupt(false);
    const processedImages: string[] = [];
    try {
      for (let i = 0; i < imagesToProcess.length; i++) {
        if (checkShouldInterrupt()) {
          console.log('Caption generation interrupted by user');
          break;
        }
        const imagePath = imagesToProcess[i];
        useAppStore.setState({ 
          selectedImage: imagePath, 
          selectedImages: new Set([...selectedImages])
        });
        try {
          await processSingleImage(imagePath);
          processedImages.push(imagePath);
        } catch (error) {
          console.error(`Error generating caption for ${imagePath}:`, error);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in caption generation:', error);
      const provider = getProviderForModel(selectedModel);
      let errorMessage = 'An error occurred during caption generation.';
      if (error instanceof Error) {
        if (error.message.includes('429') || 
            error.message.toLowerCase().includes('rate limit')) {
          errorMessage = `${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API rate limit exceeded. Please try again later.`;
        } else if (error.message.includes('401')) {
          errorMessage = `Invalid API key. Please check your ${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key.`;
        } else if (error.message.includes('400')) {
          const match = error.message.match(/400[^:]*: (.+)/);
          if (match && match[1]) {
            errorMessage = `Bad request: ${match[1]}`;
          } else {
            errorMessage = `Bad request to ${provider === 'anthropic' ? 'Anthropic' : 'OpenAI'} API. Please try again.`;
          }
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      alert(errorMessage);
      if (processedImages.length > 0) {
        const remainingImages = Array.from(selectedImages).filter(
          img => !processedImages.includes(img)
        );
        useAppStore.setState({ 
          selectedImages: new Set(remainingImages),
          selectedImage: remainingImages.length > 0 ? remainingImages[0] : null
        });
      }
    } finally {
      setIsGenerating(false);
      setProcessingState(false);
      setShouldInterrupt(false);
    }
  };

  // Handle caption generation
  const handleGenerateCaption = async () => {
    const provider = getProviderForModel(selectedModel);
    if (provider === 'anthropic' && !anthropicApiKey) {
      alert('Please enter an Anthropic API key first');
      return;
    } else if (provider === 'openai' && !apiKey) {
      alert('Please enter an OpenAI API key first');
      return;
    }
    if (selectedImages.size === 0) {
      alert('Please select at least one image');
      return;
    }
    const imagesToProcess = Array.from(selectedImages);
    if (imagesToProcess.length > 1) {
      setPendingImagesToProcess(imagesToProcess);
      setConfirmDialogOpen(true);
      return;
    }
    // Single image: start immediately
    startCaptionGeneration(imagesToProcess);
  };
  
  // Handle stopping the caption generation process
  const handleStopProcessing = () => {
    setShouldInterrupt(true);
  };
  
  if (!selectedImage) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography 
          variant="body1"
          sx={{ fontFamily: '"Inconsolata", monospace' }}
        >
          Select an image
        </Typography>
      </Box>
    );
  }
  
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        height: '100%', 
        p: 2,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        overflow: 'hidden', // Prevent overall container from scrolling
        minHeight: '400px' // Ensure minimum height for the container
      }}
    >
      {/* API Settings section */}
      <Accordion 
        elevation={0}
        square
        sx={{ 
          mb: 2,
          '&.MuiAccordion-root': {
            boxShadow: 'none !important',
            border: '1px solid',
            borderColor: 'divider',
            '&:before': {
              display: 'none',
            },
          }
        }}
        disableGutters
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          sx={{
            minHeight: '48px',
            borderBottom: 'none',
            boxShadow: 'none !important',
            '&.Mui-expanded': {
              borderBottom: 'none',
              minHeight: '48px',
              boxShadow: 'none !important'
            },
            '& .MuiAccordionSummary-content': {
              margin: '8px 0',
            }
          }}
        >
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontFamily: '"Karla", sans-serif'
            }}
          >
            API Settings
          </Typography>
        </AccordionSummary>
        <AccordionDetails 
          sx={{ 
            pt: 0, 
            mt: 0,
            boxShadow: 'none !important', 
            border: 'none',
            borderTop: 'none !important',
            background: 'transparent !important'
          }}
        >
          {/* OpenAI API Key */}
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              mb: 1,
              fontFamily: '"Karla", sans-serif'
            }}
          >
            OpenAI API Key
          </Typography>
          <TextField
            fullWidth
            size="small"
            type={apiKeyVisible ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter OpenAI API Key"
            variant="standard" 
            InputLabelProps={{
              sx: { boxShadow: 'none !important' }
            }}
            InputProps={{
              sx: theme => ({
                fontFamily: '"Inconsolata", monospace',
                boxShadow: 'none !important',
                filter: 'none !important',
                ...(theme.palette.mode === 'light' && {
                  background: 'transparent',
                  '& svg': { filter: 'none !important' }
                }),
                '& fieldset': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                }
              }),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={toggleApiKeyVisibility}
                    edge="end"
                    size="small"
                    sx={{
                      boxShadow: 'none !important',
                      border: 'none'
                    }}
                  >
                    {apiKeyVisible ? <VisibilityOffIcon /> : <VisibilityIcon color="primary" />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={theme => ({
              boxShadow: 'none !important', 
              filter: 'none !important',
              mb: 2,
              ...(theme.palette.mode === 'light' && {
                '& .MuiOutlinedInput-notchedOutline': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                },
                '& .MuiInputBase-root': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                }
              })
            })}
          />
          
          {/* Anthropic API Key */}
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              mb: 1,
              fontFamily: '"Karla", sans-serif'
            }}
          >
            Anthropic API Key
          </Typography>
          <TextField
            fullWidth
            size="small"
            type={anthropicApiKeyVisible ? 'text' : 'password'}
            value={anthropicApiKey}
            onChange={(e) => setAnthropicApiKey(e.target.value)}
            placeholder="Enter Anthropic API Key"
            variant="standard" 
            InputLabelProps={{
              sx: { boxShadow: 'none !important' }
            }}
            InputProps={{
              sx: theme => ({
                fontFamily: '"Inconsolata", monospace',
                boxShadow: 'none !important',
                filter: 'none !important',
                ...(theme.palette.mode === 'light' && {
                  background: 'transparent',
                  '& svg': { filter: 'none !important' }
                }),
                '& fieldset': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                }
              }),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={toggleAnthropicApiKeyVisibility}
                    edge="end"
                    size="small"
                    sx={{
                      boxShadow: 'none !important',
                      border: 'none'
                    }}
                  >
                    {anthropicApiKeyVisible ? <VisibilityOffIcon /> : <VisibilityIcon color="primary" />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            sx={theme => ({
              boxShadow: 'none !important', 
              filter: 'none !important',
              mb: 2,
              ...(theme.palette.mode === 'light' && {
                '& .MuiOutlinedInput-notchedOutline': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                },
                '& .MuiInputBase-root': {
                  boxShadow: 'none !important',
                  border: 'none !important'
                }
              })
            })}
          />

          {/* LM Studio Server URL */}
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              mb: 1,
              fontFamily: '"Karla", sans-serif'
            }}
          >
            LM Studio Server URL
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              value={lmStudioBaseUrl}
              onChange={(e) => setLMStudioBaseUrl(e.target.value)}
              placeholder="http://localhost:1234/v1"
              variant="standard"
              InputLabelProps={{
                sx: { boxShadow: 'none !important' }
              }}
              InputProps={{
                sx: theme => ({
                  fontFamily: '"Inconsolata", monospace',
                  boxShadow: 'none !important',
                  filter: 'none !important',
                  ...(theme.palette.mode === 'light' && {
                    background: 'transparent',
                    '& svg': { filter: 'none !important' }
                  }),
                  '& fieldset': {
                    boxShadow: 'none !important',
                    border: 'none !important'
                  }
                })
              }}
            />
            <Tooltip
              title="Check LM Studio Connection"
              placement="right"
              PopperProps={{
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [-8, 0],
                    },
                  },
                ],
              }}
            >
              <IconButton
                color="primary"
                size="small"
                sx={{ ml: 1 }}
                onClick={async () => {
                  const ok = await checkLMStudioConnection();
                  if (ok) {
                    await fetchLMStudioModels();
                    alert('LM Studio connected and models loaded.');
                  } else {
                    alert('Could not connect to LM Studio at the specified URL.');
                  }
                }}
              >
                <LinkIcon />
              </IconButton>
            </Tooltip>
          </Box>
          {lmStudioAvailable && lmStudioModels.length === 0 && (
            <Typography variant="caption" color="warning.main">
              No vision-capable models found on LM Studio.
            </Typography>
          )}
          {!lmStudioAvailable && (
            <Typography variant="caption" color="error.main">
              LM Studio not available or not running at the specified URL.
            </Typography>
          )}

          {/* Ollama Server URL */}
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              mb: 1,
              fontFamily: '"Karla", sans-serif'
            }}
          >
            Ollama Server URL
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              value={useAppStore.getState().ollamaBaseUrl}
              onChange={(e) => useAppStore.getState().setOllamaBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
              variant="standard"
              InputLabelProps={{
                sx: { boxShadow: 'none !important' }
              }}
              InputProps={{
                sx: theme => ({
                  fontFamily: '"Inconsolata", monospace',
                  boxShadow: 'none !important',
                  filter: 'none !important',
                  ...(theme.palette.mode === 'light' && {
                    background: 'transparent',
                    '& svg': { filter: 'none !important' }
                  }),
                  '& fieldset': {
                    boxShadow: 'none !important',
                    border: 'none !important'
                  }
                })
              }}
            />
            <Tooltip
              title="Check Ollama Connection"
              placement="right"
              PopperProps={{
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [-8, 0],
                    },
                  },
                ],
              }}
            >
              <IconButton
                color="primary"
                size="small"
                sx={{ ml: 1 }}
                onClick={async () => {
                  const ok = await useAppStore.getState().checkOllamaConnection();
                  if (ok) {
                    await useAppStore.getState().fetchOllamaModels();
                    alert('Ollama connected and models loaded.');
                  } else {
                    alert('Could not connect to Ollama at the specified URL.');
                  }
                }}
              >
                <LinkIcon />
              </IconButton>
            </Tooltip>
          </Box>
          {useAppStore.getState().ollamaAvailable && useAppStore.getState().ollamaModels.length === 0 && (
            <Typography variant="caption" color="warning.main">
              No vision-capable models found on Ollama.
            </Typography>
          )}
          {!useAppStore.getState().ollamaAvailable && (
            <Typography variant="caption" color="error.main">
              Ollama not available or not running at the specified URL.
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography 
          variant="h6"
          sx={{ fontFamily: '"Karla", sans-serif' }}
        >
          Auto-Captioner
        </Typography>
        {/* Font size popover control */}
        <FontSizePopover
          fontSize={fontSize}
          adjustFontSize={adjustFontSize}
        />
      </Box>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontFamily: '"Karla", sans-serif' }}>Caption Style</InputLabel>
            <Select
              value={selectedPromptStyle}
              label="Caption Style"
              onChange={(e) => setPromptStyle(e.target.value)}
              sx={{ fontFamily: '"Inconsolata", monospace' }}
            >
              <MenuItem value="FLUX (Natural Language)" sx={{ fontFamily: '"Inconsolata", monospace' }}>FLUX (Natural Language)</MenuItem>
              <MenuItem value="SDXL (Booru Tags)" sx={{ fontFamily: '"Inconsolata", monospace' }}>SDXL (Booru Tags)</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={6}>
          <FormControl fullWidth size="small">
            <InputLabel sx={{ fontFamily: '"Karla", sans-serif' }}>Model</InputLabel>
            <Select
              value={selectedModel}
              label="Model"
              onChange={(e) => setModel(e.target.value)}
              sx={{ fontFamily: '"Inconsolata", monospace' }}
            >
              <MenuItem value="gpt-4o-mini" sx={{ fontFamily: '"Inconsolata", monospace' }}>OpenAI: gpt-4o-mini</MenuItem>
              <MenuItem value="gpt-4o" sx={{ fontFamily: '"Inconsolata", monospace' }}>OpenAI: gpt-4o</MenuItem>
              <MenuItem value="claude-3-7-sonnet-20250219" sx={{ fontFamily: '"Inconsolata", monospace' }}>Anthropic: Claude 3.7 Sonnet</MenuItem>
              {/* LM Studio Models */}
              {lmStudioAvailable && lmStudioModels.map(model => (
                <MenuItem
                  key={model.id}
                  value={`lmstudio:${model.id}`}
                  sx={{ fontFamily: '"Inconsolata", monospace' }}
                >
                  LM Studio: {model.name}
                </MenuItem>
              ))}
              {/* Ollama Models */}
              {useAppStore.getState().ollamaAvailable && useAppStore.getState().ollamaModels.map(model => (
                <MenuItem
                  key={model.id}
                  value={`ollama:${model.id}`}
                  sx={{ fontFamily: '"Inconsolata", monospace' }}
                >
                  Ollama: {model.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {/* Processing indicator and stop button removed - now handled by App.tsx */}
      
      {/* Caption text field with custom scrollbar */}
      <Box 
        sx={{ 
          flex: '1 1 auto',
          minHeight: '100px',
          maxHeight: 'calc(100% - 200px)', // Ensure space for buttons and modification section
          mb: 2,
          position: 'relative',
          // Add a border that matches the TextField outline
          border: '1px solid',
          borderColor: theme => 
            theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.23)' 
              : 'rgba(0, 0, 0, 0.23)',
          borderRadius: '4px',
          '&:hover': {
            borderColor: theme => 
              theme.palette.mode === 'dark' 
                ? 'rgba(255, 255, 255, 0.5)' 
                : 'rgba(0, 0, 0, 0.5)',
          }
        }}
      >
        {/* Label positioned above the scrollable area */}
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            top: '-10px',
            left: '10px',
            backgroundColor: 'background.paper',
            px: 1,
            fontFamily: '"Karla", sans-serif'
          }}
        >
          Caption
        </Typography>
        
        {/* Scrollable content area */}
        <Box
          sx={{
            height: '100%',
            width: '100%',
            overflow: 'auto', // Make this container scrollable
            p: 2,
            // Scrollbar styling to match ImageList
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
          {/* Text content without TextField border */}
          <Box
            component="div"
            key={caption}
            sx={{
              fontSize: `${fontSize}px`,
              fontFamily: '"Inconsolata", monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              outline: 'none',
              width: '100%',
              minHeight: '100%'
            }}
            contentEditable
            suppressContentEditableWarning
            onBlur={(e) => {
              const newValue = e.currentTarget.textContent || '';
              if (newValue !== caption) {
                setCaption(newValue);
                if (selectedImage) {
                  updateCaption(selectedImage, newValue);
                  saveCaption(selectedImage, newValue);
                }
              }
            }}
            onInput={(e) => {
              const newValue = e.currentTarget.textContent || '';
              setCaption(newValue);
              if (selectedImage) {
                updateCaption(selectedImage, newValue);
              }
            }}
            dangerouslySetInnerHTML={{ __html: caption }}
          />
        </Box>
      </Box>
      
      {/* Non-scrollable section for buttons and caption modification */}
      <Box sx={{ flex: '0 0 auto' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleGenerateCaption}
          disabled={
            isGenerating ||
            (
              getProviderForModel(selectedModel) === 'openai'
                ? !apiKey
                : getProviderForModel(selectedModel) === 'anthropic'
                  ? !anthropicApiKey
                  : getProviderForModel(selectedModel) === 'lmstudio'
                    ? (!lmStudioAvailable || !selectedModel.startsWith('lmstudio:'))
                    : getProviderForModel(selectedModel) === 'ollama'
                      ? (!useAppStore.getState().ollamaAvailable || !selectedModel.startsWith('ollama:'))
                      : true
            )
          }
          fullWidth
          sx={{ 
            mb: 2,
            bgcolor: theme => theme.palette.mode === 'dark' ? 'secondary.main' : 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: theme => theme.palette.mode === 'dark' ? 'secondary.dark' : 'primary.dark',
            },
            fontFamily: '"Karla", sans-serif'
          }}
          startIcon={isGenerating ? null : <AutoAwesomeIcon />}
        >
          {isGenerating ? 'Generating...' : 'Generate Caption'}
        </Button>

        {/* Custom confirmation dialog for multi-image captioning */}
        <Dialog
          open={confirmDialogOpen}
          onClose={() => setConfirmDialogOpen(false)}
        >
          <DialogTitle>Confirm Caption Generation</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Generate captions for {pendingImagesToProcess ? pendingImagesToProcess.length : 0} selected images?
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => {
              setConfirmDialogOpen(false);
              setPendingImagesToProcess(null);
            }} color="secondary">
              Cancel
            </Button>
            <Button onClick={() => {
              setConfirmDialogOpen(false);
              if (pendingImagesToProcess) {
                startCaptionGeneration(pendingImagesToProcess);
                setPendingImagesToProcess(null);
              }
            }} color="primary" autoFocus>
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      
        <Typography 
          variant="subtitle2" 
          sx={{ 
            mb: 1,
            fontFamily: '"Karla", sans-serif'
          }}
        >
          Caption Modification
        </Typography>
        
        <TextField
          label="Prepend Text"
          value={prefixText}
          onChange={(e) => useAppStore.setState({ prefixText: e.target.value })}
          fullWidth
          variant="outlined"
          size="small"
          sx={{ 
            mb: 2,
            '& .MuiInputBase-input': {
              fontFamily: '"Inconsolata", monospace'
            },
            '& .MuiInputLabel-root': {
              fontFamily: '"Karla", sans-serif'
            }
          }}
        />
        
        <TextField
          label="Append Text"
          value={suffixText}
          onChange={(e) => useAppStore.setState({ suffixText: e.target.value })}
          fullWidth
          variant="outlined"
          size="small"
          sx={{ 
            '& .MuiInputBase-input': {
              fontFamily: '"Inconsolata", monospace'
            },
            '& .MuiInputLabel-root': {
              fontFamily: '"Karla", sans-serif'
            }
          }}
        />
      </Box>
    </Paper>
  );
};

export default CaptionEditor;
