// import { Link } from "react-router-dom";

// export default function ResourceColumn({ title, links }) {
//   return (
//     <div>
//       <h3 className="mb-8 text-[20px] font-bold uppercase text-[#18335D]">
//         {title}
//       </h3>

//       <div className="space-y-5">
//         {links.map((link) => (
//           <Link
//             key={link.url}
//             to={link.url}
//             className="block text-[18px] text-[#64748B] hover:text-[#2563EB] hover:underline"
//           >
//             {link.label}
//           </Link>
//         ))}
//       </div>
//     </div>
//   );
// }


export default function ResourceColumn({ title, links }) {
  return (
    <div>
      <h3 className="mb-4 text-[15px] font-bold uppercase text-[#18335D]">
        {title}
      </h3>

      <div className="space-y-2">
        {links.map((link) => (
          <button
            key={link}
            type="button"
            className="
              block
              text-left
              text-[15px]
              text-[#64748B]
              transition
              hover:text-[#2563EB]
              hover:underline
            "
          >
            {link}
          </button>
        ))}
      </div>
    </div>
  );
}