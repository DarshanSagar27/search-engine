import { useEffect, useState } from "react";
import { FileText, Trash2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Document {
  id: string;
  title: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

const DocumentList = ({ refreshTrigger }: { refreshTrigger: number }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Failed to load documents",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [refreshTrigger]);

  const handleDelete = async (id: string, title: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Document deleted",
        description: `${title} has been removed`,
      });

      loadDocuments();
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Failed to delete document",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <Card className="p-8">
        <p className="text-center text-muted-foreground">Loading documents...</p>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-2">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No documents uploaded yet</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-8">
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Your Documents</h3>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 transition-all duration-200 group"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium truncate">{doc.title}</h4>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                    <span>{formatFileSize(doc.file_size)}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(doc.created_at)}
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(doc.id, doc.title)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default DocumentList;