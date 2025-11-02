import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ProbeCategory, ProbeType } from '@/types/probe';

interface ProbeTypeSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCategory: string;
  selectedType: string;
  probeCategories: string[];
  filteredProbeTypes: string[];
  typesLoading: boolean;
  typesError: any;
  onCategoryChange: (category: string) => void;
  onTypeChange: (type: string) => void;
  onNext: () => void;
}

export function ProbeTypeSelectionDialog({
  open,
  onOpenChange,
  selectedCategory,
  selectedType,
  probeCategories,
  filteredProbeTypes,
  typesLoading,
  typesError,
  onCategoryChange,
  onTypeChange,
  onNext,
}: ProbeTypeSelectionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Select Probe Type</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="probe-category" className="text-right">
              Category
            </label>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {typesLoading ? (
                  <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                ) : typesError ? (
                  <SelectItem value="error" disabled>Error loading categories</SelectItem>
                ) : probeCategories.length === 0 ? (
                  <SelectItem value="none" disabled>No categories available</SelectItem>
                ) : probeCategories.map((category: string) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="probe-type" className="text-right">
              Type
            </label>
            <Select
              value={selectedType}
              onValueChange={onTypeChange}
              disabled={!selectedCategory}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {typesLoading ? (
                  <SelectItem value="loading" disabled>Loading types...</SelectItem>
                ) : typesError ? (
                  <SelectItem value="error" disabled>Error loading types</SelectItem>
                ) : !selectedCategory ? (
                  <SelectItem value="select-category" disabled>Select a category first</SelectItem>
                ) : filteredProbeTypes.length === 0 ? (
                  <SelectItem value="none" disabled>No types available</SelectItem>
                ) : filteredProbeTypes.map((type: string) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={onNext}
            disabled={!selectedCategory || !selectedType}
          >
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
