import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Wifi, Coffee, Users, MapPin, Heart, Bookmark, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-full bg-background">
      {/* Hero Section */}
      <section className="relative px-6 py-20 md:py-32">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 tracking-tight">
            Co-work, Everywhere
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            From coffee shops to hotel lobbies, discover everyday places to work and connect.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/cities">
                <MapPin className="mr-2 h-5 w-5" />
                Explore Cities
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/cities">
                Browse Workspaces
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Wifi className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Be Productive</h3>
              <p className="text-muted-foreground">
                Find venues with reliable Wi-Fi, ample power sockets, and comfy seating areas.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Coffee className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Feel Welcome</h3>
              <p className="text-muted-foreground">
                Discover the best times to work, based on community data and local insights.
              </p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Stay Inspired</h3>
              <p className="text-muted-foreground">
                Uncover new places with laid-back ambiance and friendly vibes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How it Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold mb-4">Find Local Work Hubs</h3>
              <p className="text-muted-foreground text-lg">
                Quiet? Air conditioned? Well lit? Get stuff done in a fresh, new environment that's optimized for you!
              </p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4">Meet Like-Minded People</h3>
              <p className="text-muted-foreground text-lg">
                Connect with talented freelancers, digital nomads, and other remote workers sharing our spaces.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Member Benefits */}
      <section className="px-6 py-16 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Join the Community
          </h2>
          <p className="text-center text-muted-foreground text-lg mb-12">
            Create an account to unlock exclusive features and connect with remote workers worldwide
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-lg p-6">
              <Bookmark className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Save Your Favorites</h3>
              <p className="text-muted-foreground">
                Bookmark workspaces and cities to quickly access them later and build your personal work map.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <Heart className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Rate & Review</h3>
              <p className="text-muted-foreground">
                Share your experiences and help others find the perfect workspace with honest reviews.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <Users className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Connect with Nomads</h3>
              <p className="text-muted-foreground">
                Join a global community of digital nomads and remote workers in your city.
              </p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6">
              <MapPin className="h-8 w-8 text-primary mb-3" />
              <h3 className="text-xl font-semibold mb-2">Personalized Recommendations</h3>
              <p className="text-muted-foreground">
                Get workspace suggestions based on your preferences and work style.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Get To Work!
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            All locations are carefully inspected and manually approved by our curation team.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/cities">
                Start Exploring
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline">
              Sign Up Free
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
