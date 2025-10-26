import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DoctorCard from "@/components/DoctorCard";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, Filter, Loader2 } from "lucide-react";
import { useAppointments } from "@/contexts/AppointmentsContext";
import { toast } from "sonner";

const Doctors = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("all");
  const [sortBy, setSortBy] = useState("rating");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  
  const { 
    doctors, 
    specializations, 
    isLoading, 
    error, 
    pagination,
    fetchDoctors, 
    fetchSpecializations,
    clearError 
  } = useAppointments();

  useEffect(() => {
    fetchSpecializations();
  }, []);

  useEffect(() => {
    const params = {
      page: currentPage,
      limit: 12,
      search: searchTerm || undefined,
      specialization: selectedSpecialization !== "all" ? selectedSpecialization : undefined,
      sortBy,
      sortOrder,
    };
    
    fetchDoctors(params);
  }, [searchTerm, selectedSpecialization, sortBy, sortOrder, currentPage]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleSpecializationChange = (value: string) => {
    setSelectedSpecialization(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: string) => {
    const [field, order] = value.split("-");
    setSortBy(field);
    setSortOrder(order);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg text-red-600 mb-4">{error}</p>
            <Button onClick={clearError}>Try Again</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

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
          <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or specialty..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedSpecialization} onValueChange={handleSpecializationChange}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="Select specialty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Specialties</SelectItem>
                  {specializations.map((specialty) => (
                    <SelectItem key={specialty} value={specialty}>
                      {specialty}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={handleSortChange}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating-desc">Rating (High to Low)</SelectItem>
                  <SelectItem value="rating-asc">Rating (Low to High)</SelectItem>
                  <SelectItem value="experience-desc">Experience (High to Low)</SelectItem>
                  <SelectItem value="experience-asc">Experience (Low to High)</SelectItem>
                  <SelectItem value="fee-desc">Fee (High to Low)</SelectItem>
                  <SelectItem value="fee-asc">Fee (Low to High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Loading doctors...</span>
            </div>
          )}

          {/* Doctor Grid */}
          {!isLoading && (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {doctors.map((doctor) => (
                  <DoctorCard 
                    key={doctor._id} 
                    id={doctor._id}
                    name={`${doctor.userId.firstName} ${doctor.userId.lastName}`}
                    specialty={doctor.specialization}
                    experience={doctor.experience}
                    location={`${doctor.userId.firstName}'s Clinic`}
                    rating={doctor.rating.average}
                    available={doctor.isVerified && doctor.isActive}
                    image={doctor.userId.profileImage}
                    consultationFee={doctor.consultationFee}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              )}

              {/* No Results */}
              {doctors.length === 0 && !isLoading && (
                <div className="text-center py-12">
                  <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg text-muted-foreground mb-4">
                    No doctors found matching your criteria
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search filters or browse all doctors
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => {
                      setSearchTerm("");
                      setSelectedSpecialization("all");
                      setCurrentPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Doctors;
