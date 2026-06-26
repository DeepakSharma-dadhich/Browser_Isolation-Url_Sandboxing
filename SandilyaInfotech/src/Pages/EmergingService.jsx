import React from 'react'
import TopBanner from '../Components/TopBanner'
import GenerationService from '../Components/GenerationService';
import RelatedGenerationService from '../Components/RelatedGenerationService';

const EmergingService = () => {
  return (
    <>
        <TopBanner text="Emerging Technology"/>
        <GenerationService/>
        <RelatedGenerationService/>
    </>
  );
};

export default EmergingService
