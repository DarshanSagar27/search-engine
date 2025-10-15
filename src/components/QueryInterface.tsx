import { useState } from "react";
import { Search, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface QueryResult {
  answer: string;
  sources: Array<{
    documentId: string;
    text: string;
    similarity: number;
  }>;
}

const QueryInterface = () => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) {
      toast({
        title: "Empty query",
        description: "Please enter a question",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('rag-query', {
        body: { query: query.trim() },
      });

      if (error) {
        // Handle rate limiting and credit errors
        if (error.message.includes('Rate limit') || error.message.includes('429')) {
          toast({
            title: "Rate limit exceeded",
            description: "Please wait a moment before trying again",
            variant: "destructive",
          });
          return;
        }
        
        if (error.message.includes('credits') || error.message.includes('402')) {
          toast({
            title: "AI credits exhausted",
            description: "Please add credits to your workspace",
            variant: "destructive",
          });
          return;
        }
        
        throw error;
      }

      setResult(data);
    } catch (error) {
      console.error('Query error:', error);
      toast({
        title: "Search failed",
        description: error instanceof Error ? error.message : "Failed to search documents",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
              <Search className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-semibold">Ask a Question</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="What would you like to know from your documents?"
              className="min-h-[120px] resize-none text-lg"
              disabled={isSearching}
            />
            
            <Button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="w-full gap-2"
              size="lg"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Get AI Answer
                </>
              )}
            </Button>
          </form>
        </div>
      </Card>

      {result && (
        <Card className="p-8 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-semibold">AI Answer</h3>
            </div>
            
            <div className="prose prose-sm max-w-none">
              <p className="text-lg leading-relaxed">{result.answer}</p>
            </div>

            {result.sources && result.sources.length > 0 && (
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm font-medium mb-3 text-muted-foreground">
                  Based on {result.sources.length} relevant passage{result.sources.length > 1 ? 's' : ''} 
                  (similarity: {Math.round(result.sources[0].similarity * 100)}%)
                </p>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

export default QueryInterface;