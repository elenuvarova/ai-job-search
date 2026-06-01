import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import JobFeed from "./pages/JobFeed.jsx";
import JobDetail from "./pages/JobDetail.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/jobs" replace />} />
        <Route path="/jobs" element={<JobFeed />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
