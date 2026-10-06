import { Routes, Route } from "react-router";
import Layout from "@/components/Layout";
import Home from "./pages/Home";
import MapPage from "./pages/MapPage";
import Library from "./pages/Library";
import SpeciesDetail from "./pages/SpeciesDetail";
import Contribute from "./pages/Contribute";
import Forum, { ForumDetail } from "./pages/Forum";
import Stats from "./pages/Stats";
import Dashboard from "./pages/Dashboard";
import Identify from "./pages/Identify";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/harita" element={<MapPage />} />
        <Route path="/kutuphane" element={<Library />} />
        <Route path="/tur/:id" element={<SpeciesDetail />} />
        <Route path="/katki" element={<Contribute />} />
        <Route path="/tanit" element={<Identify />} />
        <Route path="/forum" element={<Forum />} />
        <Route path="/forum/:id" element={<ForumDetail />} />
        <Route path="/veri" element={<Stats />} />
        <Route path="/panel" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/login" element={<Login />} />
    </Routes>
  );
}
