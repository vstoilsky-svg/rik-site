import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import SeoHead from "./components/SeoHead";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Catalog from "./pages/Catalog";
import "./theme.css";
import "./layout.css";
import "./catalog.css";
import "./rich.css";
import "./rik-20260722-fixes.css";
import "./home-sections.css";
import ChatWidget from "./components/ChatWidget.jsx";
import NotFound from "./pages/NotFound";

const ProductPage = lazy(() => import("./pages/ProductPage"));
const RequestForm = lazy(() => import("./pages/RequestForm"));
const Services = lazy(() => import("./pages/Services"));
const Contacts = lazy(() => import("./pages/Contacts"));
const About = lazy(() => import("./pages/About"));
const ForDesigners = lazy(() => import("./pages/ForDesigners"));
const ForContractors = lazy(() => import("./pages/ForContractors"));
const Projects = lazy(() => import("./pages/Projects"));
const Certificates = lazy(() => import("./pages/Certificates"));
const Questionnaires = lazy(() => import("./pages/Questionnaires"));
const Requisites = lazy(() => import("./pages/Requisites"));
const Privacy = lazy(() => import("./pages/Privacy"));
const News = lazy(() => import("./pages/News"));
const Careers = lazy(() => import("./pages/Careers"));
const Recommendations = lazy(() => import("./pages/Recommendations"));
const BimLibrary = lazy(() => import("./pages/BimLibrary"));
const TechSheets = lazy(() => import("./pages/TechSheets"));
const CentralSectionPage = lazy(() => import("./pages/CentralSectionPage"));
const Production = lazy(() => import("./pages/Production"));

function Layout() {
  return (
    <>
      <Header />
      <main><Outlet /></main>
      <Footer />
      <ChatWidget />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SeoHead />
      <ScrollToTop />
      <Suspense fallback={<div className="container section-body" role="status">Загрузка…</div>}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="/products" element={<Catalog />} />
            <Route path="/production" element={<Production />} />
            <Route path="/product/centralnye-ustanovki/:section" element={<CentralSectionPage />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/designers" element={<ForDesigners />} />
            <Route path="/certificates" element={<Certificates />} />
            <Route path="/questionnaires" element={<Questionnaires />} />
            <Route path="/bim" element={<BimLibrary />} />
            <Route path="/tehlisty" element={<TechSheets />} />
            <Route path="/requisites" element={<Requisites />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/news" element={<News />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/contractors" element={<ForContractors />} />
            <Route path="/services" element={<Services />} />
            <Route path="/about" element={<About />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/request" element={<RequestForm />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
