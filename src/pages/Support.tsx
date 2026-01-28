import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Clock, HelpCircle, Shield, FileText, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import rugboostLogo from '@/assets/rugboost-logo.svg';

const Support = () => {
  const faqs = [
    {
      question: "How does AI rug analysis work?",
      answer: "Our AI analyzes photos of your rugs to identify fiber types, origins, construction methods, and existing damage. Simply capture photos using our guided workflow, and receive detailed analysis with restoration recommendations and cost estimates within seconds."
    },
    {
      question: "How do I create and manage jobs?",
      answer: "From your dashboard, tap 'New Job' to create a client record. Add rugs to the job, capture photos using our guided system, and the AI will generate detailed estimates. Track all your jobs from intake to completion in one place."
    },
    {
      question: "How do clients access their portal?",
      answer: "When you enable the client portal for a job, we send your client a secure link via email. They can view their rugs, review estimates, approve services, and make payments—all without needing to create an account."
    },
    {
      question: "How does payment processing work?",
      answer: "Clients can pay securely through the client portal using credit or debit cards. Payments are processed through Stripe, and you'll receive notifications when payments are completed. Track all receivables from your dashboard."
    },
    {
      question: "Can I customize my pricing?",
      answer: "Yes! Go to Settings to configure your service prices. The AI uses your custom pricing when generating estimates, ensuring accurate quotes that match your business rates."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use industry-standard encryption for all data in transit and at rest. Your client information, photos, and business data are protected with enterprise-grade security measures."
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src={rugboostLogo} alt="RugBoost" className="h-8 w-8" />
            <span className="font-display text-lg font-bold text-foreground">RugBoost</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Support & Help Center
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get help with RugBoost, the AI-powered platform for professional rug inspection and business management.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  Email Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  Have a question or need assistance? Our support team is here to help.
                </p>
                <a 
                  href="mailto:support@rugboost.com" 
                  className="text-primary font-medium hover:underline"
                >
                  support@rugboost.com
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  Response Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-3">
                  We typically respond to support inquiries within:
                </p>
                <p className="font-medium text-foreground">24-48 business hours</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="rounded-lg bg-primary/10 p-2">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">
              Frequently Asked Questions
            </h2>
          </div>

          <Card>
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border-b last:border-b-0">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50 text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-12 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="font-display text-xl font-bold text-foreground mb-6">
            Quick Links
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <Link to="/privacy" className="group">
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">Privacy Policy</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>

            <Link to="/terms-of-service" className="group">
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-foreground">Terms of Service</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">
            Ready to transform your rug business?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join professionals using AI-powered inspections to deliver faster, more accurate estimates.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/auth">Get Started Free</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={rugboostLogo} alt="RugBoost" className="h-6 w-6" />
              <span className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} RugBoost. All rights reserved.
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link to="/terms-of-service" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
              <a href="mailto:support@rugboost.com" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Support;
