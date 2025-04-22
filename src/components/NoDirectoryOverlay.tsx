import { useRef } from "react";
import VariableProximity from "./VariableProximity";
import { useAppStore } from "../context/AppStore";
import { Button } from "@mui/material";

export default function NoDirectoryOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectDirectory = useAppStore((s) => s.selectDirectory);
  const isDarkMode = useAppStore((s) => s.isDarkMode);

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        inset: 0,
        background: isDarkMode
          ? "rgba(18,18,18,0.92)"
          : "rgba(245,245,245,0.92)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 900,
        pointerEvents: "auto",
      }}
    >
      <VariableProximity
        label="Welcome to tagmeister."
        className="variable-proximity-title"
        fromFontVariationSettings="'wght' 400, 'opsz' 9"
        toFontVariationSettings="'wght' 1000, 'opsz' 40"
        containerRef={containerRef}
        radius={120}
        style={{
          fontFamily: "'Karla', sans-serif",
          fontSize: "2.5rem",
          color: isDarkMode ? "white" : "#222",
          marginBottom: "1.5rem",
          textAlign: "center",
          lineHeight: 1.1,
        }}
      />
      <VariableProximity
        label="Select a Directory first.."
        className="variable-proximity-body"
        fromFontVariationSettings="'wght' 400"
        toFontVariationSettings="'wght' 700"
        containerRef={containerRef}
        radius={80}
        style={{
          fontFamily: "'Inconsolata', monospace",
          fontSize: "1.3rem",
          color: isDarkMode ? "white" : "#222",
          marginBottom: "2.5rem",
          textAlign: "center",
        }}
      />
      <Button
        variant="contained"
        color="primary"
        onClick={selectDirectory}
        sx={{
          fontFamily: "'Karla', sans-serif",
          fontWeight: 600,
          fontSize: "1rem",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          mt: 2,
        }}
      >
        Select Directory
      </Button>
    </div>
  );
}
