export default function ComparisonTable({
  title,
  headers,
  rows,
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#D8E4F2] bg-white shadow-xl">

      <div className="bg-[#18335D] py-6 text-center">
        <h3 className="text-3xl font-bold text-white">
          {title}
        </h3>
      </div>

      <table className="w-full border-collapse">

        <thead>
          <tr className="bg-[#F8FAFC]">
            {headers.map((item, index) => (
              <th
                key={item}
                className={`
                  border border-[#E5E7EB]
                  px-6
                  py-5
                  text-left
                  text-[15px]
                  font-bold
                  ${
                    index === 1
                      ? "bg-[#18335D] text-white"
                      : "text-[#18335D]"
                  }
                `}
              >
                {item}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="hover:bg-[#F8FBFF]"
            >
              {row.map((cell, index) => (
                <td
                  key={index}
                  className={`
                    border
                    border-[#E5E7EB]
                    px-6
                    py-5
                    text-[15px]

                    ${
                      index === 0
                        ? "font-semibold text-[#18335D]"
                        : ""
                    }

                    ${
                      index === 1
                        ? "bg-[#F4F8FF] font-semibold text-[#18335D]"
                        : "text-[#64748B]"
                    }
                  `}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>

      </table>

    </div>
  );
}