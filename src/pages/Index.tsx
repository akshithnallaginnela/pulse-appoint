import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-doctor.jpg";
import { Calendar, Clock, Shield, Heart, Users, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const Index = () => {
  const features = [
    {
      icon: Calendar,
      title: "Easy Booking",
      description: "Book appointments with top doctors in just a few clicks",
    },
    {
      icon: Clock,
      title: "24/7 Support",
      description: "Round-the-clock medical assistance whenever you need it",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your health data is encrypted and completely confidential",
    },
    {
      icon: Heart,
      title: "Quality Care",
      description: "Access to experienced doctors across various specialties",
    },
    {
      icon: Users,
      title: "Expert Doctors",
      description: "Connect with verified and highly-rated medical professionals",
    },
    {
      icon: Award,
      title: "Best Service",
      description: "Award-winning healthcare platform trusted by thousands",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-90" />
        <div className="container relative py-20 md:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-white">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                Your Health, Our Priority
              </h1>
              <p className="text-lg md:text-xl text-white/90 leading-relaxed">
                Book appointments with trusted doctors, manage your health records, and get expert care - all in one place.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/doctors">
                  <Button variant="hero" size="lg" className="w-full sm:w-auto bg-white text-primary hover:bg-white/90">
                    Find a Doctor
                  </Button>
                </Link>
                <Link to="/login?signup=true">
                  <Button variant="hero" size="lg" className="w-full sm:w-auto bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white/20">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-hover">
                <img
                  src={heroImage}
                  alt="Professional doctor"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 gradient-subtle">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Us</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience healthcare like never before with our comprehensive medical platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="shadow-card hover:shadow-hover transition-base">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold mb-2">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <Card className="overflow-hidden shadow-hover">
            <div className="gradient-hero p-12 text-center text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-lg mb-8 text-white/90 max-w-2xl mx-auto">
                Join thousands of patients who trust us with their healthcare needs
              </p>
              <Link to="/login?signup=true">
                <Button variant="hero" size="lg" className="bg-white text-primary hover:bg-white/90">
                  Create Your Account
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
