import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "*",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const DEFAULT_QUALITY = 60;
const MAX_DIMENSION = 1600;
const ALLOWED_BUCKET = "message-files";
const ALLOWED_PATH_PREFIX = "message_attachments/";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: authError } = await userClient.auth.getUser();
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid or expired token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const userId = userData.user.id;

    const { bucket, path, quality } = await req.json();

    if (!bucket || !path) {
      return new Response(
        JSON.stringify({ error: "bucket and path are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    if (bucket !== ALLOWED_BUCKET) {
      return new Response(
        JSON.stringify({ error: "Access denied: invalid bucket" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    if (!path.startsWith(ALLOWED_PATH_PREFIX) || !path.includes(userId)) {
      return new Response(
        JSON.stringify({ error: "Access denied: you can only compress your own files" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from(bucket)
      .download(path);

    if (downloadError || !fileData) {
      return new Response(
        JSON.stringify({ error: downloadError?.message ?? "Failed to download file" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const contentType = fileData.type || "";
    const isImage = contentType.startsWith("image/");

    if (!isImage) {
      return new Response(
        JSON.stringify({
          compressed: false,
          message: "Not an image file, skipping compression",
          path,
          originalSize: fileData.size,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const originalSize = arrayBuffer.byteLength;

    const image = await Image.decode(new Uint8Array(arrayBuffer));

    let width = image.width;
    let height = image.height;

    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        height = Math.round((height / width) * MAX_DIMENSION);
        width = MAX_DIMENSION;
      } else {
        width = Math.round((width / height) * MAX_DIMENSION);
        height = MAX_DIMENSION;
      }
      image.resize(width, height);
    }

    const compressionQuality = quality ?? DEFAULT_QUALITY;

    let compressedData: Uint8Array;
    let outputContentType: string;

    if (contentType === "image/png") {
      compressedData = await image.encode(1);
      outputContentType = "image/png";
    } else {
      compressedData = await image.encodeJPEG(compressionQuality);
      outputContentType = "image/jpeg";
    }

    const compressedSize = compressedData.byteLength;

    if (compressedSize >= originalSize) {
      return new Response(
        JSON.stringify({
          compressed: false,
          message: "Compressed version is not smaller, keeping original",
          path,
          originalSize,
          compressedSize,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: uploadError } = await serviceClient.storage
      .from(bucket)
      .upload(path, compressedData, {
        contentType: outputContentType,
        upsert: true,
      });

    if (uploadError) {
      return new Response(
        JSON.stringify({ error: uploadError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const { data: signed } = await serviceClient.storage
      .from(bucket)
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    return new Response(
      JSON.stringify({
        compressed: true,
        path,
        originalSize,
        compressedSize,
        savings: `${Math.round((1 - compressedSize / originalSize) * 100)}%`,
        dimensions: { width, height },
        signedUrl: signed?.signedUrl ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
