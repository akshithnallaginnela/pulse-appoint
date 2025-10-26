import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User } from "lucide-react";

// Mock appointments data
const mockAppointments = [
  {
    id: "1",
    doctorName: "Dr. Sarah Johnson",
    specialty: "Cardiologist",
    date: "2025-11-05",
    time: "10:00 AM",
    location: "New York Medical Center",
    status: "upcoming",
  },
  {
    id: "2",
    doctorName: "Dr. Michael Chen",
    specialty: "Pediatrician",
    date: "2025-10-28",
    time: "2:30 PM",
    location: "Children's Hospital",
    status: "completed",
  },
];

const Appointments = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 gradient-subtle">
        <div className="container py-12">
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">My Appointments</h1>
            <p className="text-lg text-muted-foreground">
              View and manage your upcoming and past appointments
            </p>
          </div>

          <div className="space-y-6">
            {mockAppointments.map((appointment) => (
              <Card key={appointment.id} className="shadow-card hover:shadow-hover transition-base">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">{appointment.doctorName}</CardTitle>
                        <p className="text-sm text-muted-foreground">{appointment.specialty}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        appointment.status === "upcoming"
                          ? "bg-accent/10 text-accent border-accent/20"
                          : "bg-muted text-muted-foreground"
                      }
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-sm">{new Date(appointment.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm">{appointment.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm">{appointment.location}</span>
                    </div>
                  </div>
                  {appointment.status === "upcoming" && (
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Reschedule</Button>
                      <Button variant="destructive" size="sm">Cancel</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {mockAppointments.length === 0 && (
            <Card className="shadow-card text-center py-12">
              <CardContent>
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg text-muted-foreground mb-4">
                  You don't have any appointments yet
                </p>
                <Button>Find a Doctor</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Appointments;
