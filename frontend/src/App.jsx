import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import JobFeed from "./pages/JobFeed.jsx";
import JobDetail from "./pages/JobDetail.jsx";
import Applications from "./pages/Applications.jsx";
import Skills from "./pages/Skills.jsx";
import Analyze from "./pages/Analyze.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/jobs" replace />} />
        <Route path="/jobs" element={<JobFeed />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/analyze" element={<Analyze />} />
      </Routes>
    </BrowserRouter>
  );
}
