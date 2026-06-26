import React from 'react'
import TopBanner from '../Components/TopBanner'
import SystemIntegrationService from '../Components/SystemIntegrationService';
import RelatedIntegrationService from '../Components/RelatedIntegrationService';

const IntegrationService = () => {
  return (
    <>
        <TopBanner text="Integration"/>
        <SystemIntegrationService/>
        <RelatedIntegrationService/>
    </>
  );
};

export default IntegrationService
