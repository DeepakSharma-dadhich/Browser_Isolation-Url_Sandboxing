import React from 'react'
import TopBanner from '../Components/TopBanner';
import ManagedPageService from '../Components/ManagedPageService';
import Footer from '../Components/Footer';

const ManagedService = () => {
  return (
    <>
        <TopBanner text='Managed Service'/>
        <ManagedPageService/>
        <Footer/>
    </>
  );
};

export default ManagedService
