import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppointments } from "@/contexts/AppointmentsContext";
import React, { useEffect } from "react";

const Appointments = () => {
  const { appointments, fetchAppointments, isLoading, cancelAppointment, rescheduleAppointment } = useAppointments();
  const [rescheduleId, setRescheduleId] = React.useState<string | null>(null);
  const [newDate, setNewDate] = React.useState("");
  const [newTime, setNewTime] = React.useState("");
  const [actionLoading, setActionLoading] = React.useState(false);

  useEffect(() => {
    fetchAppointments();
  }, []);

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
            {isLoading && <p>Loading appointments...</p>}
            {!isLoading && appointments.length > 0 && appointments.map((appointment) => (
              <Card key={appointment._id} className="shadow-card hover:shadow-hover transition-base">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">
                          {appointment.doctorId?.userId
                            ? `Dr. ${appointment.doctorId.userId.firstName} ${appointment.doctorId.userId.lastName}`
                            : 'Doctor'}
                        </CardTitle>
                        {appointment.doctorId?.specialization && (
                          <p className="text-sm text-muted-foreground">
                            {appointment.doctorId.specialization}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">Fee: ₹{appointment.doctorId?.consultationFee}</p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        appointment.status === "confirmed"
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
                      <span className="text-sm">{new Date(appointment.appointmentDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-sm">{appointment.appointmentTime}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span className="text-sm">{appointment.reason}</span>
                    </div>
                  </div>
                  {appointment.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRescheduleId(appointment._id)}
                        disabled={actionLoading}
                      >
                        Reschedule
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              // Check if appointment was booked within 12 hours
                              const bookingTime = new Date(appointment.createdAt);
                              const now = new Date();
                              const hoursSinceBooking = (now.getTime() - bookingTime.getTime()) / (1000 * 60 * 60);
                              if (hoursSinceBooking < 12) {
                                // Show warning and prevent cancellation
                                return;
                              }
                            }}
                            disabled={actionLoading}
                          >
                            Cancel
                          </Button>
                        </AlertDialogTrigger>
                        {(() => {
                          const bookingTime = new Date(appointment.createdAt);
                          const now = new Date();
                          const hoursSinceBooking = (now.getTime() - bookingTime.getTime()) / (1000 * 60 * 60);
                          const canCancel = hoursSinceBooking >= 12;

                          return canCancel ? (
                            <>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Appointment</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this appointment? Any applicable refund will be processed according to our cancellation policy.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>No, keep appointment</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={async () => {
                                      setActionLoading(true);
                                      try {
                                        await cancelAppointment(appointment._id);
                                        await fetchAppointments();
                                      } catch (err) {
                                        // Optionally show error
                                      } finally {
                                        setActionLoading(false);
                                      }
                                    }}
                                  >
                                    Yes, cancel appointment
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </>
                          ) : (
                            <>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cannot Cancel Appointment</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Appointments cannot be cancelled within 12 hours of booking. Please wait until {new Date(bookingTime.getTime() + 12 * 60 * 60 * 1000).toLocaleString()} before attempting to cancel.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogAction>I understand</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </>
                          );
                        })()}
                      </AlertDialog>
                    </div>
                  )}
      {/* Reschedule Modal */}
      {rescheduleId && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-xl font-bold mb-4">Reschedule Appointment</h2>
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">New Date</label>
              <input
                type="date"
                className="border rounded px-2 py-1 w-full"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">New Time</label>
              <input
                type="time"
                className="border rounded px-2 py-1 w-full"
                value={newTime}
                onChange={e => setNewTime(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={async () => {
                  setActionLoading(true);
                  try {
                    await rescheduleAppointment(rescheduleId, newDate, newTime);
                    await fetchAppointments();
                    setRescheduleId(null);
                    setNewDate("");
                    setNewTime("");
                  } catch (err) {
                    // Optionally show error
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading || !newDate || !newTime}
              >
                Confirm
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setRescheduleId(null);
                  setNewDate("");
                  setNewTime("");
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
                </CardContent>
              </Card>
            ))}
          </div>

          {!isLoading && appointments.length === 0 && (
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
