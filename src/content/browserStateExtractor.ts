import type { BrowserStateModel } from "../shared/types/messages";

function getElementSelector(el: Element): string {
  if (!el) return "";
  if (el.id) return `#${el.id}`;
  if (el.tagName.toLowerCase() === "body") return "body";
  if (el.tagName.toLowerCase() === "html") return "html";

  const classList = Array.from(el.classList).filter(c => !c.includes("hover") && !c.includes("active") && !c.includes("focus"));
  if (classList.length > 0) {
    const selector = `${el.tagName.toLowerCase()}.${classList[0]}`;
    try {
      if (document.querySelectorAll(selector).length === 1) {
        return selector;
      }
    } catch (e) {}
  }

  let path = [];
  let current: Element | null = el;
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let selector = current.nodeName.toLowerCase();
    if (current.id) {
      selector += `#${current.id}`;
      path.unshift(selector);
      break;
    } else {
      let sibling = current.previousElementSibling;
      let nth = 1;
      while (sibling) {
        if (sibling.nodeName.toLowerCase() === current.nodeName.toLowerCase()) {
          nth++;
        }
        sibling = sibling.previousElementSibling;
      }
      selector += `:nth-of-type(${nth})`;
    }
    path.unshift(selector);
    current = current.parentElement;
  }
  return path.join(" > ");
}

function detectWebsite(): string {
  const host = window.location.host.toLowerCase();
  if (host.includes("linkedin.com")) return "LinkedIn";
  if (host.includes("mail.google.com")) return "Gmail";
  if (host.includes("github.com")) return "GitHub";
  if (host.includes("indeed.com")) return "Indeed";
  if (host.includes("leetcode.com")) return "LeetCode";
  if (host.includes("notion.so")) return "Notion";
  return "Generic";
}

function detectPageType(website: string): string {
  const path = window.location.pathname;
  const hash = window.location.hash;

  if (website === "LinkedIn") {
    if (path.startsWith("/in/") || path.includes("/profile/")) return "profile";
    if (path.startsWith("/jobs/")) return "job_details";
    if (path.startsWith("/messaging/")) return "messaging";
    if (path.startsWith("/notifications/")) return "notifications";
    if (path.startsWith("/feed/")) return "feed";
    if (path.includes("/search/")) return "search_results";
    return "general";
  }

  if (website === "Gmail") {
    if (hash.includes("#inbox/")) return "email_thread";
    if (hash.includes("#inbox")) return "inbox";
    if (document.querySelector(".dw")) return "compose";
    return "general";
  }

  if (website === "GitHub") {
    if (path.includes("/issues/new") || path.includes("/edit/") || path.includes("/new/")) return "editor";
    if (/\/issues\/\d+/.test(path)) return "issue_details";
    if (/\/pull\/\d+/.test(path)) return "pull_request_details";
    if (path.includes("/issues")) return "issues_list";
    if (path.split("/").filter(Boolean).length === 2) return "repo_home";
    return "general";
  }

  if (website === "Indeed") {
    if (path.includes("/jobs") || path.includes("/q-")) return "search_results";
    if (path.includes("/viewjob")) return "job_details";
    return "general";
  }

  if (website === "LeetCode") {
    if (path.includes("/problems/")) return "problem_solve";
    if (path.includes("/problemset/")) return "problem_list";
    return "general";
  }

  if (website === "Notion") {
    if (document.querySelector(".notion-database-container")) return "database_view";
    if (document.querySelector(".notion-scroller")) return "document_editor";
    return "general";
  }

  return "general";
}

