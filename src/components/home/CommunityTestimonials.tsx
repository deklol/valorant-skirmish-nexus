import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "ATLAS balancing made our scrims feel fair again.",
    author: "Community Captain",
  },
  {
    quote: "The site feels professional and the VODs are clutch.",
    author: "Caster & Analyst",
  },
  {
    quote: "Smooth registrations, solid brackets—love it.",
    author: "Tournament Admin",
  },
];

const CommunityTestimonials = () => {
  return (
    <section aria-labelledby="community-testimonials" className="animate-fade-in">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle id="community-testimonials" className="text-white">What the Community Says</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <figure key={i} className="rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                <Quote className="w-4 h-4 text-slate-400" />
                <blockquote className="mt-2 text-slate-200">“{t.quote}”</blockquote>
                <figcaption className="mt-2 text-slate-400 text-sm">— {t.author}</figcaption>
              </figure>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default CommunityTestimonials;
