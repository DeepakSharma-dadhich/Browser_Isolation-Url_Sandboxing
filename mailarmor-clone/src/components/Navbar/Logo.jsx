// import logo from "../../assets/logos/Logo.png";

// export default function Logo() {
//   return (
//     <a href="/" className="flex flex-col justify-center">
//       <img
//         src={logo}
//         alt="ArcMail"
//         className="h-[20px] w-auto"
//       />

//       <span className="ml-[58px] mt-1 text-[12px] font-medium text-[#6B7280]">
//         by Sandilya Infotech
//       </span>
//     </a>
//   );
// }

import logo from "../../assets/logos/Logo.png";

export default function Logo() {
  return (
    <a href="/" className="flex flex-col justify-center">
      <img
        src={logo}
        alt="ArcMail by Sandilya Infotech"
        className="h-[76px] w-auto" 
      />
    </a>
  );
}
