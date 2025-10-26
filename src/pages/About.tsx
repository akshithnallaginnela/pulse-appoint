import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 gradient-subtle">
        <div className="container py-12">
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>About Pulse Appoint (v1)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-lg">
                <strong>Pulse Appoint</strong> is a modern doctor appointment booking platform designed to make healthcare access easier and more efficient for everyone.
              </p>
              <ul className="list-disc pl-6 mb-4 text-md">
                <li>Book appointments with verified doctors</li>
                <li>View and manage your upcoming and past appointments</li>
                <li>Reschedule or cancel appointments easily</li>
                <li>Secure authentication and patient privacy</li>
                <li>Doctor profiles with specialization and experience</li>
                <li>Simple, user-friendly interface</li>
              </ul>
              <p className="mb-2 text-md">
                <strong>Version 1.0</strong> is our initial release. We are working to add more features and improvements based on your feedback!
              </p>
              <p className="text-muted-foreground text-sm">
                Thank you for using Pulse Appoint. Your health, our priority.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;
