import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DoctorCard from "@/components/DoctorCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

// Mock data - will be replaced with real data from backend
const mockDoctors = [
  {
    id: "1",
    name: "Dr. Sarah Johnson",
    specialty: "Cardiologist",
    experience: 15,
    location: "New York Medical Center",
    rating: 4.9,
    available: true,
  },
  {
    id: "2",
    name: "Dr. Michael Chen",
    specialty: "Pediatrician",
    experience: 12,
    location: "Children's Hospital",
    rating: 4.8,
    available: true,
  },
  {
    id: "3",
    name: "Dr. Emily Williams",
    specialty: "Dermatologist",
    experience: 10,
    location: "Skin Care Clinic",
    rating: 4.7,
    available: false,
  },
  {
    id: "4",
    name: "Dr. James Anderson",
    specialty: "Orthopedic Surgeon",
    experience: 18,
    location: "Orthopedic Center",
    rating: 4.9,
    available: true,
  },
  {
    id: "5",
    name: "Dr. Lisa Martinez",
    specialty: "General Physician",
    experience: 8,
    location: "Primary Care Clinic",
    rating: 4.6,
    available: true,
  },
  {
    id: "6",
    name: "Dr. Robert Taylor",
    specialty: "Neurologist",
    experience: 20,
    location: "Neurology Institute",
    rating: 4.9,
    available: true,
  },
];

const Doctors = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialty, setSelectedSpecialty] = useState("all");

  const specialties = ["all", "Cardiologist", "Pediatrician", "Dermatologist", "Orthopedic Surgeon", "General Physician", "Neurologist"];

  const filteredDoctors = mockDoctors.filter((doctor) => {
    const matchesSearch = doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doctor.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSpecialty = selectedSpecialty === "all" || doctor.specialty === selectedSpecialty;
    return matchesSearch && matchesSpecialty;
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 gradient-subtle">
        <div className="container py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">Find Your Doctor</h1>
            <p className="text-lg text-muted-foreground">
              Browse through our network of experienced medical professionals
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or specialty..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map((specialty) => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty === "all" ? "All Specialties" : specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Doctor Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doctor) => (
              <DoctorCard key={doctor.id} {...doctor} />
            ))}
          </div>

          {filteredDoctors.length === 0 && (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                No doctors found matching your criteria. Try adjusting your filters.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Doctors;
