import React from "react";
import { createRoot } from "react-dom/client";
import { ChatWindow } from "../components/chat/ChatWindow";
import "./styles.css";

const rootElement = document.getElementById("sidebar-root");

if (!rootElement) {
  throw new Error("Sidebar root element was not found.");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <ChatWindow />
  </React.StrictMode>
);
