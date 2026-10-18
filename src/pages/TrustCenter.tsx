/**
 * Trust Center Page
 * Public transparency page for Scroll University credibility
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  FileCheck, 
  Users, 
  Building2, 
  Scale, 
  BookOpen,
  GraduationCap,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Clock,
  Target,
  Heart,
  Globe,
  Lock
} from "lucide-react";

console.info("✝️ Trust Center — Building credibility through transparency");

// Prelaunch trust disclosures: identity, accreditation and regulatory claims
// must never be inferred from brand language or placeholder metadata.
// Replace only after documentary legal review, not from an AI-generated claim.
const legalEntity = {
  name: "ScrollUniversity",
  type: "Digital learning platform — institutional details under verification",
  registration: "No independently verified registration record published",
  registrationNumber: "Not verified for publication",
  address: "No verified registered address published",
  established: "Not independently verified",
  mission: "To make Christ-centered learning accessible through rigorous teaching, accountable AI assistance, and spiritual formation."
};

// Do not invent faculty names, degrees, appointments or advisory boards.
const leadership = [
  {
    name: "Leadership verification pending",
    title: "Public governance directory",
    credentials: "No independently verified credentials published",
    linkedIn: null as string | null,
    bio: "Identities, appointments and academic qualifications will appear only after documentary verification."
  }
];

// Only the evidence-backed accreditation-status page can establish recognition.
const accreditationStatus = {
  current: "External accreditation not verified",
  targetBodies: [
    "No accreditor application or formal relationship has been verified for publication."
  ],
  timeline: [
    { phase: "Publish independently verifiable recognition evidence", status: "planned", date: "Not scheduled" }
  ]
};

const offerings = {
  whatWeOffer: [
    "Course catalogue previews and structured learning interfaces",
    "AI-supported study tools subject to academic and technical verification",
    "Christ-centered educational vision and spiritual-formation resources",
    "Public disclosures separating internal readiness from external accreditation"
  ],
  whatWeDontOffer: [
    "Externally accredited or state-recognized degrees have not been verified for offer",
    "Visa sponsorship or guaranteed credit transfer",
    "Government financial aid eligibility",
    "Online tuition checkout while financial release gates remain closed",
    "Guaranteed professional licensure or course enrollment"
  ]
};

// Do not represent an unpublished policy as a legally operative refund promise.
const policies = [
  {
    title: "Refund and payment terms",
    icon: Scale,
    summary: "Paid enrollment is not yet enabled. Specific refund terms must be published before accepting payment.",
    link: null as string | null
  },
  {
    title: "Complaints and appeals",
    icon: FileCheck,
    summary: "A complete grievance and academic appeals procedure requires formal review before commercial admission.",
    link: null as string | null
  },
  {
    title: "Data privacy",
    icon: Lock,
    summary: "Read the currently published privacy statement. Independent compliance validation remains necessary.",
    link: "/privacy" as string | null
  },
  {
    title: "Academic integrity",
    icon: BookOpen,
    summary: "Review existing academic-integrity information. Procedural safeguards remain part of GA acceptance.",
    link: "/academic-integrity" as string | null
  },
  {
    title: "Transcript and record requests",
    icon: GraduationCap,
    summary: "Official service timelines and transcript-request terms have not been independently verified.",
    link: null as string | null
  }
];

export default function TrustCenter() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto py-12 px-4 space-y-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="flex justify-center">
            <Shield className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Trust Center</h1>
          <p className="text-xl text-muted-foreground">
            Transparency, integrity, and accountability in everything we do. 
            Here's exactly what Scroll University is—and what it isn't.
          </p>
        </div>

        <Separator />

        {/* Navigation Tabs */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full max-w-4xl mx-auto">
            <TabsTrigger value="about">About Us</TabsTrigger>
            <TabsTrigger value="accreditation">Accreditation</TabsTrigger>
            <TabsTrigger value="leadership">Leadership</TabsTrigger>
            <TabsTrigger value="policies">Policies</TabsTrigger>
            <TabsTrigger value="clarity">What We Are</TabsTrigger>
          </TabsList>

          {/* About Us */}
          <TabsContent value="about" className="mt-8">
            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Legal Entity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="font-semibold text-lg">{legalEntity.name}</p>
                    <p className="text-muted-foreground">{legalEntity.type}</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Registration:</strong> {legalEntity.registration}</p>
                    <p><strong>Tax ID:</strong> {legalEntity.registrationNumber}</p>
                    <p><strong>Address:</strong> {legalEntity.address}</p>
                    <p><strong>Established:</strong> {legalEntity.established}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Our Mission
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {legalEntity.mission}
                  </p>
                  <div className="mt-6 space-y-2">
                    <p className="font-semibold">Core Values:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• Christ-centered excellence in all things</li>
                      <li>• Biblical integrity without compromise</li>
                      <li>• Global accessibility for all believers</li>
                      <li>• Innovation in service of the Kingdom</li>
                      <li>• Community and spiritual formation</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Accreditation */}
          <TabsContent value="accreditation" className="mt-8">
            <div className="space-y-8">
              <Card className="border-amber-500/50 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Current Accreditation Status
                  </CardTitle>
                  <CardDescription>
                    We believe in full transparency about our accreditation journey
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-amber-600 border-amber-600">
                      {accreditationStatus.current}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    External accreditation or degree-awarding recognition has not been established by
                    verified evidence presented on this page. Do not interpret programme names,
                    internal academic status, or certificates as proof of government recognition.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Evidence publication plan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {accreditationStatus.timeline.map((item, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className={`mt-1 rounded-full p-1 ${
                          item.status === 'completed' ? 'bg-green-500' :
                          item.status === 'in-progress' ? 'bg-blue-500' : 'bg-muted'
                        }`}>
                          {item.status === 'completed' ? (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          ) : item.status === 'in-progress' ? (
                            <Clock className="h-4 w-4 text-white" />
                          ) : (
                            <div className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{item.phase}</p>
                          <p className="text-sm text-muted-foreground">{item.date}</p>
                        </div>
                        <Badge variant={
                          item.status === 'completed' ? 'default' :
                          item.status === 'in-progress' ? 'secondary' : 'outline'
                        }>
                          {item.status.replace('-', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Accreditation and accreditor disclosure</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {accreditationStatus.targetBodies.map((body, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span>{body}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Leadership */}
          <TabsContent value="leadership" className="mt-8">
            <div className="grid md:grid-cols-2 gap-6">
              {leadership.map((leader, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      {leader.name}
                    </CardTitle>
                    <CardDescription>{leader.title}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Badge variant="secondary">{leader.credentials}</Badge>
                    <p className="text-muted-foreground">{leader.bio}</p>
                    {leader.linkedIn && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={leader.linkedIn} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          LinkedIn Profile
                        </a>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Policies */}
          <TabsContent value="policies" className="mt-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {policies.map((policy, index) => (
                <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <policy.icon className="h-5 w-5 text-primary" />
                      {policy.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{policy.summary}</p>
                    {policy.link ? (
                      <Button variant="outline" size="sm" className="w-full" asChild>
                        <Link to={policy.link}>View published information</Link>
                      </Button>
                    ) : (
                      <Badge variant="secondary">Detailed policy pending publication</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* What We Are / Aren't */}
          <TabsContent value="clarity" className="mt-8">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="border-green-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    What We Offer
                  </CardTitle>
                  <CardDescription>
                    Current public-facing capabilities; availability is not proof of academic approval
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {offerings.whatWeOffer.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-amber-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-5 w-5" />
                    What We Don't Offer (Yet)
                  </CardTitle>
                  <CardDescription>
                    Honest about our current limitations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {offerings.whatWeDontOffer.map((item, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-1 flex-shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      <strong>Our commitment:</strong> We will never claim recognition, 
                      accreditation, or benefits we don't actually have. As we achieve 
                      each milestone, this page will be updated.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Contact Section */}
        <Separator />
        
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold">Questions?</h2>
          <p className="text-muted-foreground">
            We're committed to transparency. If you have questions about our institution, 
            accreditation status, or policies, please reach out.
          </p>
          <div className="flex justify-center gap-4">
            <Button disabled>
              Verified contact details pending
            </Button>
            <Button variant="outline" asChild>
              <Link to="/catalog">View Course Catalogue</Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
