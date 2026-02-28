import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, Stethoscope, GraduationCap, Award, Save, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/services/api';

interface DoctorProfile {
    _id: string;
    specialization: string;
    experience: number;
    consultationFee: number;
    consultationDuration: number;
    bio: string;
    languages: string[];
    services: string[];
    education: { degree: string; institution: string; year: number }[];
    isVerified: boolean;
    isActive: boolean;
    profileCompleted: boolean;
    userId: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    };
}

const specializations = [
    'Cardiologist', 'Pediatrician', 'Dermatologist', 'Orthopedic Surgeon',
    'General Physician', 'Neurologist', 'Gynecologist', 'Psychiatrist',
    'Oncologist', 'Radiologist', 'Anesthesiologist', 'Emergency Medicine',
    'Family Medicine', 'Internal Medicine', 'Ophthalmologist', 'ENT Specialist',
    'Urologist', 'Endocrinologist', 'Gastroenterologist', 'Pulmonologist',
    'Rheumatologist', 'Nephrologist', 'Hematologist', 'Infectious Disease', 'Other'
];

const languageOptions = [
    'English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi',
    'Gujarati', 'Kannada', 'Malayalam', 'Punjabi', 'Other'
];

const DoctorProfilePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<DoctorProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        specialization: '',
        experience: 0,
        consultationFee: 0,
        consultationDuration: 30,
        bio: '',
        languages: [] as string[],
        services: '',
    });

    useEffect(() => {
        if (user?.role !== 'doctor') {
            navigate('/login');
            return;
        }
        fetchProfile();
    }, [user, navigate]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/doctors/profile/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                const data = await res.json();
                const doc = data.doctor;
                setProfile(doc);
                setFormData({
                    specialization: doc.specialization || '',
                    experience: doc.experience || 0,
                    consultationFee: doc.consultationFee || 0,
                    consultationDuration: doc.consultationDuration || 30,
                    bio: doc.bio || '',
                    languages: doc.languages || [],
                    services: (doc.services || []).join(', '),
                });
            } else {
                toast.error('Failed to load profile');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Failed to load profile');
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
                body: JSON.stringify({
                    ...formData,
                    services: formData.services.split(',').map(s => s.trim()).filter(Boolean),
                })
            });

            if (res.ok) {
                toast.success('Profile updated successfully');
                fetchProfile();
            } else {
                const data = await res.json();
                toast.error(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const toggleLanguage = (lang: string) => {
        setFormData(prev => ({
            ...prev,
            languages: prev.languages.includes(lang)
                ? prev.languages.filter(l => l !== lang)
                : [...prev.languages, lang]
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Stethoscope className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading profile...</p>
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
                    <h1 className="text-3xl font-bold mb-2">Manage Profile</h1>
                    <p className="text-muted-foreground">Update your professional information</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Profile Overview */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5" />
                                Profile Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <p className="text-lg font-semibold">
                                    Dr. {profile?.userId?.firstName} {profile?.userId?.lastName}
                                </p>
                                <p className="text-muted-foreground">{profile?.specialization}</p>
                            </div>
                            <div className="flex gap-2">
                                {profile?.isVerified ? (
                                    <Badge variant="default">Verified</Badge>
                                ) : (
                                    <Badge variant="destructive">Not Verified</Badge>
                                )}
                                {profile?.isActive ? (
                                    <Badge variant="secondary">Active</Badge>
                                ) : (
                                    <Badge variant="outline">Inactive</Badge>
                                )}
                            </div>
                            <div className="space-y-2 text-sm">
                                <p><span className="font-medium">Email:</span> {profile?.userId?.email}</p>
                                <p><span className="font-medium">Phone:</span> {profile?.userId?.phone}</p>
                                <p><span className="font-medium">Experience:</span> {profile?.experience} years</p>
                                <p><span className="font-medium">Fee:</span> ₹{profile?.consultationFee}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Edit Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Stethoscope className="h-5 w-5" />
                                    Professional Details
                                </CardTitle>
                                <CardDescription>Update your specialization, experience, and fees</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="specialization">Specialization</Label>
                                        <Select
                                            value={formData.specialization}
                                            onValueChange={(val) => setFormData(prev => ({ ...prev, specialization: val }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select specialization" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {specializations.map(s => (
                                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="experience">Years of Experience</Label>
                                        <Input
                                            id="experience"
                                            type="number"
                                            min={0}
                                            max={50}
                                            value={formData.experience}
                                            onChange={(e) => setFormData(prev => ({ ...prev, experience: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="fee">Consultation Fee (₹)</Label>
                                        <Input
                                            id="fee"
                                            type="number"
                                            min={0}
                                            value={formData.consultationFee}
                                            onChange={(e) => setFormData(prev => ({ ...prev, consultationFee: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="duration">Consultation Duration (minutes)</Label>
                                        <Input
                                            id="duration"
                                            type="number"
                                            min={15}
                                            max={120}
                                            value={formData.consultationDuration}
                                            onChange={(e) => setFormData(prev => ({ ...prev, consultationDuration: parseInt(e.target.value) || 30 }))}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="bio">Bio</Label>
                                    <Textarea
                                        id="bio"
                                        placeholder="Write a short bio about yourself..."
                                        value={formData.bio}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                                        rows={4}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="services">Services (comma-separated)</Label>
                                    <Input
                                        id="services"
                                        placeholder="e.g. General Checkup, ECG, Blood Pressure Monitoring"
                                        value={formData.services}
                                        onChange={(e) => setFormData(prev => ({ ...prev, services: e.target.value }))}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5" />
                                    Languages
                                </CardTitle>
                                <CardDescription>Select languages you can consult in</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {languageOptions.map(lang => (
                                        <Badge
                                            key={lang}
                                            variant={formData.languages.includes(lang) ? 'default' : 'outline'}
                                            className="cursor-pointer"
                                            onClick={() => toggleLanguage(lang)}
                                        >
                                            {lang}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={saving}>
                                <Save className="h-4 w-4 mr-2" />
                                {saving ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default DoctorProfilePage;
