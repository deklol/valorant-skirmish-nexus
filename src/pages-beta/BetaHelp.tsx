import { GradientBackground, GlassCard, BetaBadge } from "@/components-beta/ui-beta";
import { 
  HelpCircle, MessageCircle, Book, ExternalLink, 
  Trophy, Users, Swords, Map, Scale, Crown,
  ChevronDown, ChevronUp
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  {
    category: "Getting Started",
    question: "How do I join a tournament?",
    answer: "Navigate to the Tournaments page, find an open tournament, and click 'Register'. Make sure you're logged in with your Discord account first. You'll need to have your VALORANT rank set up in your profile for team balancing."
  },
  {
    category: "Getting Started",
    question: "How do I set my VALORANT rank?",
    answer: "Go to your Profile page and look for the rank section. You can either manually set your rank or link your Riot ID to have it automatically fetched from tracker.gg."
  },
  {
    category: "Tournaments",
    question: "What is ATLAS weight?",
    answer: "ATLAS (Adaptive Tournament Lineup Assignment System) calculates a 'weight' for each player based on their rank, win history, and other performance metrics. This weight is used to create balanced teams where each team has a similar total weight."
  },
  {
    category: "Tournaments",
    question: "How does team balancing work?",
    answer: "When a tournament enters the 'Balancing' phase, our algorithm creates teams that are as evenly matched as possible. It considers each player's ATLAS weight and uses advanced algorithms to minimize the weight difference between teams."
  },
  {
    category: "Tournaments",
    question: "What is map veto?",
    answer: "Map veto is a system where team captains take turns banning and picking maps for their match. The order and number of bans/picks depends on the match format (Bo1, Bo3, Bo5)."
  },
  {
    category: "Matches",
    question: "How do I report a match score?",
    answer: "Team captains can submit scores from the match details page. Both teams need to confirm the score, or an admin can verify it. Take screenshots as proof in case of disputes."
  },
  {
    category: "Matches",
    question: "What happens if a player doesn't show up?",
    answer: "Contact a tournament admin immediately. Substitute players may be available from the waitlist. Repeated no-shows may result in penalties for future tournaments."
  },
  {
    category: "Points & Rewards",
    question: "How do I earn points?",
    answer: "You earn points by participating in tournaments, winning matches, and completing achievements. Points can be spent in the Shop for cosmetics and other rewards."
  },
  {
    category: "Points & Rewards",
    question: "What are name effects?",
    answer: "Name effects are special visual styles that change how your username appears on the platform. Some effects include gradients, animations, and custom colors."
  }
];

const FAQAccordion = ({ item, index }: { item: FAQItem; index: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <GlassCard 
      variant="subtle" 
      className="overflow-hidden beta-animate-fade-in"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-[hsl(var(--beta-surface-3))] transition-colors"
      >
        <div className="flex items-center gap-3">
          <BetaBadge variant="outline" size="sm">{item.category}</BetaBadge>
          <span className="font-medium text-[hsl(var(--beta-text-primary))]">
            {item.question}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-[hsl(var(--beta-text-muted))] shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-[hsl(var(--beta-text-muted))] shrink-0" />
        )}
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4 pt-0">
          <p className="text-[hsl(var(--beta-text-secondary))] text-sm leading-relaxed pl-3 border-l-2 border-[hsl(var(--beta-accent))]">
            {item.answer}
          </p>
        </div>
      )}
    </GlassCard>
  );
};

const BetaHelp = () => {
  const quickLinks = [
    { title: "Tournaments", href: "/beta/tournaments", icon: Trophy, description: "Browse and join tournaments" },
    { title: "Players", href: "/beta/players", icon: Users, description: "Find other players" },
    { title: "Leaderboard", href: "/beta/leaderboard", icon: Crown, description: "View top players" },
    { title: "Shop", href: "/beta/shop", icon: Scale, description: "Spend your points" },
  ];

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-xl bg-[hsl(var(--beta-accent-subtle))]">
            <HelpCircle className="w-6 h-6 text-[hsl(var(--beta-accent))]" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[hsl(var(--beta-text-primary))]">
              Help Center
            </h1>
            <p className="text-[hsl(var(--beta-text-secondary))]">
              Everything you need to know about TLR
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {quickLinks.map((link, index) => (
            <Link 
              key={link.href} 
              to={link.href}
              className="beta-animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <GlassCard hover className="p-4 text-center h-full group">
                <link.icon className="w-8 h-8 text-[hsl(var(--beta-accent))] mx-auto mb-2 group-hover:scale-110 transition-transform" />
                <h3 className="font-medium text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors">
                  {link.title}
                </h3>
                <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-1">
                  {link.description}
                </p>
              </GlassCard>
            </Link>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))] mb-4 flex items-center gap-2">
            <Book className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <FAQAccordion key={index} item={faq} index={index} />
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <GlassCard variant="strong" className="p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="p-4 rounded-xl bg-[hsl(var(--beta-accent-subtle))]">
              <MessageCircle className="w-8 h-8 text-[hsl(var(--beta-accent))]" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-1">
                Still need help?
              </h3>
              <p className="text-[hsl(var(--beta-text-muted))]">
                Join our Discord server to get support from the community and admins.
              </p>
            </div>
            <a
              href="https://discord.gg/tlr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[hsl(var(--beta-accent))] text-[hsl(var(--beta-surface-1))] font-medium hover:bg-[hsl(var(--beta-accent-hover))] transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Join Discord
            </a>
          </div>
        </GlassCard>
      </div>
    </GradientBackground>
  );
};

export default BetaHelp;
