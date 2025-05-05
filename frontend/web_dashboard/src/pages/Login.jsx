import React, { useEffect } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { motion } from "framer-motion";
import { LogIn } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleSuccess = (credentialResponse) => {
    if (credentialResponse.credential) {
      localStorage.setItem("token", credentialResponse.credential);
      const decodedUser = jwtDecode(credentialResponse.credential);
      localStorage.setItem("user", JSON.stringify(decodedUser));
      navigate("/dashboard");
    }
  };

  const handleError = () => {
    console.error("Login Failed");
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
      <motion.div
        className="w-full max-w-sm sm:max-w-md md:max-w-lg bg-gray-800 bg-opacity-50 backdrop-blur-md shadow-lg rounded-xl p-5 sm:p-8 border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex justify-center mb-4 sm:mb-6">
          <div className="p-2 sm:p-3 rounded-full bg-blue-600 bg-opacity-20">
            <LogIn size={24} className="text-blue-500 sm:w-8 sm:h-8" />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-2 sm:space-y-3"
        >
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-gray-100">
            Welcome Back
          </h2>
          <p className="text-sm sm:text-base text-center text-gray-300 mb-4 sm:mb-6">
            Sign in to continue to the vehicle monitoring dashboard
          </p>
        </motion.div>

        <motion.div
          className="flex justify-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <div className="google-login-wrapper w-full flex justify-center">
            <GoogleLogin
              onSuccess={handleSuccess}
              onError={handleError}
              useOneTap
              theme="filled_black"
              shape="pill"
              size="large"
              text="signin_with"
              width="100%"
              auto_select
            />
          </div>
        </motion.div>

        <motion.p
          className="text-gray-400 text-xs sm:text-sm text-center mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          Secure login powered by Google Authentication
        </motion.p>
      </motion.div>
    </div>
  );
};

export default Login;
