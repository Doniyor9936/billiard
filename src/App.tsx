import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignInForm } from "./SignInForm";
import { SignOutButton } from "./SignOutButton";
import { Toaster } from "sonner";
import { BilliardDashboard } from "./components/BilliardDashboard";
import { CashbackView } from "./components/CashbackView";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { Wallet, LayoutDashboard } from "lucide-react";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm h-16 flex justify-between items-center border-b shadow-sm px-4">
          <h2 className="text-xl font-semibold text-blue-600">Billiardxona Admin Panel</h2>
          <Authenticated>
            <div className="flex items-center space-x-4">
              <UserInfo />
              <SignOutButton />
            </div>
          </Authenticated>
        </header>
        
        {/* Navigation Menu */}
        <Authenticated>
          <Navigation />
        </Authenticated>

        <main className="flex-1">
          <Content />
        </main>
        <Toaster />
      </div>
    </BrowserRouter>
  );
}

function Navigation() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex space-x-1">
          <Link
            to="/"
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              isActive("/")
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          
          <Link
            to="/cashback"
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              isActive("/cashback")
                ? "text-green-600 border-b-2 border-green-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            <Wallet className="w-5 h-5" />
            Cashback
          </Link>
        </div>
      </div>
    </nav>
  );
}

function UserInfo() {
  const user = useQuery(api.auth.loggedInUser);
  
  if (!user) return null;
  
  return (
    <div className="text-sm text-gray-600">
      <span className="font-medium">{user.email}</span>
    </div>
  );
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser);

  if (loggedInUser === undefined) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Authenticated>
        <Routes>
          <Route path="/" element={<BilliardDashboard />} />
          <Route path="/cashback" element={<CashbackView />} />
        </Routes>
      </Authenticated>
      
      <Unauthenticated>
        <div className="flex items-center justify-center min-h-[500px]">
          <div className="w-full max-w-md mx-auto p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Billiardxona Admin Panel
              </h1>
              <p className="text-gray-600">
                Faqat ruxsat berilgan adminlar kirishi mumkin
              </p>
            </div>
            <SignInForm />
          </div>
        </div>
      </Unauthenticated>
    </div>
  );
}