function getVisibleComponents(website: string): string[] {
  const components: string[] = [];
  const isVisible = (selector: string) => {
    try {
      const el = document.querySelector(selector);
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== "none";
    } catch {
      return false;
    }
  };

  if (website === "LinkedIn") {
    if (isVisible(".global-nav")) components.push("Global Navigation Bar");
    if (isVisible(".pv-profile-card")) components.push("Profile Card Section");
    if (isVisible("#experience")) components.push("Experience Section");
    if (isVisible("#about")) components.push("About Section");
    if (isVisible(".jobs-search-box")) components.push("Jobs Search Box");
    if (isVisible(".jobs-description")) components.push("Job Description Details");
    if (isVisible(".jobs-search-results")) components.push("Jobs Search Results List");
    if (isVisible(".msg-overlay-list-bubble")) components.push("Collapsed Chat Overlay");
    if (isVisible(".msg-overlay-conversation-bubble")) components.push("Active Chat Overlay Bubble");
    if (isVisible(".msg-thread__list")) components.push("Messaging Chat List");
    if (isVisible(".feed-shared-update-v2")) components.push("LinkedIn Main Feed");
  } else if (website === "Gmail") {
    if (isVisible("div[role='navigation']")) components.push("Left Sidebar Menu");
    if (isVisible("table.F")) components.push("Email Inbox List");
    if (isVisible(".adn")) components.push("Open Email Thread View");
    if (isVisible(".dw")) components.push("Compose Email Window");
  } else if (website === "GitHub") {
    if (isVisible(".repo-navigation")) components.push("Repository Navigation Tabs");
    if (isVisible(".react-directory-table")) components.push("Repository File Directory");
    if (isVisible("article.markdown-body")) components.push("Readme File Preview");
    if (isVisible(".js-issues-results")) components.push("Issues List Table");
    if (isVisible(".js-issue-title")) components.push("Open Issue Title & Comments Section");
  } else if (website === "Indeed") {
    if (isVisible("#jobsearch")) components.push("Job Search Inputs Header");
    if (isVisible(".jobsearch-ResultsList")) components.push("Search Results Jobs Sidebar");
    if (isVisible("#jobDescriptionText")) components.push("Right Side Job Description Panel");
  } else if (website === "LeetCode") {
    if (isVisible("[data-track-load='description_content']")) components.push("Problem Description Pane");
    if (isVisible(".monaco-editor")) components.push("Monaco Code Workspace");
    if (isVisible(".result-container__2354")) components.push("Submissions/Run Output Drawer");
  } else if (website === "Notion") {
    if (isVisible(".notion-sidebar")) components.push("Notion Sidebar Navigation");
    if (isVisible(".notion-topbar")) components.push("Notion Topbar Breadcrumbs");
    if (isVisible(".notion-page-content")) components.push("Notion Page Workspace Block Editor");
    if (isVisible(".notion-database-container")) components.push("Notion Database Table View");
  } else {
    if (isVisible("header")) components.push("Page Header");
    if (isVisible("nav")) components.push("Navigation Links Menu");
    if (isVisible("aside") || isVisible(".sidebar")) components.push("Sidebar Layout");
    if (isVisible("footer")) components.push("Page Footer");
    if (isVisible("main") || isVisible("#content")) components.push("Main Content Container");
  }
  return components;
}

function getNavigationElements(website: string): Array<{ text: string; selector: string; type: string }> {
  const elements: Array<{ text: string; selector: string; type: string }> = [];
  const added = new Set<string>();

  const addElement = (el: HTMLElement, type: string) => {
    try {
      const text = el.innerText.replace(/\s+/g, " ").trim();
      if (!text || text.length > 50) return;
      const selector = getElementSelector(el);
      if (added.has(selector)) return;
      added.add(selector);
      elements.push({ text, selector, type });
    } catch {}
  };

  const isVisible = (el: HTMLElement): boolean => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== "none";
  };

  if (website === "LinkedIn") {
    const navs = document.querySelectorAll<HTMLElement>(".global-nav__primary-link, .artdeco-pagination__button, .jobs-search-results-list__list-item");
    navs.forEach(el => { if (isVisible(el)) addElement(el, "LinkedIn Nav Link"); });
  } else if (website === "Gmail") {
    const navs = document.querySelectorAll<HTMLElement>(".TN.bmo.anY, .amD.Hl, div[role='button'][data-tooltip='Older']");
    navs.forEach(el => { if (isVisible(el)) addElement(el, "Gmail Folder/Nav"); });
  } else if (website === "GitHub") {
    const navs = document.querySelectorAll<HTMLElement>(".UnderlineNav-item, .react-directory-row a, a.pagination-item");
    navs.forEach(el => { if (isVisible(el)) addElement(el, "GitHub Repo Link"); });
  } else if (website === "Indeed") {
    const navs = document.querySelectorAll<HTMLElement>(".pagination-list a, .css-1m4a96x a");
    navs.forEach(el => { if (isVisible(el)) addElement(el, "Indeed Jobs Link"); });
  } else if (website === "LeetCode") {
    const navs = document.querySelectorAll<HTMLElement>(".mr-4.text-sm, .next-btn, .prev-btn");
    navs.forEach(el => { if (isVisible(el)) addElement(el, "LeetCode Action Button"); });
  } else if (website === "Notion") {
    const navs = document.querySelectorAll<HTMLElement>(".notion-sidebar a, .notion-topbar a");
    navs.forEach(el => { if (isVisible(el)) addElement(el, "Notion Navigation Link"); });
  } else {
    const links = document.querySelectorAll<HTMLElement>("nav a, header a, a.pagination-link, a.next, a.prev");
    links.forEach(el => { if (isVisible(el)) addElement(el, "Generic Link"); });
  }
  return elements.slice(0, 15);
}

