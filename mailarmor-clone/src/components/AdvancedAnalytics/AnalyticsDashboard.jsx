export default function AnalyticsDashboard() {
  return (
    <div className="rounded-3xl border border-[#DCE7F5] bg-white p-10 shadow-lg">

      <h3 className="text-3xl font-bold text-[#18335D]">
        AI Analytics Dashboard
      </h3>

      {/* NLP */}

      <div className="mt-5">
        <div className="mb-2 text-lg font-medium text-[#374151]">
          NLP Analysis
        </div>

        <div className="h-2 rounded-full bg-gray-200">
          <div className="h-2 w-[82%] rounded-full bg-gradient-to-r from-[#18335D] to-[#2563EB]" />
        </div>
      </div>

      {/* Social */}

      <div className="mt-5">
        <div className="mb-2 text-lg font-medium text-[#374151]">
          Social Graph
        </div>

        <div className="h-2 rounded-full bg-gray-200">
          <div className="h-2 w-[93%] rounded-full bg-gradient-to-r from-[#18335D] to-[#2563EB]" />
        </div>
      </div>

      {/* Behavioral */}

      <div className="mt-5">
        <div className="mb-2 text-lg font-medium text-[#374151]">
          Behavioral Analysis
        </div>

        <div className="h-2 rounded-full bg-gray-200">
          <div className="h-2 w-[75%] rounded-full bg-gradient-to-r from-[#18335D] to-[#2563EB]" />
        </div>
      </div>

    </div>
  );
}