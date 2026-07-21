import { useEffect, useState } from "react";

const words = [
  "Phishing Attacks",
  "Invoice Fraud",
  "BEC Threats",
  "Malware",
  "Impersonation",
];

export default function HeroHeading() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer;
    const currentWord = words[wordIndex];

    if (!isDeleting) {
      
      if (displayText.length < currentWord.length) {
        timer = setTimeout(() => {
          setDisplayText(currentWord.slice(0, displayText.length + 1));
        }, 80);
      } else {
        
        timer = setTimeout(() => setIsDeleting(true), 1800);
      }
    } else {
      
      if (displayText.length > 0) {
        timer = setTimeout(() => {
          setDisplayText(currentWord.slice(0, displayText.length - 1));
        }, 40); 
      } else {
        
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % words.length);
      }
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, wordIndex]);

  return (
    <div className="mt-2">
      
      <h1 className="font-extrabold leading-[1.2] tracking-[-2px] text-white">
        
        
        <span className="block text-[52px] min-h-[65px]">
          Stop{" "}
          <span className="animated-gradient">
            {displayText}
          </span>
          <span className="typing-cursor animate-pulse text-[#3B82F6]">|</span>
        </span>

        <span className="block text-[52px]">
          Before They Reach
        </span>
      </h1>

      
      <div className="mt-5 h-[4px] w-[180px] rounded-full bg-gradient-to-r from-[#3B82F6] via-[#06B6D4] to-transparent" />
    </div>
  );
}
