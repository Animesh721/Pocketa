import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const dropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const hamburgerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
      // For mobile menu, check if click is outside both the menu and the hamburger button
      if (mobileMenuRef.current &&
          !mobileMenuRef.current.contains(event.target) &&
          hamburgerRef.current &&
          !hamburgerRef.current.contains(event.target)) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isActive = (path) => location.pathname === path;

  // PWA Install functionality
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      console.log('beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = (e) => {
      console.log('App installed successfully');
      setDeferredPrompt(null);
      // Optionally show success message
      setTimeout(() => {
        alert('🎉 Pocketa is now installed! You can access it from your home screen.');
      }, 1000);
    };

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isStandalone) {
      console.log('App is already installed');
    } else {
      // Install prompt will be available when needed
      console.log('App not installed, install prompt will be shown when available');
    }

    // Debug info
    console.log('PWA Install setup complete', {
      isStandalone,
      userAgent: navigator.userAgent,
      hasServiceWorker: 'serviceWorker' in navigator
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    try {
      // Check if already installed
      if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        alert('✅ Pocketa is already installed on your device!');
        return;
      }

      if (!deferredPrompt) {
        // Detect device and browser for specific instructions
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
        const isChrome = /Chrome/.test(navigator.userAgent);

        let instructions = `📱 Install Pocketa as an app:\n\n`;

        if (isIOS && isSafari) {
          instructions += `🍎 **Safari (iOS):**\n1. Tap the Share button (□↗) below\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" to install\n\n✨ You'll get app icon on home screen!`;
        } else if (isAndroid && isChrome) {
          instructions += `🤖 **Chrome (Android):**\n1. Tap the 3-dot menu (⋮) in top-right\n2. Select "Add to Home screen"\n3. Tap "Add" to install\n\n✨ You'll get app icon on home screen!`;
        } else {
          instructions += `🖥️ **Desktop:**\n1. Look for install icon (⊞) in address bar\n2. Or use browser menu → "Install Pocketa"\n\n📱 **Mobile:**\n- Chrome: Menu → "Add to Home screen"\n- Safari: Share → "Add to Home Screen"\n\n✨ Install for faster access and offline use!`;
        }

        alert(instructions);
        return;
      }

      // Use native install prompt
      console.log('Triggering install prompt...');
      deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;
      console.log('Install outcome:', outcome);

      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        // Show success message
        setTimeout(() => {
          alert('🎉 Pocketa installed successfully! Check your home screen.');
        }, 1000);
      }
    } catch (error) {
      console.error('Install error:', error);
      alert('Unable to install automatically. Please use your browser menu to add Pocketa to home screen.');
    }
  };

  const handleNavigation = (path) => {
    setShowProfileDropdown(false);
    navigate(path);
  };

  return (
    <nav className="bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-sm shadow-2xl border-b border-slate-700/50 fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/dashboard" className="flex items-center">
              <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Pocketa
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link
              to="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/dashboard')
                  ? 'text-blue-400 bg-blue-900/30 border border-blue-500/30'
                  : 'text-slate-300 hover:text-blue-400 hover:bg-slate-800/50'
              }`}
            >
              Dashboard
            </Link>

            <Link
              to="/allowance"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/allowance')
                  ? 'text-blue-400 bg-blue-900/30 border border-blue-500/30'
                  : 'text-slate-300 hover:text-blue-400 hover:bg-slate-800/50'
              }`}
            >
              Budget
            </Link>

            <Link
              to="/add-expense"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/add-expense')
                  ? 'text-blue-400 bg-blue-900/30 border border-blue-500/30'
                  : 'text-slate-300 hover:text-blue-400 hover:bg-slate-800/50'
              }`}
            >
              Add Expense
            </Link>

            <Link
              to="/advice"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/advice')
                  ? 'text-blue-400 bg-blue-900/30 border border-blue-500/30'
                  : 'text-slate-300 hover:text-blue-400 hover:bg-slate-800/50'
              }`}
            >
              AI Advice
            </Link>

            <Link
              to="/manage-essentials"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/manage-essentials')
                  ? 'text-blue-400 bg-blue-900/30 border border-blue-500/30'
                  : 'text-slate-300 hover:text-blue-400 hover:bg-slate-800/50'
              }`}
            >
              Essentials
            </Link>


            {/* Desktop User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center space-x-2 text-sm text-slate-300 hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-slate-800/50"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {(user?.name || 'U')[0].toUpperCase()}
                  </span>
                </div>
                <span className="hidden sm:block">{user?.name || 'User'}</span>
                <svg className={`w-4 h-4 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Desktop Dropdown Menu */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-56 bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-600/50 py-2 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-slate-600/50">
                    <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                    <p className="text-xs text-slate-400">{user?.email || 'user@example.com'}</p>
                  </div>

                  {/* Profile Actions */}
                  <div className="py-1">
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNavigation('/change-email');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Change Email
                    </div>

                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNavigation('/change-password');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Change Password
                    </div>

                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNavigation('/expense-report');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Expense Report
                    </div>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-slate-600/50 py-1">
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowProfileDropdown(false);
                        logout();
                        navigate('/login');
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button and profile */}
          <div className="lg:hidden flex items-center space-x-3">
            {/* Mobile Profile Avatar */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center text-sm text-slate-300 hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-slate-800/50"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {(user?.name || 'U')[0].toUpperCase()}
                  </span>
                </div>
              </button>

              {/* Mobile Profile Dropdown */}
              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-600/50 py-2 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-slate-600/50">
                    <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                    <p className="text-xs text-slate-400">{user?.email || 'user@example.com'}</p>
                  </div>

                  {/* Profile Actions */}
                  <div className="py-1">
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNavigation('/change-email');
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Change Email
                    </div>

                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNavigation('/change-password');
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Change Password
                    </div>

                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleNavigation('/expense-report');
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Expense Report
                    </div>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-slate-600/50 py-1">
                    <div
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowProfileDropdown(false);
                        logout();
                        navigate('/login');
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors cursor-pointer"
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Hamburger Menu Button */}
            <button
              ref={hamburgerRef}
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="text-slate-300 hover:text-blue-400 p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {showMobileMenu ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {showMobileMenu && (
          <div ref={mobileMenuRef} className="lg:hidden bg-slate-800/95 backdrop-blur-sm rounded-lg mt-2 mb-4 border border-slate-600/50 shadow-xl">
            <div className="px-2 pt-2 pb-3 space-y-1">

              <Link
                to="/dashboard"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  isActive('/dashboard')
                    ? 'text-blue-400 bg-blue-900/30 border border-blue-500/30'
                    : 'text-slate-300 hover:text-blue-400 hover:bg-slate-700/50'
                }`}
              >
                📊 Dashboard
              </Link>

              <Link
                to="/allowance"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  isActive('/allowance')
                    ? 'text-blue-400 bg-blue-900/30 border border-blue-500/30'
                    : 'text-slate-300 hover:text-blue-400 hover:bg-slate-700/50'
                }`}
              >
                💰 Budget
              </Link>

              <Link
                to="/add-expense"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  isActive('/add-expense')
                    ? 'text-blue-400 bg-blue-900/30 border border-blue-500/30'
                    : 'text-slate-300 hover:text-blue-400 hover:bg-slate-700/50'
                }`}
              >
                ➕ Add Expense
              </Link>

              <Link
                to="/advice"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  isActive('/advice')
                    ? 'text-blue-400 bg-blue-900/30 border border-blue-500/30'
                    : 'text-slate-300 hover:text-blue-400 hover:bg-slate-700/50'
                }`}
              >
                🤖 AI Advice
              </Link>

              <Link
                to="/manage-essentials"
                onClick={() => setShowMobileMenu(false)}
                className={`block px-3 py-3 rounded-md text-base font-medium transition-colors ${
                  isActive('/manage-essentials')
                    ? 'text-blue-400 bg-blue-900/30 border border-blue-500/30'
                    : 'text-slate-300 hover:text-blue-400 hover:bg-slate-700/50'
                }`}
              >
                🛒 Essentials
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;