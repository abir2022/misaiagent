// supabase/functions/scrape-mis/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Scrape Faculty Members
    const facultyUrl = 'https://www.du.ac.bd/body/FacultyMembers/MIS'
    const res = await fetch(facultyUrl)
    const html = await res.text()
    const $ = cheerio.load(html)
    
    const teachers: any[] = []
    $('.faculty-card').each((_, el) => {
      const name = $(el).find('.faculty-name').text().trim()
      const designation = $(el).find('.faculty-designation').text().trim()
      const imageUrl = $(el).find('img').attr('src')
      const profileUrl = $(el).find('a').attr('href')
      
      if (name) {
        teachers.push({ name, designation, image_url: imageUrl, profile_url: profileUrl })
      }
    })

    // Get MIS Department ID
    const { data: dept } = await supabaseClient
      .from('departments')
      .select('id')
      .eq('name', 'Management Information Systems')
      .single()

    if (dept) {
      // Upsert teachers
      for (const t of teachers) {
        await supabaseClient.from('teachers').upsert({
          ...t,
          department_id: dept.id
        }, { onConflict: 'name' })
      }
    }

    return new Response(JSON.stringify({ message: 'Scraping successful', teachersCount: teachers.length }), {
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
