"use client";

import { useAccessibility } from "@/components/AccessibilityProvider";

interface NavbarProps {
  user: {
    email?: string;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const { highContrast, largeFont, toggleHighContrast, toggleLargeFont } = useAccessibility();

  return (
    <nav className="bg-white shadow-sm border-b transition-colors duration-200 navbar-hc">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900 title-hc">
              SIKAD v4.0
            </h1>
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold badge-hc">
              Web Panel
            </span>
          </div>

          {/* Right Controls Section */}
          <div className="flex items-center gap-6">
            {/* Accessibility Toggles */}
            <div className="flex items-center gap-2 border-r pr-4 border-gray-200 accessibility-container">
              {/* Text Size Toggle */}
              <button
                onClick={toggleLargeFont}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-all duration-200 flex items-center gap-1 ${
                  largeFont
                    ? "bg-primary-600 text-white border-primary-600 font-bold"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                }`}
                title="Perbesar ukuran tulisan untuk kenyamanan membaca"
              >
                <span className="text-sm">A<sup>+</sup></span>
                Teks Besar
              </button>

              {/* High Contrast Toggle */}
              <button
                onClick={toggleHighContrast}
                className={`px-3 py-1.5 rounded text-xs font-medium border transition-all duration-200 flex items-center gap-1.5 ${
                  highContrast
                    ? "bg-black text-white border-black font-bold"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                }`}
                title="Aktifkan mode kontras tinggi hitam-putih"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="w-3.5 h-3.5"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a10 10 0 0 0 0 20V2z" fill="currentColor" />
                </svg>
                Kontras Tinggi
              </button>
            </div>

            {/* User Account / Logout */}
            {user ? (
              <div className="flex items-center gap-4 user-menu">
                <span className="text-sm text-gray-600 font-medium user-email">
                  {user.email}
                </span>
                <form action="/auth/signout" method="post">
                  <button
                    type="submit"
                    className="text-sm font-semibold text-red-600 hover:text-red-800 transition-colors py-1 px-2.5 rounded hover:bg-red-50 btn-logout"
                  >
                    Logout
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
}
