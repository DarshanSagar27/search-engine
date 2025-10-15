import { useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const DocumentUpload = ({ onUploadComplete }: { onUploadComplete: () => void }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.includes('text') && file.type !== 'application/pdf') {
      toast({
        title: "Unsupported file type",
        description: "Please upload text or PDF files only",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Read file content
      const content = await file.text();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Insert document into database
      const { data: document, error: insertError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          title: file.name,
          content: content,
          file_type: file.type,
          file_size: file.size,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Process document and generate embeddings
      const { data, error: processError } = await supabase.functions.invoke('process-document', {
        body: {
          documentId: document.id,
          content: content,
          title: file.name,
        },
      });

      if (processError) throw processError;

      toast({
        title: "Document uploaded successfully",
        description: `${file.name} has been processed and indexed`,
      });

      onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload document",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <Card className="p-8">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Upload className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-semibold">Upload Documents</h2>
        </div>
        
        <form
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className="relative"
        >
          <input
            type="file"
            id="file-upload"
            className="hidden"
            onChange={handleChange}
            accept=".txt,.pdf,text/*"
            disabled={isUploading}
          />
          
          <label
            htmlFor="file-upload"
            className={`
              flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer 
              transition-all duration-300
              ${dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-accent/5'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            {isUploading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-lg font-medium">Processing document...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <FileText className="w-10 h-10 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium mb-1">
                    Drop your document here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports text and PDF files
                  </p>
                </div>
              </div>
            )}
          </label>
        </form>
      </div>
    </Card>
  );
};

export default DocumentUpload;