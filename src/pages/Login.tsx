import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stethoscope } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isSignup = searchParams.get("signup") === "true";
  const [activeTab, setActiveTab] = useState(isSignup ? "signup" : "login");
  const { login, register, registerDoctor, isLoading, error, clearError } = useAuth();

  // Form states
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [signupForm, setSignupForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
  });
  const [doctorForm, setDoctorForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    licenseNumber: "",
    specialization: "",
    experience: "",
    consultationFee: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginForm.email, loginForm.password);
      toast.success("Login successful!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Login failed");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupForm.password !== signupForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      await register(signupForm);
      toast.success("Registration successful!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Registration failed");
    }
  };

  const handleDoctorSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (doctorForm.password !== doctorForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      await registerDoctor(doctorForm);
      toast.success("Doctor registration successful!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Doctor registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center gradient-subtle p-4">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Stethoscope className="h-7 w-7 text-primary-foreground" />
          </div>
          <span className="text-2xl font-bold text-foreground">HealthCare</span>
        </Link>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
            <TabsTrigger value="doctor">Doctor</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input 
                      id="login-email" 
                      type="email" 
                      placeholder="you@example.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input 
                      id="login-password" 
                      type="password" 
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="remember" className="rounded" />
                      <label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                        Remember me
                      </label>
                    </div>
                    <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? "Signing In..." : "Sign In"}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Don't have an account?{" "}
                    <button onClick={() => setActiveTab("signup")} className="text-primary hover:underline">
                      Sign up
                    </button>
                  </p>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="signup">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Sign up to start booking appointments</CardDescription>
              </CardHeader>
              <form onSubmit={handleSignup}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first-name">First Name</Label>
                      <Input 
                        id="first-name" 
                        placeholder="John"
                        value={signupForm.firstName}
                        onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last-name">Last Name</Label>
                      <Input 
                        id="last-name" 
                        placeholder="Doe"
                        value={signupForm.lastName}
                        onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="you@example.com"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input 
                      id="phone" 
                      type="tel" 
                      placeholder="1234567890"
                      value={signupForm.phone}
                      onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-of-birth">Date of Birth</Label>
                    <Input 
                      id="date-of-birth" 
                      type="date"
                      value={signupForm.dateOfBirth}
                      onChange={(e) => setSignupForm({ ...signupForm, dateOfBirth: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <select 
                      id="gender"
                      className="w-full p-2 border rounded-md"
                      value={signupForm.gender}
                      onChange={(e) => setSignupForm({ ...signupForm, gender: e.target.value })}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input 
                      id="signup-password" 
                      type="password" 
                      placeholder="••••••••"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      placeholder="••••••••"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="terms" className="rounded" required />
                    <label htmlFor="terms" className="text-sm text-muted-foreground">
                      I agree to the{" "}
                      <Link to="/terms" className="text-primary hover:underline">
                        terms and conditions
                      </Link>
                    </label>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? "Creating Account..." : "Create Account"}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Already have an account?{" "}
                    <button onClick={() => setActiveTab("login")} className="text-primary hover:underline">
                      Sign in
                    </button>
                  </p>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="doctor">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Doctor Registration</CardTitle>
                <CardDescription>Join our network of medical professionals</CardDescription>
              </CardHeader>
              <form onSubmit={handleDoctorSignup}>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="doc-first-name">First Name</Label>
                      <Input 
                        id="doc-first-name" 
                        placeholder="Dr. John"
                        value={doctorForm.firstName}
                        onChange={(e) => setDoctorForm({ ...doctorForm, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="doc-last-name">Last Name</Label>
                      <Input 
                        id="doc-last-name" 
                        placeholder="Smith"
                        value={doctorForm.lastName}
                        onChange={(e) => setDoctorForm({ ...doctorForm, lastName: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-email">Email</Label>
                    <Input 
                      id="doc-email" 
                      type="email" 
                      placeholder="doctor@example.com"
                      value={doctorForm.email}
                      onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-phone">Phone</Label>
                    <Input 
                      id="doc-phone" 
                      type="tel" 
                      placeholder="1234567890"
                      value={doctorForm.phone}
                      onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-date-of-birth">Date of Birth</Label>
                    <Input 
                      id="doc-date-of-birth" 
                      type="date"
                      value={doctorForm.dateOfBirth}
                      onChange={(e) => setDoctorForm({ ...doctorForm, dateOfBirth: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-gender">Gender</Label>
                    <select 
                      id="doc-gender"
                      className="w-full p-2 border rounded-md"
                      value={doctorForm.gender}
                      onChange={(e) => setDoctorForm({ ...doctorForm, gender: e.target.value })}
                      required
                    >
                      <option value="">Select Gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license-number">Medical License Number</Label>
                    <Input 
                      id="license-number" 
                      placeholder="ML12345"
                      value={doctorForm.licenseNumber}
                      onChange={(e) => setDoctorForm({ ...doctorForm, licenseNumber: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization</Label>
                    <select 
                      id="specialization"
                      className="w-full p-2 border rounded-md"
                      value={doctorForm.specialization}
                      onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                      required
                    >
                      <option value="">Select Specialization</option>
                      <option value="Cardiologist">Cardiologist</option>
                      <option value="Pediatrician">Pediatrician</option>
                      <option value="Dermatologist">Dermatologist</option>
                      <option value="Orthopedic Surgeon">Orthopedic Surgeon</option>
                      <option value="General Physician">General Physician</option>
                      <option value="Neurologist">Neurologist</option>
                      <option value="Gynecologist">Gynecologist</option>
                      <option value="Psychiatrist">Psychiatrist</option>
                      <option value="Oncologist">Oncologist</option>
                      <option value="Radiologist">Radiologist</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="experience">Years of Experience</Label>
                    <Input 
                      id="experience" 
                      type="number" 
                      placeholder="5"
                      value={doctorForm.experience}
                      onChange={(e) => setDoctorForm({ ...doctorForm, experience: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consultation-fee">Consultation Fee (₹)</Label>
                    <Input 
                      id="consultation-fee" 
                      type="number" 
                      placeholder="500"
                      value={doctorForm.consultationFee}
                      onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-password">Password</Label>
                    <Input 
                      id="doc-password" 
                      type="password" 
                      placeholder="••••••••"
                      value={doctorForm.password}
                      onChange={(e) => setDoctorForm({ ...doctorForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="doc-confirm-password">Confirm Password</Label>
                    <Input 
                      id="doc-confirm-password" 
                      type="password" 
                      placeholder="••••••••"
                      value={doctorForm.confirmPassword}
                      onChange={(e) => setDoctorForm({ ...doctorForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="doc-terms" className="rounded" required />
                    <label htmlFor="doc-terms" className="text-sm text-muted-foreground">
                      I agree to the{" "}
                      <Link to="/terms" className="text-primary hover:underline">
                        terms and conditions
                      </Link>
                    </label>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                    {isLoading ? "Registering..." : "Register as Doctor"}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Already have an account?{" "}
                    <button onClick={() => setActiveTab("login")} className="text-primary hover:underline">
                      Sign in
                    </button>
                  </p>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Login;
