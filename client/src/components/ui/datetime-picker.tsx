import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  value?: string; // ISO datetime string or datetime-local format
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  id?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  label,
  id,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  );
  const [timeValue, setTimeValue] = React.useState<string>(() => {
    if (value) {
      const date = new Date(value);
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }
    return "";
  });

  // Update internal state when value prop changes
  React.useEffect(() => {
    if (value) {
      try {
        // Handle datetime-local format (YYYY-MM-DDTHH:mm) or ISO format
        let date: Date;
        if (value.includes('T') && value.length === 16) {
          // datetime-local format: YYYY-MM-DDTHH:mm
          date = new Date(value);
        } else {
          // ISO format or other
          date = new Date(value);
        }
        
        if (!isNaN(date.getTime())) {
          setSelectedDate(date);
          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          setTimeValue(`${hours}:${minutes}`);
        } else {
          setSelectedDate(undefined);
          setTimeValue("");
        }
      } catch {
        setSelectedDate(undefined);
        setTimeValue("");
      }
    } else {
      setSelectedDate(undefined);
      setTimeValue("");
    }
  }, [value]);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      // Combine date and time
      const timeToUse = timeValue || "00:00";
      const [hours, minutes] = timeToUse.split(":");
      const combinedDate = new Date(date);
      combinedDate.setHours(parseInt(hours, 10));
      combinedDate.setMinutes(parseInt(minutes, 10));
      // Convert to datetime-local format (YYYY-MM-DDTHH:mm)
      const year = combinedDate.getFullYear();
      const month = String(combinedDate.getMonth() + 1).padStart(2, "0");
      const day = String(combinedDate.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}T${timeToUse}`);
    }
  };

  const handleTimeChange = (time: string) => {
    setTimeValue(time);
    if (selectedDate) {
      const timeToUse = time || "00:00";
      const [hours, minutes] = timeToUse.split(":");
      const combinedDate = new Date(selectedDate);
      combinedDate.setHours(parseInt(hours, 10));
      combinedDate.setMinutes(parseInt(minutes, 10));
      // Convert to datetime-local format
      const year = combinedDate.getFullYear();
      const month = String(combinedDate.getMonth() + 1).padStart(2, "0");
      const day = String(combinedDate.getDate()).padStart(2, "0");
      onChange(`${year}-${month}-${day}T${timeToUse}`);
    }
  };

  const displayValue = React.useMemo(() => {
    if (value) {
      try {
        const date = new Date(value);
        return format(date, "MMM dd, yyyy HH:mm");
      } catch {
        return value;
      }
    }
    return placeholder;
  }, [value, placeholder]);

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
            />
            <div className="space-y-2">
              <Label htmlFor={`${id}-time`}>Time</Label>
              <Input
                id={`${id}-time`}
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
