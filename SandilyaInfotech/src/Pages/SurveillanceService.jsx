import React from 'react'
import TopBanner from '../Components/TopBanner'
import CompSurveillanceService from '../Components/CompSurveillanceService';
import RelatedCompSurveillanceService from '../Components/RelatedCompSurveillanceService';

const SurveillanceService = () => {
  return (
    <>
        <TopBanner text="Surveillance"/>
        <CompSurveillanceService/>
        <RelatedCompSurveillanceService/>
    </>
  );
};

export default SurveillanceService
