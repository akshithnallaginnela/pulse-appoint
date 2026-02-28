import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, Search, Filter, Bell } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/services/api';
import { useSocket } from '@/hooks/useSocket';

interface Appointment {
    _id: string;
    patientId: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
    };
    appointmentDate: string;
    appointmentTime: string;
    reason: string;
    status: string;
    payment: {
        amount: number;
        status: string;
    };
    diagnosis?: string;
    doctorNotes?: string;
}

const DoctorAppointments = () => {
    const { user, doctorProfile } = useAuth();
    const navigate = useNavigate();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [loading, setLoading] = useState(true);
    const [newAppointmentAlert, setNewAppointmentAlert] = useState(false);

    // Real-time: listen for new appointments and status updates
    const handleNewAppointment = useCallback((data: any) => {
        toast.success(data.message || 'New appointment received!', {
            icon: '🔔',
            duration: 5000,
        });
        setNewAppointmentAlert(true);
        setTimeout(() => setNewAppointmentAlert(false), 3000);
        fetchAppointments();
    }, []);

    const handleStatusUpdate = useCallback((data: any) => {
        toast.info(data.message || 'Appointment updated');
        fetchAppointments();
    }, []);

    useSocket(
        doctorProfile?.id || null,
        'doctor',
        {
            'new-appointment': handleNewAppointment,
            'appointment-status-updated': handleStatusUpdate,
        }
    );

    useEffect(() => {
        if (user?.role !== 'doctor') {
            navigate('/login');
            return;
        }
        fetchAppointments();
    }, [user, navigate]);

    useEffect(() => {
        filterAppointments();
    }, [appointments, searchTerm, activeTab]);

    const fetchAppointments = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/doctors/appointments`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setAppointments(data.appointments || []);
            }
        } catch (error) {
            console.error('Error fetching appointments:', error);
            toast.error('Failed to load appointments');
        } finally {
            setLoading(false);
        }
    };

    const filterAppointments = () => {
        let filtered = [...appointments];

        // Filter by tab
        if (activeTab !== 'all') {
            filtered = filtered.filter(apt => apt.status === activeTab);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(apt =>
                `${apt.patientId.firstName} ${apt.patientId.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                apt.reason.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredAppointments(filtered);
    };

    const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                toast.success(`Appointment ${newStatus} successfully`);
                fetchAppointments();
            } else {
                toast.error('Failed to update appointment');
            }
        } catch (error) {
            console.error('Error updating appointment:', error);
            toast.error('Failed to update appointment');
        }
    };

    const getStatusBadge = (status: string) => {
        const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
            pending: { variant: 'outline', label: 'Pending' },
            confirmed: { variant: 'default', label: 'Confirmed' },
            completed: { variant: 'secondary', label: 'Completed' },
            cancelled: { variant: 'destructive', label: 'Cancelled' }
        };

        const config = statusConfig[status] || statusConfig.pending;
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const getTabCount = (status: string) => {
        if (status === 'all') return appointments.length;
        return appointments.filter(apt => apt.status === status).length;
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="mb-8">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold mb-2">My Appointments</h1>
                        {newAppointmentAlert && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium animate-pulse">
                                <Bell className="h-4 w-4" />
                                New appointment!
                            </span>
                        )}
                    </div>
                    <p className="text-muted-foreground">Manage all your patient appointments — updates in real time</p>
                </div>

                {/* Search and Filter */}
                <div className="mb-6 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by patient name or reason..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                    <Button variant="outline">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="all">
                            All ({getTabCount('all')})
                        </TabsTrigger>
                        <TabsTrigger value="pending">
                            Pending ({getTabCount('pending')})
                        </TabsTrigger>
                        <TabsTrigger value="confirmed">
                            Confirmed ({getTabCount('confirmed')})
                        </TabsTrigger>
                        <TabsTrigger value="completed">
                            Completed ({getTabCount('completed')})
                        </TabsTrigger>
                        <TabsTrigger value="cancelled">
                            Cancelled ({getTabCount('cancelled')})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value={activeTab} className="mt-6">
                        {loading ? (
                            <div className="text-center py-12">
                                <p>Loading appointments...</p>
                            </div>
                        ) : filteredAppointments.length === 0 ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p className="text-muted-foreground">No appointments found</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-4">
                                {filteredAppointments.map((appointment) => (
                                    <Card key={appointment._id}>
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="flex items-center gap-3">
                                                        {appointment.patientId.firstName} {appointment.patientId.lastName}
                                                        {getStatusBadge(appointment.status)}
                                                    </CardTitle>
                                                    <CardDescription className="mt-2">
                                                        <div className="flex items-center gap-4">
                                                            <span className="flex items-center gap-1">
                                                                <Calendar className="h-4 w-4" />
                                                                {formatDate(appointment.appointmentDate)}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                                <Clock className="h-4 w-4" />
                                                                {formatTime(appointment.appointmentTime)}
                                                            </span>
                                                        </div>
                                                    </CardDescription>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-semibold">₹{appointment.payment.amount}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {appointment.payment.status}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="font-medium">Contact:</span> {appointment.patientId.phone} | {appointment.patientId.email}
                                                </div>
                                                <div>
                                                    <span className="font-medium">Reason:</span> {appointment.reason}
                                                </div>
                                                {appointment.diagnosis && (
                                                    <div>
                                                        <span className="font-medium">Diagnosis:</span> {appointment.diagnosis}
                                                    </div>
                                                )}
                                                {appointment.doctorNotes && (
                                                    <div>
                                                        <span className="font-medium">Notes:</span> {appointment.doctorNotes}
                                                    </div>
                                                )}

                                                <div className="flex gap-2 pt-3">
                                                    {appointment.status === 'pending' && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => updateAppointmentStatus(appointment._id, 'confirmed')}
                                                        >
                                                            Confirm
                                                        </Button>
                                                    )}
                                                    {(appointment.status === 'confirmed' || appointment.status === 'pending') && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => updateAppointmentStatus(appointment._id, 'completed')}
                                                            >
                                                                Mark Complete
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => updateAppointmentStatus(appointment._id, 'cancelled')}
                                                            >
                                                                Cancel
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => navigate(`/doctor/appointments/${appointment._id}`)}
                                                    >
                                                        View Details
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </main>

            <Footer />
        </div>
    );
};

export default DoctorAppointments;
