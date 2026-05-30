import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export async function saveToTutorHistory({
  domain,
  questionText,
  answerText,
  metadata = {}
}: {
  domain: "tpa" | "tbi";
  questionText: string;
  answerText: string;
  metadata?: any;
}) {
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from("tutor_history")
      .insert([
        {
          domain,
          question_text: questionText,
          answer_text: answerText,
          metadata
        }
      ]);
    if (error) console.error("Supabase insert error:", error);
  } catch (err) {
    console.error("Failed to save to Supabase:", err);
  }
}

export async function fetchTutorHistory(domain: "tpa" | "tbi", limit = 20) {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from("tutor_history")
      .select("*")
      .eq("domain", domain)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Supabase fetch error:", error);
      return [];
    }

    return data;
  } catch (err) {
    console.error("Failed to fetch from Supabase:", err);
    return [];
  }
}
