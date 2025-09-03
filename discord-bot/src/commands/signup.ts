import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getSupabase } from '../utils/supabase';
import { handleUserRegistration } from '../utils/userRegistration';

export default {
  data: new SlashCommandBuilder()
    .setName('signup')
    .setDescription('Sign up for a tournament')
    .addStringOption(option =>
      option.setName('tournament')
        .setDescription('Tournament name or ID')
        .setRequired(true)
        .setAutocomplete(true)),

  async execute(interaction: any) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Check if user is registered
      const { data: user } = await getSupabase()
        .from('users')
        .select('*')
        .eq('discord_id', interaction.user.id)
        .maybeSingle();
      
      if (!user) {
        await interaction.deleteReply();
        await handleUserRegistration(interaction);
        return;
      }
      
      const tournamentInput = interaction.options.getString('tournament');
      
      // Try to find tournament by ID or name
      let tournament = null;
      
      // First try by ID
      if (tournamentInput.length === 36) { // UUID length
        const { data } = await getSupabase()
          .from('tournaments')
          .select('*')
          .eq('id', tournamentInput)
          .maybeSingle();
        tournament = data;
      }
      
      // If not found, try by name
      if (!tournament) {
        const { data: tournaments } = await getSupabase()
          .from('tournaments')
          .select('*')
          .in('status', ['open', 'live', 'balancing'])
          .order('start_time', { ascending: true });
        if (tournaments) {
          tournament = tournaments.find((t: any) => 
            t.name.toLowerCase().includes(tournamentInput.toLowerCase())
          );
        }
      }
      
      if (!tournament) {
        await interaction.editReply('❌ Tournament not found. Use `/tournaments` to see available tournaments.');
        return;
      }
      
      // Check if registration is open
      if (tournament.status !== 'open_registration') {
        await interaction.editReply('❌ Registration is not currently open for this tournament.');
        return;
      }
      
      // Check if already signed up
      const { data: existingSignup } = await getSupabase()
        .from('tournament_signups')
        .select('id')
        .eq('user_id', user.id)
        .eq('tournament_id', tournament.id)
        .maybeSingle();
        
      if (existingSignup) {
        await interaction.editReply('❌ You are already signed up for this tournament.');
        return;
      }
      
      // Check if tournament is full
      const { data: signups } = await getSupabase()
        .from('tournament_signups')
        .select(`
          *,
          users!inner(discord_username, current_rank, riot_id)
        `)
        .eq('tournament_id', tournament.id);
      if (signups && signups.length >= tournament.max_players) {
        await interaction.editReply('❌ This tournament is full.');
        return;
      }
      
      // Sign up user
      const { error } = await getSupabase()
        .from('tournament_signups')
        .insert({
          user_id: user.id,
          tournament_id: tournament.id,
          signed_up_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        await interaction.editReply('❌ Failed to sign up for tournament. Please try again.');
        return;
      }
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Tournament Signup Successful!')
        .setDescription(`You have been signed up for **${tournament.name}**`)
        .setColor(0x00FF00)
        .addFields([
          {
            name: '📅 Tournament Start',
            value: tournament.start_time ? `<t:${Math.floor(new Date(tournament.start_time).getTime() / 1000)}:F>` : 'TBD',
            inline: true
          },
          {
            name: '✅ Check-in Required',
            value: tournament.check_in_required ? 'Yes' : 'No',
            inline: true
          }
        ]);
        
      if (tournament.check_in_required && tournament.check_in_starts_at) {
        embed.addFields([
          {
            name: '⏰ Check-in Opens',
            value: `<t:${Math.floor(new Date(tournament.check_in_starts_at).getTime() / 1000)}:F>`,
            inline: false
          }
        ]);
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Signup command error:', error);
      await interaction.editReply('❌ An error occurred while signing up for the tournament.');
    }
  },

  async autocomplete(interaction: any) {
    const focusedValue = interaction.options.getFocused();
    
    try {
      const { data: tournaments } = await getSupabase()
        .from('tournaments')
        .select('*')
        .in('status', ['open', 'live', 'balancing'])
        .order('start_time', { ascending: true });
      
      if (!tournaments) {
        await interaction.respond([]);
        return;
      }
      
      const filtered = tournaments
        .filter((tournament: any) => 
          tournament.status === 'open_registration' &&
          tournament.name.toLowerCase().includes(focusedValue.toLowerCase())
        )
        .slice(0, 25)
        .map((tournament: any) => ({
          name: `${tournament.name} (${tournament.status})`,
          value: tournament.id
        }));
      
      await interaction.respond(filtered);
      
    } catch (error) {
      console.error('Autocomplete error:', error);
      await interaction.respond([]);
    }
  },
};