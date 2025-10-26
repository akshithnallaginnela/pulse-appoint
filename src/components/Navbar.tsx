import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, Stethoscope, User } from "lucide-react";

const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Stethoscope className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">HealthCare</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          <Link to="/doctors" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-base">
            Find Doctors
          </Link>
          <Link to="/appointments" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-base">
            My Appointments
          </Link>
          <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-base">
            About
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" size="sm">
              <User className="mr-2 h-4 w-4" />
              Login
            </Button>
          </Link>
          <Link to="/login?signup=true">
            <Button size="sm">Sign Up</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
