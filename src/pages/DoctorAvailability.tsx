import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Clock, Save, ArrowLeft, Calendar } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/services/api';

interface DayAvailability {
    isAvailable: boolean;
    startTime: string;
    endTime: string;
    breakStartTime: string;
    breakEndTime: string;
}

type WeekAvailability = {
    [key: string]: DayAvailability;
};

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const defaultDay: DayAvailability = {
    isAvailable: false,
    startTime: '09:00',
    endTime: '17:00',
    breakStartTime: '13:00',
    breakEndTime: '14:00',
};

const DoctorAvailability = () => {
    const { user, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [availability, setAvailability] = useState<WeekAvailability>(() => {
        const initial: WeekAvailability = {};
        days.forEach(day => {
            initial[day] = { ...defaultDay };
        });
        return initial;
    });

    useEffect(() => {
        if (authLoading) return;
        if (user?.role !== 'doctor') {
            navigate('/login');
            return;
        }
        fetchProfile();
    }, [user, authLoading, navigate]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/doctors/profile/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                if (data.doctor?.availability) {
                    const avail = data.doctor.availability;
                    const merged: WeekAvailability = {};
                    days.forEach(day => {
                        merged[day] = {
                            isAvailable: avail[day]?.isAvailable || false,
                            startTime: avail[day]?.startTime || '09:00',
                            endTime: avail[day]?.endTime || '17:00',
                            breakStartTime: avail[day]?.breakStartTime || '13:00',
                            breakEndTime: avail[day]?.breakEndTime || '14:00',
                        };
                    });
                    setAvailability(merged);
                }
            } else {
                toast.error('Failed to load availability');
            }
        } catch (error) {
            console.error('Error fetching availability:', error);
            toast.error('Failed to load availability');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/doctors/profile/me`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ availability })
            });

            if (res.ok) {
                toast.success('Availability updated successfully');
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to update availability');
            }
        } catch (error) {
            console.error('Error updating availability:', error);
            toast.error('Failed to update availability');
        } finally {
            setSaving(false);
        }
    };

    const updateDay = (day: string, field: keyof DayAvailability, value: string | boolean) => {
        setAvailability(prev => ({
            ...prev,
            [day]: {
                ...prev[day],
                [field]: value,
            }
        }));
    };

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading availability...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-1 container mx-auto px-4 py-8">
                <div className="mb-6 flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => navigate('/doctor/dashboard')}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Dashboard
                    </Button>
                </div>

                <div className="mb-8">
                    <h1 className="text-3xl font-bold mb-2">Set Availability</h1>
                    <p className="text-muted-foreground">
                        Configure your weekly schedule. Patients will only be able to book during your available times.
                    </p>
                </div>

                <div className="space-y-4">
                    {days.map(day => (
                        <Card key={day}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5" />
                                        {capitalize(day)}
                                    </CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor={`${day}-toggle`} className="text-sm">
                                            {availability[day].isAvailable ? 'Available' : 'Unavailable'}
                                        </Label>
                                        <Switch
                                            id={`${day}-toggle`}
                                            checked={availability[day].isAvailable}
                                            onCheckedChange={(checked) => updateDay(day, 'isAvailable', checked)}
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            {availability[day].isAvailable && (
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor={`${day}-start`}>Start Time</Label>
                                            <Input
                                                id={`${day}-start`}
                                                type="time"
                                                value={availability[day].startTime}
                                                onChange={(e) => updateDay(day, 'startTime', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`${day}-end`}>End Time</Label>
                                            <Input
                                                id={`${day}-end`}
                                                type="time"
                                                value={availability[day].endTime}
                                                onChange={(e) => updateDay(day, 'endTime', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`${day}-break-start`}>Break Start</Label>
                                            <Input
                                                id={`${day}-break-start`}
                                                type="time"
                                                value={availability[day].breakStartTime}
                                                onChange={(e) => updateDay(day, 'breakStartTime', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor={`${day}-break-end`}>Break End</Label>
                                            <Input
                                                id={`${day}-break-end`}
                                                type="time"
                                                value={availability[day].breakEndTime}
                                                onChange={(e) => updateDay(day, 'breakEndTime', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>

                <div className="mt-6 flex justify-end">
                    <Button onClick={handleSave} disabled={saving} size="lg">
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Availability'}
                    </Button>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default DoctorAvailability;
