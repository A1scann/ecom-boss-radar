import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { ShortlistProvider } from "@/store/shortlist";
import Dashboard from "./pages/Dashboard";
import NicheRadar from "./pages/NicheRadar";
import SubNicheDetail from "./pages/SubNicheDetail";
import ProductFinder from "./pages/ProductFinder";
import ScoringEngine from "./pages/ScoringEngine";
import OfferAngles from "./pages/OfferAngles";
import CompetitorSpy from "./pages/CompetitorSpy";
import Shortlist from "./pages/Shortlist";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ShortlistProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/niches" element={<NicheRadar />} />
              <Route path="/niches/:id" element={<SubNicheDetail />} />
              <Route path="/products" element={<ProductFinder />} />
              <Route path="/scoring" element={<ScoringEngine />} />
              <Route path="/angles" element={<OfferAngles />} />
              <Route path="/spy" element={<CompetitorSpy />} />
              <Route path="/shortlist" element={<Shortlist />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ShortlistProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
