import { Helmet } from "react-helmet";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const PrivacyPolicy = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Privacy Policy — ScrollUniversity</title>
      <meta name="description" content="ScrollUniversity Privacy Policy. Learn how we collect, use, and protect your data." />
    </Helmet>
    <Header />
    <main className="max-w-3xl mx-auto px-4 py-16 prose prose-sm dark:prose-invert">
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground">Last updated: April 4, 2026</p>

      <h2>1. Information We Collect</h2>
      <p>We collect information you provide directly (name, email, academic records) and information generated through your use of the Platform (course progress, quiz scores, interaction data).</p>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To provide and improve educational services</li>
        <li>To personalize your learning experience via AI</li>
        <li>To issue and verify digital credentials</li>
        <li>To communicate important updates about your account or courses</li>
        <li>To maintain platform security and prevent fraud</li>
      </ul>

      <h2>3. AI Processing & Your Rights (EU AI Act)</h2>
      <p>ScrollUniversity uses AI to support tutoring, content authoring, assessment, and lecture delivery. See our <a href="/ai-transparency" className="text-primary hover:underline">AI Transparency page</a> for the full system inventory. Under Articles 13, 50 and 86 of the EU AI Act you have the right to:</p>
      <ul>
        <li>Be informed when you are interacting with AI and when content is AI-generated</li>
        <li>Receive a meaningful explanation of AI-assisted decisions affecting you (grades, admissions, holds, credentials)</li>
        <li>Request human review of any such decision via the "Request human review" control or by contacting your advisor</li>
        <li>Opt out of optional AI tutoring without academic penalty</li>
      </ul>
      <p>ScrollUniversity does not perform emotion inference for grading and does not use AI for social scoring outside the published academic context. We do not train foundation models on your data.</p>

      <h2>4. Data Sharing</h2>
      <p>We do not sell your personal information. We may share data with:</p>
      <ul>
        <li>Credential verification services (for badge/degree validation)</li>
        <li>AI service providers (for tutoring functionality, with appropriate safeguards)</li>
        <li>Legal authorities when required by law</li>
      </ul>

      <h2>4. Data Security</h2>
      <p>We implement industry-standard security measures including encryption, row-level security policies, and regular security audits to protect your data.</p>

      <h2>5. Data Retention</h2>
      <p>Academic records and credentials are retained indefinitely for verification purposes. Account data is retained while your account is active. You may request deletion by contacting support.</p>

      <h2>6. Your Rights</h2>
      <p>You have the right to access, correct, or delete your personal data. You may also request a copy of your data or object to certain processing activities.</p>

      <h2>7. Cookies</h2>
      <p>We use essential cookies for authentication and session management. No third-party tracking cookies are used without your consent.</p>

      <h2>8. Children's Privacy</h2>
      <p>The Platform is not intended for children under 13. We do not knowingly collect data from children under 13.</p>

      <h2>9. Changes to This Policy</h2>
      <p>We will notify users of material changes via email or in-app notification.</p>

      <h2>10. Contact</h2>
      <p>For privacy-related inquiries, please contact us through the Platform's support channels.</p>
    </main>
    <Footer />
  </div>
);

export default PrivacyPolicy;
