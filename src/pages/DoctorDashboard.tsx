import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, DollarSign, Activity, CheckCircle, XCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/services/api';

interface Appointment {
    _id: string;
    patientId: {
        firstName: string;
        lastName: string;
        phone: string;
    };
    appointmentDate: string;
    appointmentTime: string;
    reason: string;
    status: string;
    payment: {
        amount: number;
        status: string;
    };
}

interface Stats {
    todayAppointments: number;
    upcomingAppointments: number;
    completedToday: number;
    totalEarningsToday: number;
}

const DoctorDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
    const [stats, setStats] = useState<Stats>({
        todayAppointments: 0,
        upcomingAppointments: 0,
        completedToday: 0,
        totalEarningsToday: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.role !== 'doctor') {
            navigate('/login');
            return;
        }
        fetchDashboardData();
    }, [user, navigate]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');

            // Fetch today's appointments
            const appointmentsRes = await fetch(`${API_BASE_URL}/doctors/appointments/today`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (appointmentsRes.ok) {
                const data = await appointmentsRes.json();
                setTodayAppointments(data.appointments || []);

                // Calculate stats
                const completed = data.appointments.filter((apt: Appointment) => apt.status === 'completed').length;
                const earnings = data.appointments
                    .filter((apt: Appointment) => apt.status === 'completed')
                    .reduce((sum: number, apt: Appointment) => sum + apt.payment.amount, 0);

                setStats({
                    todayAppointments: data.appointments.length,
                    upcomingAppointments: data.appointments.filter((apt: Appointment) =>
                        apt.status === 'pending' || apt.status === 'confirmed'
                    ).length,
                    completedToday: completed,
                    totalEarningsToday: earnings
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
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
                fetchDashboardData();
            } else {
                toast.error('Failed to update appointment status');
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

    const formatTime = (time: string) => {
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Activity className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Welcome, Dr. {user?.firstName}!</h1>
                    <p className="text-muted-foreground">Here's your dashboard for today</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.todayAppointments}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.upcomingAppointments} upcoming
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.completedToday}</div>
                            <p className="text-xs text-muted-foreground">
                                {stats.todayAppointments > 0
                                    ? `${Math.round((stats.completedToday / stats.todayAppointments) * 100)}% completion rate`
                                    : 'No appointments today'
                                }
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Today's Earnings</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">₹{stats.totalEarningsToday}</div>
                            <p className="text-xs text-muted-foreground">
                                From {stats.completedToday} consultations
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
                            <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{todayAppointments.length}</div>
                            <p className="text-xs text-muted-foreground">
                                Scheduled for today
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Today's Appointments */}
                <Card>
                    <CardHeader>
                        <CardTitle>Today's Appointments</CardTitle>
                        <CardDescription>
                            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {todayAppointments.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>No appointments scheduled for today</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {todayAppointments.map((appointment) => (
                                    <div
                                        key={appointment._id}
                                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-semibold">
                                                    {appointment.patientId.firstName} {appointment.patientId.lastName}
                                                </h3>
                                                {getStatusBadge(appointment.status)}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-4 w-4" />
                                                    {formatTime(appointment.appointmentTime)}
                                                </div>
                                                <div>📞 {appointment.patientId.phone}</div>
                                                <div>💰 ₹{appointment.payment.amount}</div>
                                            </div>
                                            <p className="text-sm mt-2">
                                                <span className="font-medium">Reason:</span> {appointment.reason}
                                            </p>
                                        </div>

                                        <div className="flex gap-2 ml-4">
                                            {appointment.status === 'pending' && (
                                                <Button
                                                    size="sm"
                                                    onClick={() => updateAppointmentStatus(appointment._id, 'confirmed')}
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Confirm
                                                </Button>
                                            )}
                                            {(appointment.status === 'confirmed' || appointment.status === 'pending') && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateAppointmentStatus(appointment._id, 'completed')}
                                                >
                                                    Complete
                                                </Button>
                                            )}
                                            {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => updateAppointmentStatus(appointment._id, 'cancelled')}
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" />
                                                    Cancel
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button
                        variant="outline"
                        className="h-20"
                        onClick={() => navigate('/doctor/appointments')}
                    >
                        <div className="text-center">
                            <Calendar className="h-6 w-6 mx-auto mb-2" />
                            <span>View All Appointments</span>
                        </div>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-20"
                        onClick={() => navigate('/doctor/profile')}
                    >
                        <div className="text-center">
                            <Users className="h-6 w-6 mx-auto mb-2" />
                            <span>Manage Profile</span>
                        </div>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-20"
                        onClick={() => navigate('/doctor/availability')}
                    >
                        <div className="text-center">
                            <Clock className="h-6 w-6 mx-auto mb-2" />
                            <span>Set Availability</span>
                        </div>
                    </Button>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default DoctorDashboard;
