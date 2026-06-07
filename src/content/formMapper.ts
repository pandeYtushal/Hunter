import type { UserProfile } from "../shared/types/storage";

export interface MappedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  label: string;
  mappedType: "name" | "firstName" | "lastName" | "email" | "phone" | "linkedin" | "portfolio" | "resume" | "unknown";
}

type MappedType = MappedField["mappedType"];

const isMappedType = (value: string): value is MappedType =>
  ["name", "firstName", "lastName", "email", "phone", "linkedin", "portfolio", "resume", "unknown"].includes(value);

// Find a label associated with an element
function getElementLabelText(element: HTMLElement): string {
  // 1. Check if enclosed in <label>
  let parent = element.parentElement;
  while (parent) {
    if (parent.tagName.toLowerCase() === "label") {
      return parent.innerText.trim();
    }
    parent = parent.parentElement;
  }

  // 2. Check <label for="elementId">
  if (element.id) {
    const label = document.querySelector<HTMLLabelElement>(`label[for="${element.id}"]`);
    if (label) {
      return label.innerText.trim();
    }
  }

  // 3. Check aria-label or placeholder
  const ariaLabel = element.getAttribute("aria-label") || "";
  if (ariaLabel) return ariaLabel.trim();

  const placeholder = element.getAttribute("placeholder") || "";
  if (placeholder) return placeholder.trim();

  // 4. Try to find a nearby preceding text element
  const prev = element.previousElementSibling;
  if (prev && (prev.tagName.toLowerCase() === "span" || prev.tagName.toLowerCase() === "p" || prev.tagName.toLowerCase() === "label")) {
    return (prev as HTMLElement).innerText.trim();
  }

  return "";
}

export function mapFieldHeuristically(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  labelText: string
): MappedField["mappedType"] {
  const name = (element.name || "").toLowerCase();
  const id = (element.id || "").toLowerCase();
  const type = (element.type || "").toLowerCase();
  const placeholder = (element.getAttribute("placeholder") || "").toLowerCase();
  const label = labelText.toLowerCase();

  // 1. Resume Upload
  if (
    type === "file" ||
    name.includes("resume") ||
    name.includes("cv") ||
    label.includes("resume") ||
    label.includes("cv") ||
    placeholder.includes("resume") ||
    placeholder.includes("cv")
  ) {
    return "resume";
  }

  // 2. Email
  if (
    type === "email" ||
    name.includes("email") ||
    id.includes("email") ||
    label.includes("email") ||
    placeholder.includes("email")
  ) {
    return "email";
  }

  // 3. Phone
  if (
    type === "tel" ||
    name.includes("phone") ||
    name.includes("mobile") ||
    name.includes("tel") ||
    id.includes("phone") ||
    id.includes("mobile") ||
    label.includes("phone") ||
    label.includes("mobile") ||
    label.includes("telephone") ||
    placeholder.includes("phone") ||
    placeholder.includes("mobile")
  ) {
    return "phone";
  }

  // 4. LinkedIn
  if (
    name.includes("linkedin") ||
    id.includes("linkedin") ||
    label.includes("linkedin") ||
    placeholder.includes("linkedin")
  ) {
    return "linkedin";
  }

  // 5. Portfolio
  if (
    name.includes("portfolio") ||
    name.includes("website") ||
    name.includes("homepage") ||
    id.includes("portfolio") ||
    id.includes("website") ||
    label.includes("portfolio") ||
    label.includes("website") ||
    label.includes("personal site") ||
    placeholder.includes("portfolio") ||
    placeholder.includes("website")
  ) {
    return "portfolio";
  }

  // 6. Name
  if (
    name.includes("first_name") ||
    name.includes("firstname") ||
    id.includes("first_name") ||
    id.includes("firstname") ||
    label.includes("first name") ||
    placeholder.includes("first name")
  ) {
    return "firstName";
  }
  if (
    name.includes("last_name") ||
    name.includes("lastname") ||
    id.includes("last_name") ||
    id.includes("lastname") ||
    label.includes("last name") ||
    placeholder.includes("last name")
  ) {
    return "lastName";
  }
  if (
    name.includes("name") ||
    id.includes("name") ||
    label.includes("name") ||
    label.includes("full name") ||
    placeholder.includes("name") ||
    placeholder.includes("full name")
  ) {
    return "name";
  }

  return "unknown";
}

