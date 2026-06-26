import React from 'react'
import TopBanner from '../Components/TopBanner'
import NetworkSolution from '../Components/NetworkSolution'
import WebSolution from '../Components/WebSolution'
import EmailSolution from '../Components/EmailSolution'
import CloudSecSolution from '../Components/CloudSecSolution'

const CybersecuritySolution = () => {
  return (
    <>
        <TopBanner text="Cybersecurity Solution"/>
        <NetworkSolution/>
        <WebSolution/>
        <EmailSolution/>
        <CloudSecSolution/>
    </>
  )
}

export default CybersecuritySolution
