import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  display_order: number;
}

const SponsorDisplay = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSponsors = async () => {
      try {
        const { data, error } = await supabase
          .from('sponsors')
          .select('id, name, logo_url, website_url, display_order')
          .eq('is_active', true)
          .order('display_order', { ascending: true });

        if (error) {
          console.error('Error fetching sponsors:', error);
          return;
        }

        setSponsors(data || []);
      } catch (error) {
        console.error('Error fetching sponsors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSponsors();
  }, []);

  if (loading || sponsors.length === 0) {
    return null;
  }

  return (
    <section className="border-t border-slate-700/50 bg-gradient-to-r from-slate-900/50 to-slate-800/50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-slate-300 mb-2">Our Sponsors</h3>
          <p className="text-sm text-slate-400">Supporting the competitive gaming community</p>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-8">
          {sponsors.map((sponsor) => (
            <div
              key={sponsor.id}
              className="flex items-center justify-center p-4 rounded-lg bg-slate-800/30 hover:bg-slate-700/30 transition-colors duration-200"
            >
              {sponsor.website_url ? (
                <a
                  href={sponsor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <SponsorLogo sponsor={sponsor} />
                </a>
              ) : (
                <SponsorLogo sponsor={sponsor} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const SponsorLogo = ({ sponsor }: { sponsor: Sponsor }) => {
  if (sponsor.logo_url) {
    return (
      <img
        src={sponsor.logo_url}
        alt={`${sponsor.name} logo`}
        className="h-12 w-auto max-w-32 object-contain filter grayscale hover:grayscale-0 transition-all duration-200"
      />
    );
  }

  return (
    <div className="h-12 px-6 flex items-center justify-center bg-slate-700 rounded text-slate-300 text-sm font-medium">
      {sponsor.name}
    </div>
  );
};

export default SponsorDisplay;