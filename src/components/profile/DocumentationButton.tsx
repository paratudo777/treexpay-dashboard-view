
import { Button } from "@/components/ui/button";
import { Book } from "lucide-react";

export function DocumentationButton() {
  const openDocumentation = () => {
    window.open('https://docs.treexpay.com', '_blank');
  };

  return (
    <Button 
      onClick={openDocumentation}
      className="flex items-center gap-2 bg-treexpay-dark hover:bg-treexpay-medium"
    >
      <Book className="h-4 w-4" />
      <span>Documentação da API</span>
    </Button>
  );
}
