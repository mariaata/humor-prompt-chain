"use server";

import { requireSuperadmin, createSupabaseServerClient } from "@/lib/supabase/server";

// Humor Flavors Management
export async function getHumorFlavors() {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("humor_flavors")
    .select("id, created_datetime_utc, description, slug")
    .order("created_datetime_utc", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createHumorFlavor(
  description: string,
  slug: string
) {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("humor_flavors")
    .insert([
      {
        description,
        slug,
        created_datetime_utc: new Date().toISOString(),
      },
    ])
    .select();

  if (error) throw error;
  return data?.[0] || null;
}

export async function deleteHumorFlavor(id: number) {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  // Delete flavor steps first (cascade)
  const { error: stepsError } = await supabase
    .from("humor_flavor_steps")
    .delete()
    .eq("humor_flavor_id", id);

  if (stepsError) throw stepsError;

  // Then delete flavor
  const { error: flavorError } = await supabase
    .from("humor_flavors")
    .delete()
    .eq("id", id);

  if (flavorError) throw flavorError;
  return true;
}

// Humor Flavor Steps Management
export async function getHumorFlavorSteps(flavorId: number) {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .select("*")
    .eq("humor_flavor_id", flavorId)
    .order("order_by", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createHumorFlavorStep(
  humorFlavorId: number,
  orderBy: number,
  llmTemperature: number | null,
  llmInputTypeId: number,
  llmOutputTypeId: number,
  llmModelId: number,
  humorFlavorStepTypeId: number,
  llmSystemPrompt: string,
  llmUserPrompt: string,
  description: string | null
) {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("humor_flavor_steps")
    .insert([
      {
        humor_flavor_id: humorFlavorId,
        order_by: orderBy,
        llm_temperature: llmTemperature,
        llm_input_type_id: llmInputTypeId,
        llm_output_type_id: llmOutputTypeId,
        llm_model_id: llmModelId,
        humor_flavor_step_type_id: humorFlavorStepTypeId,
        llm_system_prompt: llmSystemPrompt,
        llm_user_prompt: llmUserPrompt,
        description,
        created_datetime_utc: new Date().toISOString(),
      },
    ])
    .select();

  if (error) throw error;
  return data?.[0] || null;
}

export async function deleteHumorFlavorStep(id: number) {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("humor_flavor_steps")
    .delete()
    .eq("id", id);

  if (error) throw error;
  return true;
}

export async function reorderHumorFlavorStep(
  stepId: number,
  newOrderBy: number
) {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { data: step } = await supabase
    .from("humor_flavor_steps")
    .select("*")
    .eq("id", stepId)
    .single();

  if (!step) throw new Error("Step not found");

  const oldOrderBy = step.order_by;
  const flavorId = step.humor_flavor_id;

  const { data: allSteps } = await supabase
    .from("humor_flavor_steps")
    .select("*")
    .eq("humor_flavor_id", flavorId)
    .order("order_by", { ascending: true });

  const updates = [];

  if (oldOrderBy < newOrderBy) {
    for (const s of allSteps!) {
      if (s.id !== stepId && s.order_by > oldOrderBy && s.order_by <= newOrderBy) {
        updates.push({ id: s.id, order_by: s.order_by - 1 });
      }
    }
  } else if (oldOrderBy > newOrderBy) {
    for (const s of allSteps!) {
      if (s.id !== stepId && s.order_by >= newOrderBy && s.order_by < oldOrderBy) {
        updates.push({ id: s.id, order_by: s.order_by + 1 });
      }
    }
  }

  await supabase.from("humor_flavor_steps").update({ order_by: newOrderBy }).eq("id", stepId);

  for (const update of updates) {
    await supabase.from("humor_flavor_steps").update({ order_by: update.order_by }).eq("id", update.id);
  }

  return true;
}

export async function testHumorFlavorOnImage(
    humorFlavorId: number,
    imageId: string
  ) {
    await requireSuperadmin();
    const supabase = await createSupabaseServerClient();
  
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return { success: false, error: "No auth token" };
    }
  
    try {
      const response = await fetch("https://api.almostcrackd.ai/pipeline/generate-captions-with-flavor", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageId, humorFlavorId }),
      });
  
      if (!response.ok) {
        return { success: false, error: `API failed: ${response.status}` };
      }
  
      const result = await response.json();
      return { success: true, data: result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to test flavor" 
      };
    }
  }

  export async function getImages() {
    await requireSuperadmin();
    const supabase = await createSupabaseServerClient();
  
    const { data, error } = await supabase
      .from("images")
      .select("id, url, is_public, created_datetime_utc")
      .order("created_datetime_utc", { ascending: false });
  
    if (error) throw error;
    return data || [];
}
export async function updateHumorFlavor(
    id: number,
    description: string,
    slug: string
  ) {
    await requireSuperadmin();
    const supabase = await createSupabaseServerClient();
  
    const { data, error } = await supabase
      .from("humor_flavors")
      .update({ description, slug })
      .eq("id", id)
      .select();
  
    if (error) throw error;
    return data?.[0] || null;
  }
  
  export async function updateHumorFlavorStep(
    id: number,
    orderBy: number,
    llmTemperature: number | null,
    llmInputTypeId: number,
    llmOutputTypeId: number,
    llmModelId: number,
    humorFlavorStepTypeId: number,
    llmSystemPrompt: string,
    llmUserPrompt: string,
    description: string | null
  ) {
    await requireSuperadmin();
    const supabase = await createSupabaseServerClient();
  
    const { data, error } = await supabase
      .from("humor_flavor_steps")
      .update({
        order_by: orderBy,
        llm_temperature: llmTemperature,
        llm_input_type_id: llmInputTypeId,
        llm_output_type_id: llmOutputTypeId,
        llm_model_id: llmModelId,
        humor_flavor_step_type_id: humorFlavorStepTypeId,
        llm_system_prompt: llmSystemPrompt,
        llm_user_prompt: llmUserPrompt,
        description,
      })
      .eq("id", id)
      .select();
  
    if (error) throw error;
    return data?.[0] || null;
  }
  
export async function getCaptionsForFlavor(flavorId: number) {
  await requireSuperadmin();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("captions")
    .select("id, content, created_datetime_utc, image_id")
    .eq("humor_flavor_id", flavorId)
    .order("created_datetime_utc", { ascending: false });

  if (error) throw error;
  return data || [];
}