function getPrimaryActions(website: string): Array<{ text: string; selector: string; description: string }> {
  const actions: Array<{ text: string; selector: string; description: string }> = [];
  const added = new Set<string>();

  const addAction = (el: HTMLElement, description: string) => {
    try {
      const text = el.innerText.replace(/\s+/g, " ").trim() || el.getAttribute("aria-label") || "";
      if (!text) return;
      const selector = getElementSelector(el);
      if (added.has(selector)) return;
      added.add(selector);
      actions.push({ text, selector, description });
    } catch {}
  };

  const isVisible = (el: HTMLElement): boolean => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== "none";
  };

  if (website === "LinkedIn") {
    const elements = document.querySelectorAll<HTMLElement>(".jobs-apply-button, .jobs-save-button, button[aria-label^='Connect'], button[aria-label^='Message'], button[aria-label^='Follow'], .msg-form__send-button, .share-box-feed-entry__trigger");
    elements.forEach(el => { if (isVisible(el)) addAction(el, "LinkedIn Action"); });
  } else if (website === "Gmail") {
    const elements = document.querySelectorAll<HTMLElement>(".T-I-KE, .ams.bkH, .T-I.J-J5-Ji.aoO, .ar9.T-I-J4");
    elements.forEach(el => { if (isVisible(el)) addAction(el, "Gmail Action"); });
  } else if (website === "GitHub") {
    const elements = document.querySelectorAll<HTMLElement>(".btn-primary, a[href$='/issues/new'], button[data-confirm-text]");
    elements.forEach(el => { if (isVisible(el)) addAction(el, "GitHub Primary Button"); });
  } else if (website === "Indeed") {
    const elements = document.querySelectorAll<HTMLElement>("#indeedApplyButton, .ia-IndeedApplyButton, .jobsearch-JobInfoHeader-button");
    elements.forEach(el => { if (isVisible(el)) addAction(el, "Indeed Job Application Button"); });
  } else if (website === "LeetCode") {
    const elements = document.querySelectorAll<HTMLElement>("[data-cy='submit-code-btn'], [data-cy='run-code-btn']");
    elements.forEach(el => { if (isVisible(el)) addAction(el, "LeetCode Run/Submit"); });
  } else if (website === "Notion") {
    const elements = document.querySelectorAll<HTMLElement>(".notion-collection-view-select button, .notion-topbar-share-button");
    elements.forEach(el => { if (isVisible(el)) addAction(el, "Notion Action Button"); });
  } else {
    const buttons = document.querySelectorAll<HTMLElement>("button, input[type='submit'], [role='button'], a.btn, a.button");
    buttons.forEach(el => {
      if (!isVisible(el)) return;
      const text = (el.innerText || el.getAttribute("aria-label") || "").toLowerCase();
      const matchWord = ["submit", "apply", "save", "send", "login", "register", "create", "delete", "download", "pay", "checkout", "search"].some(word => text.includes(word));
      if (matchWord) {
        addAction(el, "Generic Page Action");
      }
    });
  }
  return actions.slice(0, 10);
}

