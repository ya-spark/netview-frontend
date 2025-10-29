import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "@/utils/testing"; // Ensure TestingUtils is available in console

createRoot(document.getElementById("root")!).render(<App />);
