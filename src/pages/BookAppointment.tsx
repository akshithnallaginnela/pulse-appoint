import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { doctorsAPI } from '@/services/api';
import { useAppointments } from '@/contexts/AppointmentsContext';
import { toast } from 'sonner';

const BookAppointment: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { bookAppointment } = useAppointments();

  const [doctorName, setDoctorName] = useState('');
  const [consultationFee, setConsultationFee] = useState<number | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [doctor, setDoctor] = useState<any>(null);

  useEffect(() => {
    const loadDoctor = async () => {
      if (!id) return;
      try {
        const res = await doctorsAPI.getDoctor(id);
        if (res && res.doctor) {
          setDoctor(res.doctor);
          setDoctorName(`${res.doctor.userId?.firstName || ''} ${res.doctor.userId?.lastName || ''}`.trim() || res.doctor.userId?.email || 'Doctor');
          setConsultationFee(res.doctor.consultationFee ?? null);
        }
      } catch (err) {
        console.error('Failed to load doctor', err);
        toast.error('Failed to load doctor information');
      }
    };

    loadDoctor();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!date || !time) {
      toast.error('Please select date and time');
      return;
    }
    
    // Validate date is not in the past
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        toast.error('Appointment date cannot be in the past');
        return;
      }
      
      // Check doctor's availability first
      if (!doctor) {
        toast.error('Doctor information not found');
        return;
      }

      // Get the day name in lowercase (monday, tuesday, etc.)
      const dayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const availability = doctor.availability?.[dayName];

      if (!availability || !availability.isAvailable) {
        toast.error(`Doctor is not available on ${dayName}`);
        return;
      }

      // Check if the selected time is within the doctor's working hours
      const [hours, minutes] = time.split(':').map(Number);
      const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

      if (!availability.startTime || !availability.endTime) {
        toast.error('Doctor\'s working hours are not set for this day');
        return;
      }

      // Compare time strings directly
      if (timeStr < availability.startTime || timeStr >= availability.endTime) {
        toast.error(`Doctor is only available between ${availability.startTime} and ${availability.endTime} on ${dayName}`);
        return;
      }

      // Check break time if it exists
      if (availability.breakStartTime && availability.breakEndTime) {
        if (timeStr >= availability.breakStartTime && timeStr < availability.breakEndTime) {
          toast.error(`Doctor is on break between ${availability.breakStartTime} and ${availability.breakEndTime}`);
          return;
        }
      }    // Validate date is not more than 3 months in future
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    
    if (selectedDate > threeMonthsFromNow) {
      toast.error('Appointments cannot be scheduled more than 3 months in advance');
      return;
    }
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for the appointment');
      return;
    }

    setLoading(true);

    try {
      // Format date as ISO8601 and ensure time is in HH:MM format
      const formattedDate = new Date(date).toISOString().split('T')[0];
      // Ensure time is in HH:MM format and valid
      const [hours, minutes] = time.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        toast.error('Invalid time format. Please use HH:MM format (24-hour)');
        return;
      }
      const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      const appointmentData = {
        doctorId: id,
        appointmentDate: formattedDate,
        appointmentTime: formattedTime,
        reason: reason.trim() || 'General consultation',
        consultationType: 'in-person' // Add default consultation type
      };

      const appointment = await bookAppointment(appointmentData);

      toast.success('Appointment booked successfully');
      navigate('/appointments');
    } catch (err: any) {
      console.error('Booking failed', err);
      toast.error(err?.message || 'Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 gradient-subtle">
        <div className="container py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Book Appointment</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Doctor</label>
                  <div className="mt-1 text-lg font-medium">{doctorName || 'Doctor'}</div>
                </div>

                {consultationFee !== null && (
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground">Fee</label>
                    <div className="mt-1">₹{consultationFee}</div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Date</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Time</label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground">Reason</label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for visit (optional)" />
                </div>

                <div className="flex gap-2">
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Booking...' : 'Book Appointment'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BookAppointment;
