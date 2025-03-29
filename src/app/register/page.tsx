"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Register() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would typically save the user profile to Firebase
    // For now, we'll just redirect to home
    router.push("/");
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white items-center justify-center">
      <div className="w-full max-w-md p-8 space-y-8">
        <h1 className="text-4xl font-bold text-center mb-8">Complete Your Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-800 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white rounded-full px-8 py-3 hover:bg-blue-700 transition-colors"
          >
            Complete Registration
          </button>
        </form>
      </div>
    </div>
  );
}