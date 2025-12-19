import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  getTemplateById, 
  getTemplateByCategoryAndType,
  type ProbeTemplate 
} from '@/data/probeTemplates';
import type { ProbeCategory, ProbeType } from '@/types/probe';

interface ProbeTemplateHelpProps {
  templateId?: string | null;
  category?: ProbeCategory;
  type?: ProbeType;
  trigger?: React.ReactNode;
}

export function ProbeTemplateHelp({
  templateId,
  category,
  type,
  trigger
}: ProbeTemplateHelpProps) {
  const [open, setOpen] = useState(false);

  // Lookup template
  let template: ProbeTemplate | undefined;
  if (templateId) {
    template = getTemplateById(templateId);
  } else if (category && type) {
    template = getTemplateByCategoryAndType(category, type);
  }

  // If no template found, don't show help
  if (!template) {
    return null;
  }

  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="h-6 w-6">
      <HelpCircle className="h-4 w-4 text-muted-foreground" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <div onClick={() => setOpen(true)} className="cursor-pointer inline-flex items-center">
          {trigger}
        </div>
      ) : (
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6"
          onClick={() => setOpen(true)}
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </Button>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            {template.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{template.category}</Badge>
            <Badge variant="outline">{template.type}</Badge>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">What it does</h3>
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">Why it's needed</h3>
            <p className="text-sm text-muted-foreground">{template.whyNeeded}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2">How it works</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">{template.howItWorks}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
