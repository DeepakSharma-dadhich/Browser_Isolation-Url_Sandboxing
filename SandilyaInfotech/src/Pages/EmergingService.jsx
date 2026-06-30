import React from 'react'
import TopBanner from '../Components/TopBanner'
import GenerationService from '../Components/GenerationService';
import RelatedGenerationService from '../Components/RelatedGenerationService';
import Footer from '../Components/Footer';

const EmergingService = () => {
  return (
    <>
        <TopBanner text="Emerging Technology"/>
        <GenerationService/>
        <RelatedGenerationService/>
        <Footer/>
    </>
  );
};

export default EmergingService
