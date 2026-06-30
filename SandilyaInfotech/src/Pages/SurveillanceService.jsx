import React from 'react'
import TopBanner from '../Components/TopBanner'
import CompSurveillanceService from '../Components/CompSurveillanceService';
import RelatedCompSurveillanceService from '../Components/RelatedCompSurveillanceService';
import Footer from '../Components/Footer';

const SurveillanceService = () => {
  return (
    <>
        <TopBanner text="Surveillance"/>
        <CompSurveillanceService/>
        <RelatedCompSurveillanceService/>
        <Footer/>
    </>
  );
};

export default SurveillanceService