export async function scanPageForm(profile: UserProfile): Promise<{
  proposals: Array<{ tempId: string; labelText: string; mappedType: string; fillValue: string; tagName: string }>;
  highlighted: string[];
  skipped: string[];
}> {
  const proposals: Array<{ tempId: string; labelText: string; mappedType: string; fillValue: string; tagName: string }> = [];
  const highlighted: string[] = [];
  const skipped: string[] = [];

  // Select all form inputs
  const inputs = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      "input, textarea, select"
    )
  );

  const eligibleInputs = inputs.filter((input) => {
    // Skip hidden fields and buttons
    const type = input.getAttribute("type") || "";
    return !(type === "hidden" || type === "submit" || type === "button" || type === "checkbox" || type === "radio");
  });

  // Run heuristics first
  const heuristicMappings = eligibleInputs.map((input, idx) => {
    const labelText = getElementLabelText(input);
    const mappedType = mapFieldHeuristically(input, labelText);
    const tempId = `autofill-field-${idx}-${Date.now()}`;
    input.setAttribute("data-autofill-temp-id", tempId);
    return { input, labelText, mappedType, tempId };
  });

  // For fields that heuristics map to "unknown", use FormAgent (Gemini) fallback
  const unknownFields = heuristicMappings.filter((m) => m.mappedType === "unknown");

  if (unknownFields.length > 0) {
    // Serialize fields for FormAgent
    const formHtmlExcerpts = unknownFields.map((m) => {
      const idAttr = m.input.id ? ` id="${m.input.id}"` : "";
      const nameAttr = m.input.name ? ` name="${m.input.name}"` : "";
      const typeAttr = m.input.type ? ` type="${m.input.type}"` : "";
      const placeholderAttr = m.input.getAttribute("placeholder") ? ` placeholder="${m.input.getAttribute("placeholder")}"` : "";
      const labelStr = m.labelText ? ` label="${m.labelText}"` : "";
      return `<input data-autofill-temp-id="${m.input.getAttribute("data-autofill-temp-id")}"${idAttr}${nameAttr}${typeAttr}${placeholderAttr}${labelStr} />`;
    }).join("\n");

    try {
      // Send message to background to analyze fields
      const response = await chrome.runtime.sendMessage({
        type: "ANALYZE_FORM_FIELDS",
        formHtmlExcerpt: formHtmlExcerpts
      });

      if (response && response.ok && Array.isArray(response.mappings)) {
        response.mappings.forEach((mapping: { fieldId: string; mappedType: string }) => {
          const matched = unknownFields.find(
            (m) => m.input.getAttribute("data-autofill-temp-id") === mapping.fieldId
          );
          if (matched && isMappedType(mapping.mappedType) && mapping.mappedType !== "unknown") {
            matched.mappedType = mapping.mappedType;
          }
        });
      }
    } catch (err) {
      console.warn("FormAgent semantic match analysis failed, falling back to heuristics only.", err);
    }
  }

  // Resolve proposals based on the profile
  heuristicMappings.forEach(({ input, labelText, mappedType, tempId }) => {
    if (mappedType === "unknown") {
      skipped.push(`${labelText || input.name || input.id || "unlabeled"}`);
      input.removeAttribute("data-autofill-temp-id");
      return;
    }

    if (mappedType === "resume") {
      highlighted.push(`Resume file upload field`);
      proposals.push({
        tempId,
        labelText: labelText || "Resume Upload",
        mappedType: "resume",
        fillValue: "",
        tagName: input.tagName.toLowerCase()
      });
      return;
    }

    let fillValue = "";
    let fieldLabel = "";

    switch (mappedType) {
      case "email":
        fillValue = profile.email || "";
        fieldLabel = "Email Address";
        break;
      case "phone":
        fillValue = profile.phone || "";
        fieldLabel = "Phone Number";
        break;
      case "linkedin":
        fillValue = profile.linkedIn || "";
        fieldLabel = "LinkedIn Profile";
        break;
      case "portfolio":
        fillValue = profile.portfolio || "";
        fieldLabel = "Portfolio URL";
        break;
      case "name":
        fillValue = profile.name || "";
        fieldLabel = "Full Name";
        break;
      case "firstName":
        fillValue = profile.name ? profile.name.split(" ")[0] : "";
        fieldLabel = "First Name";
        break;
      case "lastName":
        if (profile.name) {
          const parts = profile.name.split(" ");
          fillValue = parts.length > 1 ? parts.slice(1).join(" ") : "";
        }
        fieldLabel = "Last Name";
        break;
    }

    if (fillValue) {
      proposals.push({
        tempId,
        labelText: labelText || fieldLabel,
        mappedType,
        fillValue,
        tagName: input.tagName.toLowerCase()
      });
    } else {
      skipped.push(`${fieldLabel || mappedType} (Profile field is empty)`);
      input.removeAttribute("data-autofill-temp-id");
    }
  });

  return { proposals, highlighted, skipped };
}

