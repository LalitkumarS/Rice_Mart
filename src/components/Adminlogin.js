// src/components/AdminLogin.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// Import the local image
import authImage from './auth.jpg';

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Real Firebase sign-in. Whether this user is actually allowed to see
  // admin data is enforced by the BACKEND (see backend/middleware/requireAdmin.js)
  // via the ADMIN_EMAILS allow-list — this form only authenticates the user,
  // it does not by itself grant admin access.
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/admin");
    } catch (err) {
      console.error("Admin login error:", err);
      setError("Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  const amberBoxShadow = "0px 0px 15px rgba(245, 158, 11, 0.5)";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-300 to-slate-500 p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex w-full max-w-4xl lg:max-w-5xl bg-slate-800 shadow-2xl rounded-xl overflow-hidden border-2 border-amber-500"
      >
        <div className="hidden lg:block lg:w-[55%] xl:w-3/5">
          <img
            src={authImage}
            alt="Admin Panel Visual"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="w-full lg:w-[45%] xl:w-2/5 p-6 sm:p-8 md:p-10 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-3xl font-bold text-center mb-8 text-amber-500">
              Admin Login
            </h2>
            {error && <p className="text-red-500 text-center mb-4 text-sm">{error}</p>}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="relative">
                <input
                  type="email"
                  className="w-full p-3.5 bg-gray-100 text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 transition duration-300 placeholder-gray-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Admin Email"
                  required
                />
              </div>
              <div className="relative">
                <input
                  type="password"
                  className="w-full p-3.5 bg-gray-100 text-gray-800 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 transition duration-300 placeholder-gray-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Admin Password"
                  required
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: amberBoxShadow }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={submitting}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-lg transition-all duration-300 transform shadow-md font-semibold uppercase tracking-wider disabled:opacity-60"
              >
                {submitting ? "Logging in..." : "Login"}
              </motion.button>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
