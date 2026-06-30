import React from 'react'
import TopBanner from '../Components/TopBanner'
import SystemIntegrationService from '../Components/SystemIntegrationService';
import RelatedIntegrationService from '../Components/RelatedIntegrationService';
import Footer from '../Components/Footer';

const IntegrationService = () => {
  return (
    <>
        <TopBanner text="Integration"/>
        <SystemIntegrationService/>
        <RelatedIntegrationService/>
        <Footer/>
    </>
  );
};

export default IntegrationService
