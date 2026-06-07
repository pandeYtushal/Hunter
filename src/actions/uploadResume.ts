export function uploadResume(): boolean {
  const fileInputs = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="file"]'));
  if (fileInputs.length > 0) {
    // Inject pulse-blue styles if not present
    if (!document.getElementById("upload-autofill-styles")) {
      const style = document.createElement("style");
      style.id = "upload-autofill-styles";
      style.textContent = `
        @keyframes pulse-blue {
          0% { outline-color: #3b82f6; }
          50% { outline-color: #10b981; }
          100% { outline-color: #3b82f6; }
        }
      `;
      document.head.appendChild(style);
    }

    fileInputs.forEach((input) => {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      input.style.outline = "3px dashed #3b82f6";
      input.style.outlineOffset = "4px";
      input.style.animation = "pulse-blue 1.5s infinite";
    });
    return true;
  }
  return false;
}