function getCurrentDialogs(): Array<{ text: string; selector: string; visible: boolean }> {
  const dialogs: Array<{ text: string; selector: string; visible: boolean }> = [];
  const isVisible = (el: HTMLElement): boolean => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== "none";
  };

  const selectors = [
    "[role='dialog']",
    "[role='alertdialog']",
    ".artdeco-modal",
    ".msg-overlay-conversation-bubble",
    ".notion-peek-renderer",
    ".modal",
    ".popup",
    ".dialog"
  ];

  selectors.forEach(sel => {
    try {
      document.querySelectorAll<HTMLElement>(sel).forEach(el => {
        if (isVisible(el)) {
          const text = el.innerText.substring(0, 100).replace(/\s+/g, " ").trim();
          dialogs.push({ text, selector: getElementSelector(el), visible: true });
        }
      });
    } catch {}
  });

  return dialogs;
}

function getCurrentForms(): Array<{ selector: string; inputs: Array<{ name: string; type: string; selector: string; placeholder: string; value: string }> }> {
  const forms: Array<{ selector: string; inputs: Array<{ name: string; type: string; selector: string; placeholder: string; value: string }> }> = [];
  const isVisible = (el: HTMLElement): boolean => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== "none";
  };

  const collectInputsFromContainer = (container: HTMLElement) => {
    const inputs: Array<{ name: string; type: string; selector: string; placeholder: string; value: string }> = [];
    const inputElems = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");
    
    inputElems.forEach(inp => {
      try {
        if (!isVisible(inp)) return;
        const type = inp.tagName.toLowerCase() === "input" ? (inp as HTMLInputElement).type : inp.tagName.toLowerCase();
        const placeholder = inp.getAttribute("placeholder") || "";
        const name = inp.getAttribute("name") || inp.getAttribute("aria-label") || placeholder || "";
        inputs.push({
          name,
          type,
          selector: getElementSelector(inp),
          placeholder,
          value: inp.value || ""
        });
      } catch {}
    });
    return inputs;
  };

  try {
    const formElems = document.querySelectorAll<HTMLElement>("form, div.form, section.form, .artdeco-modal");
    formElems.forEach(form => {
      if (!isVisible(form)) return;
      const inputs = collectInputsFromContainer(form);
      if (inputs.length > 0) {
        forms.push({
          selector: getElementSelector(form),
          inputs
        });
      }
    });

    if (forms.length === 0) {
      const bodyInputs = collectInputsFromContainer(document.body);
      if (bodyInputs.length > 0) {
        forms.push({
          selector: "body",
          inputs: bodyInputs
        });
      }
    }
  } catch {}

  return forms;
}

export function extractBrowserStateModel(): BrowserStateModel {
  const website = detectWebsite();
  const pageType = detectPageType(website);
  const visibleComponents = getVisibleComponents(website);
  const navigationElements = getNavigationElements(website);
  const primaryActions = getPrimaryActions(website);
  const currentDialogs = getCurrentDialogs();
  const currentForms = getCurrentForms();
  
  const scrollPosition = {
    x: window.scrollX || window.pageXOffset || 0,
    y: window.scrollY || window.pageYOffset || 0,
    maxScrollX: (document.documentElement.scrollWidth - window.innerWidth) || 0,
    maxScrollY: (document.documentElement.scrollHeight - window.innerHeight) || 0
  };

  const selectedText = window.getSelection()?.toString() ?? "";
  const focusedEl = document.activeElement;
  let focusedElement = null;
  if (focusedEl && focusedEl.tagName.toLowerCase() !== "body") {
    focusedElement = {
      tagName: focusedEl.tagName,
      id: focusedEl.id || "",
      className: focusedEl.className || "",
      selector: getElementSelector(focusedEl)
    };
  }

  const availableBrowserActions = getAvailableBrowserActions(website, pageType);

  return {
    currentWebsite: website,
    currentUrl: window.location.href,
    currentPageType: pageType,
    visibleComponents,
    navigationElements,
    primaryActions,
    currentDialogs,
    currentForms,
    currentScrollPosition: scrollPosition,
    selectedText,
    focusedElement,
    availableBrowserActions
  };
}

function getAvailableBrowserActions(website: string, pageType: string): string[] {
  const actions = ["click_element", "fill_input", "scroll_page", "extract_text", "navigate_page", "handle_modal"];
  if (website === "LinkedIn" || website === "Indeed") {
    actions.push("upload_resume");
    actions.push("handle_pagination");
  }
  if (website === "Gmail") {
    actions.push("download_file");
  }
  return actions;
}
