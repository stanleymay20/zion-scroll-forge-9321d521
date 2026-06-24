import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const TermsOfService = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Terms of Service — ScrollUniversity</title>
      <meta name="description" content="ScrollUniversity Terms of Service. Read our terms and conditions for using the platform." />
    </Helmet>
    <Header />
    <main className="max-w-3xl mx-auto px-4 py-16 prose prose-sm dark:prose-invert">
      <h1>Terms of Service</h1>
      <p className="text-muted-foreground">Last updated: April 4, 2026</p>

      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using ScrollUniversity ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, you may not use the Platform.</p>

      <h2>2. Description of Service</h2>
      <p>ScrollUniversity is an AI-powered educational platform offering courses, degree programs, AI tutoring, and digital credentials across multiple faculties.</p>

      <h2>3. User Accounts</h2>
      <p>You must provide accurate, complete information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activities under your account.</p>

      <h2>4. Academic Integrity</h2>
      <p>Users must adhere to our Academic Integrity Policy. Plagiarism, cheating, or misrepresentation of credentials will result in account suspension or termination.</p>

      <h2>5. AI-Assisted Services</h2>
      <p>Tutoring, grading suggestions, rubric scoring, and lecture-avatar delivery are AI-assisted. See <a href="/ai-transparency" className="text-primary hover:underline">AI Transparency</a> for the full disclosure required by the EU AI Act. AI never issues a binding academic decision without human oversight, and you may request human review of any AI-assisted decision at any time.</p>

      <h2>6. Intellectual Property</h2>
      <p>All course content, materials, and platform features are the intellectual property of ScrollUniversity or its licensors. You may not reproduce, distribute, or create derivative works without express permission.</p>

      <h2>6. Digital Credentials</h2>
      <p>Certificates, badges, and degrees issued through the Platform are verifiable digital credentials. ScrollUniversity reserves the right to revoke credentials in cases of academic dishonesty.</p>

      <h2>7. Payment & Refunds</h2>
      <p>Certain courses and programs may require payment. Refund eligibility is determined by the specific program's refund policy, available at time of enrollment.</p>

      <h2>8. Privacy</h2>
      <p>Your use of the Platform is also governed by our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.</p>

      <h2>9. Limitation of Liability</h2>
      <p>ScrollUniversity is provided "as is." We are not liable for any indirect, incidental, or consequential damages arising from your use of the Platform.</p>

      <h2>10. Modifications</h2>
      <p>We reserve the right to modify these terms at any time. Continued use of the Platform after changes constitutes acceptance of the updated terms.</p>

      <h2>11. Contact</h2>
      <p>For questions about these Terms, please contact us through the Platform's support channels.</p>
    </main>
    <Footer />
  </div>
);

export default TermsOfService;