export function executeAutofill(
  proposals: Array<{ tempId: string; fillValue: string; mappedType: string; tagName: string }>
): number {
  let filledCount = 0;

  // Ensure highlight styling exists in document
  if (!document.getElementById("form-autofill-styles")) {
    const style = document.createElement("style");
    style.id = "form-autofill-styles";
    style.textContent = `
      .autofilled-field {
        outline: 2px solid #10b981 !important;
        outline-offset: 2px !important;
        background-color: rgba(16, 185, 129, 0.08) !important;
        transition: all 0.3s ease !important;
      }
      @keyframes pulse-blue {
        0% { outline-color: #3b82f6; }
        50% { outline-color: #10b981; }
        100% { outline-color: #3b82f6; }
      }
    `;
    document.head.appendChild(style);
  }

  proposals.forEach((prop) => {
    const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      `[data-autofill-temp-id="${prop.tempId}"]`
    );

    if (!input) return;

    if (prop.mappedType === "resume") {
      // Highlight the resume file input field
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.style.outline = "3px dashed #3b82f6";
      input.style.outlineOffset = "4px";
      input.style.animation = "pulse-blue 1.5s infinite";
      
      input.removeAttribute("data-autofill-temp-id");
      return;
    }

    // Set value based on element type
    if (input.tagName.toLowerCase() === "select") {
      const select = input as HTMLSelectElement;
      const options = Array.from(select.options);
      const valLower = prop.fillValue.toLowerCase();

      // Find the best option matching value or text
      const bestOption = options.find(
        (opt) =>
          opt.value.toLowerCase() === valLower ||
          opt.text.toLowerCase().includes(valLower)
      );

      if (bestOption) {
        select.value = bestOption.value;
      } else {
        select.value = prop.fillValue;
      }
    } else {
      input.value = prop.fillValue;
    }

    // Add visual highlight class
    input.classList.add("autofilled-field");

    // Dispatch modern framework input/change events
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));

    input.removeAttribute("data-autofill-temp-id");
    filledCount++;
  });

  return filledCount;
}

export function cancelAutofill(): void {
  const tagged = Array.from(document.querySelectorAll("[data-autofill-temp-id]"));
  tagged.forEach((el) => {
    el.removeAttribute("data-autofill-temp-id");
  });
}

export async function autofillPageForm(profile: UserProfile): Promise<{
  filled: string[];
  skipped: string[];
  highlighted: string[];
}> {
  const scanResult = await scanPageForm(profile);
  executeAutofill(scanResult.proposals);
  
  const filledNames = scanResult.proposals
    .filter((p) => p.mappedType !== "resume")
    .map((p) => p.labelText);
    
  return {
    filled: filledNames,
    skipped: scanResult.skipped,
    highlighted: scanResult.highlighted
  };
}
