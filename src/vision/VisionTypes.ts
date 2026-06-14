export interface VisualBounds {
  ymin: number; // 0 to 1000
  xmin: number; // 0 to 1000
  ymax: number; // 0 to 1000
  xmax: number; // 0 to 1000
}

export interface VisualElement {
  id: string;
  type:
    | "button"
    | "input"
    | "form"
    | "dropdown"
    | "checkbox"
    | "dialog"
    | "upload_area"
    | "navigation"
    | "section"
    | "cta";
  text: string;
  bounds: VisualBounds;
  confidence: number;
  importance: "high" | "medium" | "low";
  actions: string[];
}

export interface VisionDetectionResult {
  elements: VisualElement[];
  source: "vision";
  confidence: number;
  reasoning: string;
}

export interface VisualInteraction {
  url: string;
  elementText: string;
  elementType: string;
  action: string;
  timestamp: string;
  success: boolean;
}
