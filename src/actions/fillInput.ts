export function fillInput(selector: string, value: string): boolean {
  const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector);
  if (input) {
    input.scrollIntoView({ behavior: "smooth", block: "center" });
    
    if (input.tagName.toLowerCase() === "select") {
      const select = input as HTMLSelectElement;
      const options = Array.from(select.options);
      const valLower = value.toLowerCase();
      
      const bestOption = options.find(
        (opt) =>
          opt.value.toLowerCase() === valLower ||
          opt.text.toLowerCase().includes(valLower)
      );

      if (bestOption) {
        select.value = bestOption.value;
      } else {
        select.value = value;
      }
    } else {
      input.value = value;
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  return false;
}
