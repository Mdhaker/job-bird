import { Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import ScanJobs from "@/pages/ScanJobs";
import Results from "@/pages/Results";
import Accounts from "@/pages/Accounts";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/scan-jobs" element={<ScanJobs />} />
        <Route path="/results" element={<Results />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}
