import { useState } from "react";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    company: "",
    phone: "",
    users: "",
    inquiry: "",
    message: "",
    agree: false,
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(formData.email)
    ) {
      newErrors.email = "Enter a valid email";
    }

    if (!formData.company.trim()) {
      newErrors.company = "Company Name is required";
    }

    // if (!formData.phone.trim()) {
    //   newErrors.phone = "Mobile Number is required";
    // } else if (!/^[6-9]\d{9}$/.test(formData.phone)) {
    //   newErrors.phone = "Enter a valid 10-digit mobile number";
    // }

    if (formData.phone.trim() && !/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = "Enter a valid 10-digit mobile number";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Message is required";
    }

    if (!formData.agree) {
      newErrors.agree = "Please accept the Privacy Policy";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) return;

    console.log(formData);

    alert("Form Submitted Successfully!");

    setFormData({
      fullName: "",
      email: "",
      company: "",
      phone: "",
      users: "",
      inquiry: "",
      message: "",
      agree: false,
    });

    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="mt-12">
      {/* Row 1 */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-semibold text-[#18335D]">
            Full Name <span className="text-red-500">*</span>
          </label>

          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            placeholder="John Doe"
            className="h-14 w-full rounded-xl border border-[#D9E2EC] px-4 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />

          {errors.fullName && (
            <p className="mt-1 text-sm text-red-500">{errors.fullName}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-semibold text-[#18335D]">
            Email Address <span className="text-red-500">*</span>
          </label>

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="john@example.com"
            className="h-14 w-full rounded-xl border border-[#D9E2EC] px-4 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />

          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>
      </div>

      {/* Row 2 */}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-semibold text-[#18335D]">
            Company Name <span className="text-red-500">*</span>
          </label>

          <input
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="ABC Pvt. Ltd."
            className="h-14 w-full rounded-xl border border-[#D9E2EC] px-4 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />

          {errors.company && (
            <p className="mt-1 text-sm text-red-500">{errors.company}</p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-semibold text-[#18335D]">
            Mobile Number
          </label>

          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="9876543210"
            className="h-14 w-full rounded-xl border border-[#D9E2EC] px-4 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          />

          {errors.phone && (
            <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
          )}
        </div>
      </div>

      {/* Row 3 */}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block font-semibold text-[#18335D]">
            Number of Users
          </label>

          <select
            name="users"
            value={formData.users}
            onChange={handleChange}
            className="h-14 w-full rounded-xl border border-[#D9E2EC] bg-white px-4 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          >
            <option value="">Select Users</option>
            <option>1 - 10</option>
            <option>11 - 25</option>
            <option>26 - 50</option>
            <option>51 - 100</option>
            <option>100+</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block font-semibold text-[#18335D]">
            Inquiry Type
          </label>

          <select
            name="inquiry"
            value={formData.inquiry}
            onChange={handleChange}
            className="h-14 w-full rounded-xl border border-[#D9E2EC] bg-white px-4 outline-none transition focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/10"
          >
            <option value="">Select Inquiry</option>
            <option>General Inquiry</option>
            <option>Sales</option>
            <option>Technical Support</option>
            <option>Partnership</option>
          </select>
        </div>
      </div>
      {/* Message */}
      <div className="mt-6">
        <label className="mb-2 block font-semibold text-[#18335D]">
          Message <span className="text-red-500">*</span>
        </label>

        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={6}
          placeholder="Tell us about your requirements..."
          className="
            w-full
            resize-none
            rounded-xl
            border
            border-[#D9E2EC]
            p-4
            outline-none
            transition
            focus:border-[#2563EB]
            focus:ring-4
            focus:ring-[#2563EB]/10
          "
        />

        {errors.message && (
          <p className="mt-1 text-sm text-red-500">{errors.message}</p>
        )}
      </div>

      {/* Privacy Policy */}
      <div className="mt-6">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="agree"
            checked={formData.agree}
            onChange={handleChange}
            className="mt-1 h-5 w-5 accent-[#2563EB]"
          />

          <span className="text-sm leading-6 text-[#64748B]">
            I agree to the Privacy Policy and consent to being contacted by
            ArkMail regarding my inquiry. <span className="text-red-500">*</span>
          </span>
        </label>

        {errors.agree && (
          <p className="mt-2 text-sm text-red-500">{errors.agree}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="
          mt-8
          w-full
          rounded-xl
          bg-[#18335D]
          py-4
          text-lg
          font-semibold
          text-white
          transition-all
          duration-300
          hover:bg-[#2563EB]
          hover:shadow-lg
        "
      >
        Send Message
      </button>
    </form>
  );
}
