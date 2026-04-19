// supabase/functions/search/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { query } = await req.json()
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // 1. Fetch Context from DB
    // Simple text search for now
    const { data: teachers } = await supabaseClient
      .from('teachers')
      .select('name, designation')
      .ilike('name', `%${query}%`)
      .limit(3)

    const { data: programs } = await supabaseClient
      .from('programs')
      .select('title, overview')
      .ilike('title', `%${query}%`)
      .limit(2)

    const context = `
      Relevant Teachers: ${teachers?.map(t => `${t.name} (${t.designation})`).join(', ') || 'None found'}
      Relevant Programs: ${programs?.map(p => `${p.title}: ${p.overview}`).join('; ') || 'None found'}
    `

    // 2. Call Ollama
    const ollamaUrl = Deno.env.get('OLLAMA_URL') || 'http://localhost:11434/api/generate'
    const ollamaRes = await fetch(ollamaUrl, {
      method: 'POST',
      body: JSON.stringify({
        model: 'llama3', // or your preferred model
        prompt: `You are an AI assistant for the MIS Department of Dhaka University. 
        Context: ${context}
        User Query: ${query}
        Answer concisely based on the context. If not in context, say you don't know yet.`,
        stream: false
      })
    })

    const ollamaData = await ollamaRes.json()

    return new Response(JSON.stringify({ 
      answer: ollamaData.response,
      results: [...(teachers || []), ...(programs || [])] 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
