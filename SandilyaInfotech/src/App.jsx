import React, { useEffect } from "react";
import Navbar from "./Components/Navbar/Navbar";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

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

import ScrollToTop from "react-scroll-to-top";

// AOS
import AOS from "aos";
import "aos/dist/aos.css";


// Routes
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <>
        <Navbar />
        <Home />
      </>
    ),
  },
  {
    path: "/about",
    element: (
      <>
        <Navbar />
        <About />
      </>
    ),
  },
  {
    path: "/services",
    element: (
      <>
        <Navbar />
        <Services />
      </>
    ),
  },
  {
    path: "/infrastructure-service",
    element: (
      <>
        <Navbar />
        <InfrastructureService/>
      </>
    ),
  },
  {
    path: "/integration-service",
    element: (
      <>
        <Navbar />
        <IntegrationService/>
      </>
    ),
  },
  {
    path: "/surveillance-service",
    element: (
      <>
        <Navbar />
        <SurveillanceService/>
      </>
    ),
  },
  {
    path: "/emerging-service",
    element: (
      <>
        <Navbar />
        <EmergingService/>
      </>
    ),
  },
  {
    path: "/consulting-service",
    element: (
      <>
        <Navbar />
        <ConsultingService/>
      </>
    ),
  },
  {
    path: "/solutions",
    element: (
      <>
        <Navbar />
        <Solutions />
      </>
    ),
  },
  {
    path: "/enterprise-solution",
    element: (
      <>
        <Navbar />
        <EnterpriseSolution />
      </>
    ),
  },
  {
    path: "/cloud-solution",
    element: (
      <>
        <Navbar />
        <CloudSolution />
      </>
    ),
  },
  {
    path: "/cybersecurity-solution",
    element: (
      <>
        <Navbar />
        <CybersecuritySolution />
      </>
    ),
  },
  {
    path: "/digital-solution",
    element: (
      <>
        <Navbar />
        <DigitalSolution />
      </>
    ),
  },
  {
    path: "/disaster-solution",
    element: (
      <>
        <Navbar />
        <DisasterSolution />
      </>
    ),
  },
  {
    path: "/managed-solution",
    element: (
      <>
        <Navbar />
        <ManagedSolution />
      </>
    ),
  },
  {
    path: "/contact",
    element: (
      <>
        <Navbar />
        <Contact />
      </>
    ),
  },
]);

const App = () => {
  useEffect(() => {
    AOS.init({
      duration: 700, // fast animation
      delay: 0,
      easing: "ease-out",
      once: true,
      offset: 50,
    });
  }, []);

  return (
    <>
      <RouterProvider router={router} />

      <ScrollToTop
        smooth
        style={{
          backgroundColor: "#0086df",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "4px",
          width: "32px",
          height: "32px",
        }}
        component={
          <svg
            className="w-[14px] h-[14px] text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 15.75l7.5-7.5 7.5 7.5"
            />
          </svg>
        }
      />
    </>
  );
};

export default App;
