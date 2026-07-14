import React, { useEffect } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import Navbar from "./Components/Navbar/Navbar";
import ScrollToTopRoute from "./Components/ScrollToTopRoute";

// Pages
import Home from "./Pages/Home";
import About from "./Pages/About";
import Services from "./Pages/Services";
import Solutions from "./Pages/Solutions";
import Contact from "./Pages/Contact";
import EnterpriseSolution from "./Pages/EnterpriseSolution";
import CloudSolution from "./Pages/CloudSolution";
import CybersecuritySolution from "./Pages/CybersecuritySolution";
import DigitalSolution from "./Pages/DigitalSolution";
import DisasterSolution from "./Pages/DisasterSolution";
import ManagedSolution from "./Pages/ManagedSolution";
import InfrastructureService from "./Pages/InfrastructureService";
import IntegrationService from "./Pages/IntegrationService";
import SurveillanceService from "./Pages/SurveillanceService";
import EmergingService from "./Pages/EmergingService";
import ConsultingService from "./Pages/ConsultingService";
import SolutionDesignService from "./Pages/SolutionDesignService";
import ManagedService from "./Pages/ManagedService";

// AOS
import AOS from "aos";
import "aos/dist/aos.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <Home />
      </>
    ),
  },
  {
    path: "/about",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <About />
      </>
    ),
  },
  {
    path: "/services",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <Services />
      </>
    ),
  },
  {
    path: "/infrastructure-service",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <InfrastructureService />
      </>
    ),
  },
  {
    path: "/integration-service",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <IntegrationService />
      </>
    ),
  },
  {
    path: "/surveillance-service",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <SurveillanceService />
      </>
    ),
  },
  {
    path: "/emerging-service",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <EmergingService />
      </>
    ),
  },
  {
    path: "/consulting-service",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <ConsultingService />
      </>
    ),
  },
  {
    path: "/solutiondesign-service",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <SolutionDesignService/>
      </>
    ),
  },
  {
    path: "/managed-service",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <ManagedService/>
      </>
    ),
  },
  {
    path: "/solutions",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <Solutions />
      </>
    ),
  },
  {
    path: "/contact",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <Contact />
      </>
    ),
  },

  {
    path: "/enterprise-solution",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <EnterpriseSolution />
      </>
    ),
  },
  {
    path: "/cloud-solution",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <CloudSolution />
      </>
    ),
  },
  {
    path: "/cybersecurity-solution",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <CybersecuritySolution />
      </>
    ),
  },
  {
    path: "/digital-solution",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <DigitalSolution />
      </>
    ),
  },
  {
    path: "/disaster-solution",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <DisasterSolution />
      </>
    ),
  },
  {
    path: "/managed-solution",
    element: (
      <>
        <ScrollToTopRoute />
        <Navbar />
        <ManagedSolution />
      </>
    ),
  },
]);

const App = () => {
  useEffect(() => {
    AOS.init({
    duration: 700,
    once: true,
    offset: 50,
    // disable: "mobile",
  });
  }, []);

  return <RouterProvider router={router} />;
};

export default App;