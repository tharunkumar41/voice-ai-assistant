import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Voice AI Personal Assistant
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Never miss a customer again. Automate missed-call follow-ups for any
            small business — cake shops, clinics, delivery, real-estate & more.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/login">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Login
              </Button>
            </Link>
          </div>

          <div className="mt-16 grid md:grid-cols-3 gap-8 text-left">
            <div className="p-6 bg-white rounded-xl shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">Custom Workflows</h3>
              <p className="text-gray-600 text-sm">
                Build missed-call flows for any industry in minutes. No code
                required.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">AI + Calendar</h3>
              <p className="text-gray-600 text-sm">
                Real tool calling with Google Calendar. Check availability &
                book callbacks automatically.
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-sm border">
              <h3 className="font-semibold text-lg mb-2">Dashboard</h3>
              <p className="text-gray-600 text-sm">
                See every conversation, collected data, urgency flags and
                follow-up status in one place.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
