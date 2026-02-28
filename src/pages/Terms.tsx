import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 gradient-subtle">
        <div className="container py-12">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="text-2xl">Terms and Conditions</CardTitle>
              <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none space-y-6">
              <section>
                <h3 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h3>
                <p className="text-muted-foreground">
                  By accessing and using Pulse Appoint ("the Platform"), you agree to be bound by these Terms and Conditions. 
                  If you do not agree with any part of these terms, you must not use the Platform.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">2. Description of Service</h3>
                <p className="text-muted-foreground">
                  Pulse Appoint is an online platform that facilitates appointment booking between patients and healthcare 
                  providers. The Platform is not a healthcare provider and does not provide medical advice, diagnosis, or treatment.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">3. User Accounts</h3>
                <p className="text-muted-foreground">
                  You are responsible for maintaining the confidentiality of your account credentials and for all activities 
                  that occur under your account. You must provide accurate and complete information when creating an account. 
                  You agree to notify us immediately of any unauthorized use of your account.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">4. Appointments</h3>
                <p className="text-muted-foreground">
                  Appointments booked through the Platform are subject to doctor availability. We do not guarantee that any 
                  particular doctor will be available at any specific time. Cancellation and rescheduling policies may apply 
                  as specified during the booking process.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">5. Payments</h3>
                <p className="text-muted-foreground">
                  Consultation fees are determined by the healthcare providers. Payment processing is handled by third-party 
                  payment processors. Refund policies are subject to the cancellation terms specified at the time of booking.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">6. Privacy</h3>
                <p className="text-muted-foreground">
                  Your use of the Platform is also governed by our Privacy Policy. We take your privacy seriously and handle 
                  your personal and medical information with care, in compliance with applicable data protection laws.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">7. Medical Disclaimer</h3>
                <p className="text-muted-foreground">
                  The Platform is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the 
                  advice of a qualified healthcare provider with any questions you may have regarding a medical condition. 
                  If you think you may have a medical emergency, call your doctor or emergency services immediately.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">8. Limitation of Liability</h3>
                <p className="text-muted-foreground">
                  The Platform is provided "as is" without warranties of any kind. We are not liable for any damages arising 
                  from the use of the Platform, including but not limited to direct, indirect, incidental, or consequential damages.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">9. Changes to Terms</h3>
                <p className="text-muted-foreground">
                  We reserve the right to modify these terms at any time. Continued use of the Platform after changes 
                  constitutes acceptance of the updated terms.
                </p>
              </section>

              <section>
                <h3 className="text-lg font-semibold mb-2">10. Contact</h3>
                <p className="text-muted-foreground">
                  If you have questions about these Terms and Conditions, please contact us through the Platform's support channels.
                </p>
              </section>

              <div className="pt-4">
                <Link to="/login" className="text-sm text-primary hover:underline flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
