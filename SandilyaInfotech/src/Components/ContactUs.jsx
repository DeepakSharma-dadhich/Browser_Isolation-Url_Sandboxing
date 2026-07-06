import React, { useState } from "react";
import contactImg from "../assets/contact.png";

const ContactUs = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    project: "",
    subject: "",
    message: "",
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData({
      ...formData,
      [name]: value,
    });

    let newErrors = { ...errors };

    // Full Name
    if (name === "fullName") {
      if (value !== "" && !/^[A-Za-z ]+$/.test(value.trim())) {
        newErrors.fullName = "Please enter a valid name";
      } else {
        delete newErrors.fullName;
      }
    }

    // Email
    if (name === "email") {
      if (
        value !== "" &&
        !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(value.trim())
      ) {
        newErrors.email = "Please enter a valid email address";
      } else {
        delete newErrors.email;
      }
    }

    // Phone
    if (name === "phone") {
      if (value !== "" && !/^[0-9]{10}$/.test(value.trim())) {
        newErrors.phone = "Please enter a valid 10-digit mobile number";
      } else {
        delete newErrors.phone;
      }
    }

    // Message
    if (name === "message") {
      if (value !== "" && value.trim().length < 5) {
        newErrors.message = "Please enter at least 5 characters";
      } else {
        delete newErrors.message;
      }
    }

    setErrors(newErrors);
  };

  const validate = () => {
    let newErrors = {};

    if (
      formData.fullName.trim() === "" ||
      !/^[A-Za-z ]+$/.test(formData.fullName.trim())
    ) {
      newErrors.fullName = "Please enter a valid name";
    }

    if (
      formData.phone.trim() === "" ||
      !/^[6-9]\d{9}$/.test(formData.phone.trim())
    ) {
      newErrors.phone = "Please enter a valid 10-digit Indian mobile number";
    }

    if (
      formData.phone.trim() === "" ||
      !/^[0-9]{10}$/.test(formData.phone.trim())
    ) {
      newErrors.phone = "Please enter a valid 10-digit mobile number";
    }

    if (formData.message.trim().length < 5) {
      newErrors.message = "Please enter your message";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // const handleSubmit = (e) => {
  //   e.preventDefault();

  //   if (!validate()) return;

  //   setStatus("sending");

  //   setTimeout(() => {
  //     setStatus("success");

  //     setFormData({
  //       fullName: "",
  //       email: "",
  //       phone: "",
  //       project: "",
  //       subject: "",
  //       message: "",
  //     });

  //     setTimeout(() => {
  //       setStatus("");
  //     }, 3000);
  //   }, 1500);
  // };

  // const handleSubmit = async (e) => {
  //   e.preventDefault();

  //   if (!validate()) return;

  //   setStatus("sending");

  //   try {
  //     const templateParams = {
  //       fullName: formData.fullName,
  //       email: formData.email,
  //       phone: formData.phone,
  //       project: formData.project,
  //       subject: formData.subject,
  //       message: formData.message,
  //       time: new Date().toLocaleString(),
  //     };
  //     console.log("Service ID:", import.meta.env.VITE_EMAILJS_SERVICE_ID);
  //     console.log(
  //       "Template ID:",
  //       import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID,
  //     );
  //     console.log("Public Key:", import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

  //     await emailjs.send(
  //       import.meta.env.VITE_EMAILJS_SERVICE_ID,
  //       import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID,
  //       templateParams,
  //       import.meta.env.VITE_EMAILJS_PUBLIC_KEY,
  //     );

  //     setStatus("success");

  //     setFormData({
  //       fullName: "",
  //       email: "",
  //       phone: "",
  //       project: "",
  //       subject: "",
  //       message: "",
  //     });

  //     setTimeout(() => {
  //       setStatus("");
  //     }, 3000);
  //   } catch (error) {
  //     console.log(error);
  //     console.log("STATUS:", error.status);
  //     console.log("TEXT:", error.text);
  //     setStatus("error");
  //   }
  // };

  const handleSubmit = async (e) => {
  e.preventDefault();

  if (!validate()) return;

  setStatus("sending");

  try {
    const response = await fetch("http://localhost:8000/contact.php", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const result = await response.json();

    if (result.success) {
      setStatus("success");

      setFormData({
        fullName: "",
        email: "",
        phone: "",
        project: "",
        subject: "",
        message: "",
      });

      setTimeout(() => {
        setStatus("");
      }, 3000);
    } else {
      console.log(result.message);
      setStatus("error");
    }
  } catch (err) {
    console.log(err);
    setStatus("error");
  }
};

  return (
    <section className="bg-white py-16">
      <div className="container mx-auto px-8 md:px-12 lg:px-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Side Image */}
          <div data-aos="fade-right" data-aos-duration="700">
            <img
              src={contactImg}
              alt="Contact Us"
              className="w-full max-w-md object-contain"
            />
          </div>

          {/* Right Side Form */}
          <div data-aos="fade-left" data-aos-duration="700">
            <h2 className="text-3xl font-bold text-slate-900 mb-8">
              Contact Us
            </h2>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Row 1 */}
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter your name"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                  />

                  {errors.fullName && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                  />

                  {errors.email && (
                    <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                  )}
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>

                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                  />

                  {errors.phone && (
                    <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm text-gray-600 mb-2">
                    Project
                  </label>

                  <input
                    type="text"
                    name="project"
                    value={formData.project}
                    onChange={handleChange}
                    placeholder="Project name"
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Subject
                </label>

                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="Enter subject"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Message <span className="text-red-500">*</span>
                </label>

                <textarea
                  rows="5"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Write your message..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 resize-none focus:outline-none focus:border-blue-600"
                ></textarea>

                {errors.message && (
                  <p className="text-red-500 text-sm mt-1">{errors.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg transition duration-300"
              >
                Submit
              </button>

              {/* Status Messages */}
              {status === "sending" && (
                <div className="bg-blue-100 text-blue-700 border border-blue-300 rounded-lg px-4 py-3">
                  Sending message...
                </div>
              )}

              {status === "success" && (
                <div className="bg-green-100 text-green-700 border border-green-300 rounded-lg px-4 py-3">
                  Message sent successfully!
                </div>
              )}
              {status === "error" && (
                <div className="bg-red-100 text-red-700 border border-red-300 rounded-lg px-4 py-3">
                  Failed to send message. Please try again.
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactUs;
